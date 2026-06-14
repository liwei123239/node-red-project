#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REGION="${AWS_REGION:-us-west-2}"
DB_INSTANCE_ID="${DB_INSTANCE_ID:-node-red-project-db}"
DB_NAME="${DB_NAME:-nodered}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24 | tr -d '\n' | tr '/' '_')}"
DB_INSTANCE_CLASS="${DB_INSTANCE_CLASS:-db.t4g.micro}"
DB_ENGINE_VERSION="${DB_ENGINE_VERSION:-}"
DB_SUBNET_GROUP="${DB_SUBNET_GROUP:-node-red-project-db-subnet-group}"
LAMBDA_SG_NAME="${LAMBDA_SG_NAME:-node-red-project-lambda-sg}"
DB_SG_NAME="${DB_SG_NAME:-node-red-project-db-sg}"

mkdir -p "$ROOT_DIR/.tmp"

VPC_ID="$(aws ec2 describe-vpcs --region "$REGION" --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)"
SUBNET_IDS_RAW="$(aws ec2 describe-subnets --region "$REGION" --filters Name=vpc-id,Values="$VPC_ID" --query 'Subnets[].SubnetId' --output text)"
read -r -a SUBNET_IDS <<<"$SUBNET_IDS_RAW"

if [[ "${#SUBNET_IDS[@]}" -lt 2 ]]; then
  echo "At least two subnets are required to create an RDS subnet group."
  exit 1
fi

LAMBDA_SG_ID="$(aws ec2 describe-security-groups --region "$REGION" --filters Name=group-name,Values="$LAMBDA_SG_NAME" Name=vpc-id,Values="$VPC_ID" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)"
if [[ -z "$LAMBDA_SG_ID" || "$LAMBDA_SG_ID" == "None" ]]; then
  LAMBDA_SG_ID="$(aws ec2 create-security-group \
    --region "$REGION" \
    --group-name "$LAMBDA_SG_NAME" \
    --description "Security group for node-red-project Lambda" \
    --vpc-id "$VPC_ID" \
    --query 'GroupId' \
    --output text)"
fi

DB_SG_ID="$(aws ec2 describe-security-groups --region "$REGION" --filters Name=group-name,Values="$DB_SG_NAME" Name=vpc-id,Values="$VPC_ID" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)"
if [[ -z "$DB_SG_ID" || "$DB_SG_ID" == "None" ]]; then
  DB_SG_ID="$(aws ec2 create-security-group \
    --region "$REGION" \
    --group-name "$DB_SG_NAME" \
    --description "Security group for node-red-project PostgreSQL" \
    --vpc-id "$VPC_ID" \
    --query 'GroupId' \
    --output text)"
fi

aws ec2 authorize-security-group-ingress \
  --region "$REGION" \
  --group-id "$DB_SG_ID" \
  --protocol tcp \
  --port 5432 \
  --source-group "$LAMBDA_SG_ID" \
  >/dev/null 2>&1 || true

set +e
aws rds describe-db-subnet-groups --region "$REGION" --db-subnet-group-name "$DB_SUBNET_GROUP" >/dev/null 2>&1
SUBNET_GROUP_EXISTS=$?
set -e

if [[ $SUBNET_GROUP_EXISTS -ne 0 ]]; then
  aws rds create-db-subnet-group \
    --region "$REGION" \
    --db-subnet-group-name "$DB_SUBNET_GROUP" \
    --db-subnet-group-description "Subnet group for node-red-project PostgreSQL" \
    --subnet-ids "${SUBNET_IDS[@]}" \
    >/dev/null
fi

set +e
aws rds describe-db-instances --region "$REGION" --db-instance-identifier "$DB_INSTANCE_ID" >/dev/null 2>&1
DB_EXISTS=$?
set -e

if [[ $DB_EXISTS -ne 0 ]]; then
  CREATE_DB_ARGS=(
    --region "$REGION"
    --db-instance-identifier "$DB_INSTANCE_ID"
    --db-instance-class "$DB_INSTANCE_CLASS"
    --engine postgres
    --allocated-storage 20
    --storage-type gp3
    --master-username "$DB_USERNAME"
    --master-user-password "$DB_PASSWORD"
    --db-name "$DB_NAME"
    --vpc-security-group-ids "$DB_SG_ID"
    --db-subnet-group-name "$DB_SUBNET_GROUP"
    --no-publicly-accessible
    --backup-retention-period 0
    --no-multi-az
    --no-deletion-protection
  )

  if [[ -n "$DB_ENGINE_VERSION" ]]; then
    CREATE_DB_ARGS+=(--engine-version "$DB_ENGINE_VERSION")
  fi

  aws rds create-db-instance \
    "${CREATE_DB_ARGS[@]}" \
    >/dev/null
fi

aws rds wait db-instance-available --region "$REGION" --db-instance-identifier "$DB_INSTANCE_ID"

DB_ENDPOINT="$(aws rds describe-db-instances \
  --region "$REGION" \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)"

DB_PORT="$(aws rds describe-db-instances \
  --region "$REGION" \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --query 'DBInstances[0].Endpoint.Port' \
  --output text)"

cat >"$ROOT_DIR/.tmp/aws-db.env" <<EOF
AWS_REGION=$REGION
DB_INSTANCE_ID=$DB_INSTANCE_ID
DB_ENDPOINT=$DB_ENDPOINT
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USERNAME=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_ENDPOINT:$DB_PORT/$DB_NAME
LAMBDA_SECURITY_GROUP_ID=$LAMBDA_SG_ID
DB_SECURITY_GROUP_ID=$DB_SG_ID
VPC_ID=$VPC_ID
SUBNET_IDS=${SUBNET_IDS[*]}
EOF

echo "Wrote deployment outputs to $ROOT_DIR/.tmp/aws-db.env"
