# ? ecr repo
# An ecr repo is a container image repository
# GitHub repo (ByteParadise/QuickBite) — holds source code
#  │  CI builds a Docker image from that source
#  ▼
# ECR repository (quickbite/account-service) — holds the built image
#  │  EKS pulls the image to actually run it  
#  ▼
# A running pod on the cluster

locals {
  services = ["account-service", "restaurant-service", "order-service"]
}

resource "aws_ecr_repository" "service" {
  # creats one repository per service by looping over the service list
  for_each             = toset(local.services)
  # namespaces all repos under a shared quickbite/ prefix
  name                 = "quickbite/${each.value}"
  # once an image is pushed under a given tag, that tag can never be
  # overwritten with a differnt image.
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    # ECR automatically scans every pushed image for known OS/package
    # vulnerabilities
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "service" {
  # one lifecycle policy per repository
  for_each   = aws_ecr_repository.service
  # points the policy at that specific repo
  repository = each.value.name

  # expire (delete) any image that is untagged and has sat there for 7+ days.
  # Untagged images accumulate from normal CI activity
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
