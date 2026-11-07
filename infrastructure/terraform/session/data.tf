# ? data.tf
# session/ looks up base/'s existing VPC and subnets by AWS tag
# rather than reading base's Terraform state

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
