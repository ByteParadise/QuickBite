# ! scaffold only — this environment is never applied in this project.
# It exists so the dev/prod folder structure is real and reviewable, not
# just described in a note. See the project's Obsidian notes for why
# production isn't actually built out here.

terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.16"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
  }

  # own state path — never shares state with staging/ or base/
}

provider "aws" {
  region  = var.aws_region
  profile = "terraform"

  default_tags {
    tags = {
      Project     = "QuickBite"
      ManagedBy   = "terraform"
      Environment = "production"
    }
  }
}

data "aws_caller_identity" "current" {}
