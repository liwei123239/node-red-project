#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REGION="${AWS_REGION:-us-west-2}"
LAMBDA_URL="${LAMBDA_URL:-}"
PUBLIC_IP="${PUBLIC_IP:-}"
KEY_PATH="${KEY_PATH:-}"

if [[ -z "$LAMBDA_URL" || -z "$PUBLIC_IP" || -z "$KEY_PATH" ]]; then
  echo "Missing required env vars: LAMBDA_URL, PUBLIC_IP, KEY_PATH"
  exit 1
fi

mkdir -p "$ROOT_DIR/.tmp"

cat >"$ROOT_DIR/.tmp/nginx.node-red-project.conf" <<EOF
server {
  listen 80 default_server;
  server_name _;

  root /var/www/node-red-project;
  index index.html;

  location /trpc/ {
    proxy_pass ${LAMBDA_URL}trpc/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /api/ {
    proxy_pass ${LAMBDA_URL}api/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
EOF

cd "$ROOT_DIR"
VITE_SERVER_URL="http://$PUBLIC_IP" pnpm --filter web build

ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "ec2-user@$PUBLIC_IP" "sudo dnf install -y nginx && sudo mkdir -p /var/www/node-red-project"
scp -o StrictHostKeyChecking=no -i "$KEY_PATH" -r "$ROOT_DIR/apps/web/dist/." "ec2-user@$PUBLIC_IP:/tmp/node-red-project-dist/"
scp -o StrictHostKeyChecking=no -i "$KEY_PATH" "$ROOT_DIR/.tmp/nginx.node-red-project.conf" "ec2-user@$PUBLIC_IP:/tmp/nginx.node-red-project.conf"
ssh -o StrictHostKeyChecking=no -i "$KEY_PATH" "ec2-user@$PUBLIC_IP" "sudo cp -a /tmp/node-red-project-dist/. /var/www/node-red-project/ && sudo mv /tmp/nginx.node-red-project.conf /etc/nginx/conf.d/node-red-project.conf && sudo rm -f /etc/nginx/conf.d/default.conf && sudo systemctl enable nginx && sudo systemctl restart nginx"

echo "PUBLIC_IP=$PUBLIC_IP"
echo "KEY_PATH=$KEY_PATH"
