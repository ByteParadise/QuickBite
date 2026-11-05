terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Local state for now — worth migrating to an S3 backend later for
  # safety, not a blocker for getting the base stack running.
}

provider "aws" {
  region = var.aws_region
  profile = "terraform"

  default_tags {
    tags = {
      Project     = "QuickBite"
      ManagedBy   = "terraform"
      Environment = "base"
    }
  }
}
