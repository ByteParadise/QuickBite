# ? ECR (Elastic Container Registry)
# ECR is AWS's managed Docker/OCI container image registry.

# ? ECR repository
# An ECR repository is a container image repository.
#
# GitHub repo (ByteParadise/QuickBite) holds source code
#  │  CI builds a Docker image from the source
#  ▼
# ECR repository (e.g. quickbite/account-service) holds the built image
#  │  EKS pulls the image to actually run it  
#  ▼
# A running pod on the cluster

locals {
  services = ["account-service", "restaurant-service", "order-service"]
}

# Create ECR repository per service
resource "aws_ecr_repository" "service" {
  # Each service
  for_each             = toset(local.services)
  # Create namespace for service under a shared quickbite/ prefix
  name                 = "quickbite/${each.value}"
  # Once an image is pushed under a given tag, that tag can never be
  # overwritten with a differnt image.
  image_tag_mutability = "IMMUTABLE"

  # ECR automatically scans every pushed image for known OS/package
  # vulnerabilities
  image_scanning_configuration {
    scan_on_push = true
  }
}

# Sets up automatic cleanup rules for each ECR repository
resource "aws_ecr_lifecycle_policy" "service" {
  # Create one lifecycle policy per repository
  for_each   = aws_ecr_repository.service
  # Attaches the policy to each repo
  repository = each.value.name

  # * Consider adding more rules here so that we don't blow up the registry with redundant images
  # Expire (delete) any untagged images and has sat there for 7+ days.
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "expire untagged images after 7 days"
      selection = {
        tagStatus   = "untagged"
        countType   = "sinceImagePushed"
        countUnit   = "days"
        countNumber = 7
      }
      action = { type = "expire" }
    }]
  })
}
