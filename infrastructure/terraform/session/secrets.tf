
# ? secrets.tf
# creates empty Secrets Manager "containers" — just the name slots, no
# actual values — for the real third-party credentials.
# Set actual values manually via `aws secretsmanager put-secret-value` or the
# console after this applies.

resource "aws_secretsmanager_secret" "auth0_domain" {
  name = "quickbite/account-service/AUTH0_DOMAIN"
}

resource "aws_secretsmanager_secret" "auth0_audience" {
  name = "quickbite/account-service/AUTH0_AUDIENCE"
}

resource "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "quickbite/account-service/STRIPE_SECRET_KEY"
}

resource "aws_secretsmanager_secret" "cors_origins" {
  name = "quickbite/account-service/CORS_ORIGINS"
}
