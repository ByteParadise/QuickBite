
# ? helm
# Helm is Kubernetes' package manager — the same role `npm/apt/brew` play
# for their ecosystems, but for Kubernetes manifests.
# - A chart is a Helm package: a bundle of templated Kubernetes YAML plus a
#   values.yaml` of configurable settings. Someone else (here, the External
#   Secrets Operator project) writes and publishes the chart; you consume it
# - `helm install <release-name> <chart> renders those templates with your
#   chosen values and applies the result to your cluster — one command instead
#   of hand-writing and tracking every Deployment/Service/CRD/RBAC object a
#  complex piece of software needs.
# - it's specifically suited to installing other people's software into your
#   cluster — operators, controllers, ingress controllers, etc. — where you
#   don't want to hand-maintain someone else's YAML yourself, just configure
#   it. That's the contract with Kustomize: Kustomize is for layering your own
#   environment-specific changes onto manifests you wrotel Helm is for consuming
#   a packaged, versioned piece of software someone else maintains.


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
