variable "aws_region" {
  description = "AWS region for all QuickBite infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "github_org" {
  description = "GitHub org that owns the QuickBite repos"
  type        = string
  default     = "ByteParadise"
}

variable "github_repos" {
  description = "Repos allowed to assume the CI role via OIDC"
  type        = list(string)
  default     = ["QuickBite"]
}
