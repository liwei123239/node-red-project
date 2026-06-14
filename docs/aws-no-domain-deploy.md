# AWS No-Domain Deployment

This deployment path is a pragmatic test environment:

- Frontend runs on EC2 over plain HTTP
- Backend runs on Lambda with a Function URL
- EC2 proxies `/api/*` and `/trpc/*` to the Lambda URL
- Better Auth stays on the EC2 origin so browser cookies still work without a custom domain

## Deployment steps

```bash
export AWS_REGION=us-west-2
./scripts/aws/provision-db.sh
source .tmp/aws-db.env
```

```bash
./scripts/aws/provision-frontend-host.sh
source .tmp/aws-frontend-host.env
```

```bash
export BETTER_AUTH_SECRET='replace-with-a-long-random-secret'
export BETTER_AUTH_URL="http://$PUBLIC_IP"
export CORS_ORIGIN="http://$PUBLIC_IP"
./scripts/aws/deploy-backend.sh
```

```bash
export LAMBDA_URL='https://<lambda-id>.lambda-url.us-west-2.on.aws/'
./scripts/aws/deploy-frontend.sh
```

## Important limitation

This is suitable for a shared test environment, not hardened production. Without HTTPS and a custom domain, auth cookies are intentionally running in development mode.
