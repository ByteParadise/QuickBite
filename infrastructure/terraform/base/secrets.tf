# Container only — no value here. This is a real third-party credential
# (Stripe), never written into Terraform files or state. Set the actual
# value manually via `aws secretsmanager put-secret-value` or the console
# after this applies.
#
# AUTH0_DOMAIN/AUTH0_AUDIENCE/CORS_ORIGINS are NOT secrets (they're
# public-ish config values), so they stay in the ConfigMap in
# overlays/session/kustomization.yaml instead.

resource "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "quickbite/account-service/STRIPE_SECRET_KEY"
}
