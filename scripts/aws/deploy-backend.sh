#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REGION="${AWS_REGION:-us-west-2}"
FUNCTION_NAME="${FUNCTION_NAME:-node-red-project-api}"
ROLE_NAME="${ROLE_NAME:-node-red-project-lambda-role}"
ZIP_PATH="$ROOT_DIR/.tmp/lambda.zip"
LAMBDA_SECURITY_GROUP_ID="${LAMBDA_SECURITY_GROUP_ID:-}"
SUBNET_IDS_RAW="${SUBNET_IDS:-}"

if [[ -z "${DATABASE_URL:-}" || -z "${BETTER_AUTH_SECRET:-}" || -z "${BETTER_AUTH_URL:-}" || -z "${CORS_ORIGIN:-}" ]]; then
  echo "Missing required env vars: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, CORS_ORIGIN"
  exit 1
fi

mkdir -p "$ROOT_DIR/.tmp"

cd "$ROOT_DIR"
pnpm --filter server build:lambda

cd "$ROOT_DIR/apps/server/dist-lambda"
zip -r "$ZIP_PATH" . >/dev/null

set +e
ROLE_ARN="$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null)"
ROLE_STATUS=$?
set -e

if [[ $ROLE_STATUS -ne 0 || -z "$ROLE_ARN" || "$ROLE_ARN" == "None" ]]; then
  TRUST_POLICY_FILE="$ROOT_DIR/.tmp/lambda-trust-policy.json"
  cat >"$TRUST_POLICY_FILE" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://$TRUST_POLICY_FILE" \
    >/dev/null

  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    >/dev/null

  if [[ -n "$LAMBDA_SECURITY_GROUP_ID" && -n "$SUBNET_IDS_RAW" ]]; then
    aws iam attach-role-policy \
      --role-name "$ROLE_NAME" \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole \
      >/dev/null
  fi

  echo "Waiting for IAM role propagation..."
  sleep 12
  ROLE_ARN="$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)"
fi

ENVIRONMENT_ARGUMENT="Variables={DATABASE_URL=$DATABASE_URL,BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET,BETTER_AUTH_URL=$BETTER_AUTH_URL,CORS_ORIGIN=$CORS_ORIGIN,NODE_ENV=development}"
VPC_ARGUMENT=()

if [[ -n "$LAMBDA_SECURITY_GROUP_ID" && -n "$SUBNET_IDS_RAW" ]]; then
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole \
    >/dev/null 2>&1 || true

  IFS=' ' read -r -a SUBNET_ID_ARRAY <<<"$SUBNET_IDS_RAW"
  SUBNET_IDS_CSV="$(IFS=,; echo "${SUBNET_ID_ARRAY[*]}")"
  VPC_ARGUMENT=(--vpc-config "SubnetIds=$SUBNET_IDS_CSV,SecurityGroupIds=$LAMBDA_SECURITY_GROUP_ID")
fi

set +e
aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1
FUNCTION_EXISTS=$?
set -e

if [[ $FUNCTION_EXISTS -ne 0 ]]; then
  aws lambda create-function \
    --region "$REGION" \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs22.x \
    --handler lambda.handler \
    --architectures arm64 \
    --role "$ROLE_ARN" \
    --timeout 30 \
    --memory-size 1024 \
    --zip-file "fileb://$ZIP_PATH" \
    --environment "$ENVIRONMENT_ARGUMENT" \
    "${VPC_ARGUMENT[@]}" \
    >/dev/null
else
  aws lambda update-function-code \
    --region "$REGION" \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$ZIP_PATH" \
    >/dev/null

  aws lambda update-function-configuration \
    --region "$REGION" \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs22.x \
    --handler lambda.handler \
    --timeout 30 \
    --memory-size 1024 \
    --environment "$ENVIRONMENT_ARGUMENT" \
    "${VPC_ARGUMENT[@]}" \
    >/dev/null
fi

FUNCTION_URL="$(aws lambda get-function-url-config --function-name "$FUNCTION_NAME" --region "$REGION" --query 'FunctionUrl' --output text 2>/dev/null || true)"

if [[ -z "$FUNCTION_URL" || "$FUNCTION_URL" == "None" ]]; then
  aws lambda create-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --auth-type NONE \
    >/dev/null

  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --statement-id FunctionURLAllowPublicAccess \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE \
    >/dev/null 2>&1 || true

  FUNCTION_URL="$(aws lambda get-function-url-config --function-name "$FUNCTION_NAME" --region "$REGION" --query 'FunctionUrl' --output text)"
fi

echo "FUNCTION_NAME=$FUNCTION_NAME"
echo "FUNCTION_URL=$FUNCTION_URL"
