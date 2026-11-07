terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }

  # Local state, same as base/ — this stack is short-lived and torn down
  # in Phase E, so the S3-migration tradeoff doesn't apply here the same way.
}

provider "aws" {
  region  = var.aws_region
  profile = "terraform"

  default_tags {
    tags = {
      Project     = "QuickBite"
      ManagedBy   = "terraform"
      Environment = "session"
    }
  }
}

# The identity actually running `terraform apply` — reused below to grant
# that same identity kubectl access to the cluster it's creating, with no
# manual ARN input needed.
data "aws_caller_identity" "current" {}
