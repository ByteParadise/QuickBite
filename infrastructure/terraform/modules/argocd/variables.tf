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

# no default on purpose: argocd-apps/ now has per-environment subfolders
# (argocd-apps/staging/, argocd-apps/production/), and recurse=true means
# a bare "argocd-apps" default would silently pick up every environment's
# Applications at once. Every caller must say which one it means.
variable "gitops_path" {
  type = string
}
