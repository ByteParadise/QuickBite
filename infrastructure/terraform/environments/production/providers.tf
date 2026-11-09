data "aws_eks_cluster_auth" "main" {
  name = module.eks.name
}

provider "helm" {
  kubernetes {
    host                   = module.eks.endpoint
    cluster_ca_certificate = base64decode(module.eks.certificate_authority)
    token                  = data.aws_eks_cluster_auth.main.token
  }
}

provider "kubectl" {
  host                   = module.eks.endpoint
  cluster_ca_certificate = base64decode(module.eks.certificate_authority)
  token                  = data.aws_eks_cluster_auth.main.token
  load_config_file       = false
}
