#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REGION="${AWS_REGION:-us-west-2}"
INSTANCE_NAME="${INSTANCE_NAME:-node-red-project-web}"
KEY_NAME="${KEY_NAME:-node-red-project-ec2}"
SECURITY_GROUP_NAME="${SECURITY_GROUP_NAME:-node-red-project-web-sg}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t4g.small}"
AMI_ID="${AMI_ID:-}"

mkdir -p "$ROOT_DIR/.tmp"

VPC_ID="$(aws ec2 describe-vpcs --region "$REGION" --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)"
SUBNET_ID="$(aws ec2 describe-subnets --region "$REGION" --filters Name=default-for-az,Values=true Name=vpc-id,Values="$VPC_ID" --query 'Subnets[0].SubnetId' --output text)"

if [[ -z "$AMI_ID" ]]; then
  AMI_ID="$(aws ec2 describe-images \
    --region "$REGION" \
    --owners amazon \
    --filters Name=name,Values='al2023-ami-2023*-kernel-6.1-arm64' Name=state,Values=available \
    --query 'Images | sort_by(@,&CreationDate)[-1].ImageId' \
    --output text)"
fi

set +e
aws ec2 describe-key-pairs --region "$REGION" --key-names "$KEY_NAME" >/dev/null 2>&1
KEY_EXISTS=$?
set -e

KEY_PATH="$ROOT_DIR/.tmp/$KEY_NAME.pem"
if [[ $KEY_EXISTS -ne 0 ]]; then
  aws ec2 create-key-pair \
    --region "$REGION" \
    --key-name "$KEY_NAME" \
    --query 'KeyMaterial' \
    --output text >"$KEY_PATH"
  chmod 600 "$KEY_PATH"
elif [[ ! -f "$KEY_PATH" ]]; then
  echo "AWS key pair $KEY_NAME already exists, but local private key $KEY_PATH is missing."
  echo "Choose a new KEY_NAME or place the PEM file at that path."
  exit 1
fi

SG_ID="$(aws ec2 describe-security-groups --region "$REGION" --filters Name=group-name,Values="$SECURITY_GROUP_NAME" Name=vpc-id,Values="$VPC_ID" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)"
if [[ -z "$SG_ID" || "$SG_ID" == "None" ]]; then
  SG_ID="$(aws ec2 create-security-group \
    --region "$REGION" \
    --group-name "$SECURITY_GROUP_NAME" \
    --description "Security group for node-red-project frontend" \
    --vpc-id "$VPC_ID" \
    --query 'GroupId' \
    --output text)"

  aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 >/dev/null
  aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 >/dev/null
fi

INSTANCE_ID="$(aws ec2 run-instances \
  --region "$REGION" \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --subnet-id "$SUBNET_ID" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
  --query 'Instances[0].InstanceId' \
  --output text)"

aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"

PUBLIC_IP="$(aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)"

cat >"$ROOT_DIR/.tmp/aws-frontend-host.env" <<EOF
AWS_REGION=$REGION
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
KEY_NAME=$KEY_NAME
KEY_PATH=$KEY_PATH
SECURITY_GROUP_ID=$SG_ID
EOF

echo "Wrote deployment outputs to $ROOT_DIR/.tmp/aws-frontend-host.env"
