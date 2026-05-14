provider "aws" {
  region = var.region
}

data "aws_security_group" "existing" {
  id = var.security_group_id
}

data "aws_subnets" "in_vpc" {
  filter {
    name   = "vpc-id"
    values = [data.aws_security_group.existing.vpc_id]
  }
}

# Latest Ubuntu 24.04 LTS (x86_64)
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "aws_iam_role" "ec2_role" {
  name = "${var.name_tag}-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "ec2.amazonaws.com" },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.name_tag}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

resource "aws_instance" "poc" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.in_vpc.ids[0]
  vpc_security_group_ids      = [var.security_group_id]
  associate_public_ip_address = true

  key_name             = var.key_name
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name      = var.name_tag
    ManagedBy = "terraform"
    Project   = "luxpage"
  }
}

# --- Idle terminate: EventBridge -> Lambda ---
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda_idle_terminate.py"
  output_path = "${path.module}/lambda_idle_terminate.zip"
}

resource "aws_iam_role" "lambda_role" {
  name = "${var.name_tag}-idle-terminate-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "lambda.amazonaws.com" },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  role = aws_iam_role.lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = ["ec2:DescribeInstances", "ec2:TerminateInstances"],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = ["cloudwatch:GetMetricStatistics"],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "idle_terminate" {
  function_name = "${var.name_tag}-idle-terminate"
  role          = aws_iam_role.lambda_role.arn
  runtime       = "python3.12"
  handler       = "lambda_idle_terminate.handler"

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      NAME_TAG     = var.name_tag
      IDLE_MINUTES = tostring(var.idle_minutes)
      CPU_TH       = tostring(var.idle_cpu_threshold)
      NET_TH       = tostring(var.idle_network_bytes_threshold)
    }
  }
}

resource "aws_cloudwatch_event_rule" "schedule" {
  name                = "${var.name_tag}-idle-check"
  schedule_expression = "rate(15 minutes)"
}

resource "aws_cloudwatch_event_target" "target" {
  rule      = aws_cloudwatch_event_rule.schedule.name
  target_id = "idle-terminate"
  arn       = aws_lambda_function.idle_terminate.arn
}

resource "aws_lambda_permission" "allow_events" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.idle_terminate.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule.arn
}
