#!/bin/bash
set -euxo pipefail
DNF_YUM=$(command -v dnf || command -v yum)
$DNF_YUM install -y nginx unzip
mkdir -p /var/www/node-red-project
curl -fL 'https://node-red-project-deploy-837064483869-1781419201.s3.amazonaws.com/frontend-dist.zip?AWSAccessKeyId=AKIA4FZHOMQO4RJFPI4S&Signature=9ayUWrJuFBW3SSTpyL9mpbcIUWQ%3D&Expires=1781505718' -o /tmp/frontend-dist.zip
unzip -oq /tmp/frontend-dist.zip -d /var/www/node-red-project
cat > /etc/nginx/conf.d/node-red-project.conf <<'NGINX'
server {
  listen 80 default_server;
  server_name _;

  root /var/www/node-red-project;
  index index.html;

  location /trpc/ {
    proxy_pass https://daczp4mon5scpefdnqn5tbqvay0hiyti.lambda-url.us-west-2.on.aws/trpc/;
    proxy_http_version 1.1;
    proxy_ssl_server_name on;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /api/ {
    proxy_pass https://daczp4mon5scpefdnqn5tbqvay0hiyti.lambda-url.us-west-2.on.aws/api/;
    proxy_http_version 1.1;
    proxy_ssl_server_name on;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
NGINX
rm -f /etc/nginx/conf.d/default.conf
systemctl enable nginx
systemctl restart nginx
