
# ? data.tf
# data reads lives state values from the provider.

# ====== Reads values set by `base/` for existing VPC, subnets, and secrets by AWS tag/name ====== #

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

  # ? Above this equivalent to this, but a shortcut
  # filter { 
  #   name = "tag:Name"
  #   values = ["quickbite-public-*"] 
  # }
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

data "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "quickbite/account-service/STRIPE_SECRET_KEY"
}

# Calls STS `GetCallerIdentity` which is the identity actually running
# `terraform apply`.
data "aws_caller_identity" "current" {}