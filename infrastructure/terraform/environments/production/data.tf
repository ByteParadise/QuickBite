# looks up the SAME base/ VPC, subnets, and secrets staging/ uses —
# base/ is persistent and shared across environments by design.

data "aws_vpc" "main" {
  filter {
    name   = "tag:Name"
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

data "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "quickbite/account-service/STRIPE_SECRET_KEY"
}
