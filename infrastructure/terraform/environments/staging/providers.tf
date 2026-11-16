# ? providers.tf
# Configure providers used in this stack.
# Providers have to be defined in the module root directory.

# Generated a short-lived auth token for the cluster module.eks just created.
# Needed because the `helm` and `kubectl` providers below have to authenticate
# ,using the token, to the Kubernetes API, same as your own `kubectl` would,
# but here using Terraform's own credentials.
data "aws_eks_cluster_auth" "main" {
  name = module.eks.name
}

provider "aws" {
  region  = var.aws_region
  profile = "terraform"

  default_tags {
    tags = {
      Project     = "QuickBite"
      ManagedBy   = "terraform"
      Environment = "staging"
    }
  }
}

# Points the Helm provider at this specific cluster, so `helm_release`
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
