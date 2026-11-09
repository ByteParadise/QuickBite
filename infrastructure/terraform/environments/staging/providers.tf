# ? providers.tf
# the helm/kubectl providers' own connection config has to live here, in the
# root module — Terraform restricts configuring providers inside non-root
# modules (modules/eso, modules/argocd) — so it's defined once here and
# every module below implicitly inherits this same default configuration.

# generates a short-lived auth token for the cluster module.eks just
# created. Needed because the `helm` and `kubectl` providers below have to
# authenticate to the Kubernetes API, same as your own `kubectl` would, but
# using Terraform's own credentials rather than a stored one.
data "aws_eks_cluster_auth" "main" {
  name = module.eks.name
}

# points the Helm provider at this specific cluster, so `helm_release`
# resources (inside modules/eso, modules/argocd) install into the right place
provider "helm" {
  kubernetes {
    host                   = module.eks.endpoint
    cluster_ca_certificate = base64decode(module.eks.certificate_authority)
    token                  = data.aws_eks_cluster_auth.main.token
  }
}

# same connection info, for the separate kubectl provider used below
provider "kubectl" {
  host                   = module.eks.endpoint
  cluster_ca_certificate = base64decode(module.eks.certificate_authority)
  token                  = data.aws_eks_cluster_auth.main.token
  load_config_file       = false
}
