variable "chart_version" {
  type    = string
  default = "10.15.0"
}

variable "gitops_repo_url" {
  type    = string
  default = "https://github.com/ByteParadise/QuickBite-gitops.git"
}

variable "gitops_target_revision" {
  type    = string
  default = "main"
}

variable "gitops_path" {
  type = string
}
