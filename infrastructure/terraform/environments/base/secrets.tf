# Creates entry for Stripe secret key and manually set it with
# `aws secretmanager put-secret-value` command
resource "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "quickbite/account-service/STRIPE_SECRET_KEY"
}
