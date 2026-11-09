# ? data.tf
# staging/ looks up base/'s existing VPC, subnets, and secrets by AWS
# tag/name rather than reading base's Terraform state

# ? data
# data blocks are read-only queries against AWS's live state

data "aws_vpc" "main" {
  filter {
    # filter by Name
    name   = "tag:Name"
    # value the Name must match
    values = ["quickbite-vpc"]
  }
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  tags = {
    Name = "quickbite-public-*"
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  tags = {
    Name = "quickbite-private-*"
  }
}

data "aws_route_table" "private" {
  filter {
    name   = "tag:Name"
    values = ["quickbite-private-rt"]
  }
}

# --- secrets base/ created, that ESO needs read access to ---
# scoped to read-only access on the secret from base/secrets.tf
data "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "quickbite/account-service/STRIPE_SECRET_KEY"
}
