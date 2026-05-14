import os
import boto3
from datetime import datetime, timedelta, timezone

ec2 = boto3.client("ec2")
cw = boto3.client("cloudwatch")

NAME_TAG = os.environ["NAME_TAG"]
IDLE_MINUTES = int(os.environ.get("IDLE_MINUTES", "60"))
CPU_TH = float(os.environ.get("CPU_TH", "2"))
NET_TH = int(os.environ.get("NET_TH", "1000000"))


def metric_sum(instance_id: str, metric_name: str) -> float:
    end = datetime.now(timezone.utc)
    start = end - timedelta(minutes=IDLE_MINUTES)
    resp = cw.get_metric_statistics(
        Namespace="AWS/EC2",
        MetricName=metric_name,
        Dimensions=[{"Name": "InstanceId", "Value": instance_id}],
        StartTime=start,
        EndTime=end,
        Period=300,
        Statistics=["Sum"],
    )
    return sum(dp["Sum"] for dp in resp.get("Datapoints", []))


def metric_avg(instance_id: str, metric_name: str) -> float:
    end = datetime.now(timezone.utc)
    start = end - timedelta(minutes=IDLE_MINUTES)
    resp = cw.get_metric_statistics(
        Namespace="AWS/EC2",
        MetricName=metric_name,
        Dimensions=[{"Name": "InstanceId", "Value": instance_id}],
        StartTime=start,
        EndTime=end,
        Period=300,
        Statistics=["Average"],
    )
    dps = resp.get("Datapoints", [])
    if not dps:
        return 0.0
    return sum(dp["Average"] for dp in dps) / len(dps)


def handler(event, context):
    resp = ec2.describe_instances(
        Filters=[
            {"Name": "tag:Name", "Values": [NAME_TAG]},
            {"Name": "tag:ManagedBy", "Values": ["terraform"]},
            {"Name": "instance-state-name", "Values": ["running"]},
        ]
    )

    targets = []
    for r in resp["Reservations"]:
        for inst in r["Instances"]:
            targets.append(inst["InstanceId"])

    if not targets:
        print({"ok": True, "message": "no running instances"})
        return {"ok": True, "message": "no running instances"}

    terminated = []
    for instance_id in targets:
        cpu = metric_avg(instance_id, "CPUUtilization")
        net = metric_sum(instance_id, "NetworkIn") + metric_sum(instance_id, "NetworkOut")
        idle = (cpu < CPU_TH) and (net < NET_TH)
        print({"instance_id": instance_id, "cpu_avg": cpu, "net_sum": net, "idle": idle})
        if idle:
            ec2.terminate_instances(InstanceIds=[instance_id])
            terminated.append({"instance_id": instance_id, "cpu": cpu, "net": net})

    result = {"ok": True, "terminated": terminated}
    print(result)
    return result
