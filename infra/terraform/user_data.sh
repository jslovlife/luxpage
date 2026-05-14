#!/bin/bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update -y

# Install docker + compose + awscli
apt-get install -y docker.io docker-compose-v2 awscli snapd curl ca-certificates
systemctl enable --now docker

# Install SSM agent (snap) for SSM deployment (no SSH required)
if ! snap list amazon-ssm-agent >/dev/null 2>&1; then
  snap install amazon-ssm-agent --classic
fi
systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service || true

usermod -aG docker ubuntu || true

# PoC data dirs
mkdir -p /opt/member-management-ui/data/demo-uploads
touch /opt/member-management-ui/data/.demo-store.json
chmod 666 /opt/member-management-ui/data/.demo-store.json

# Optional swap (t3.micro 1GB)
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || true
  chmod 600 /swapfile || true
  mkswap /swapfile || true
  swapon /swapfile || true
  echo '/swapfile none swap sw 0 0' >> /etc/fstab || true
fi

