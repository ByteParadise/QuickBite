# ? main.tf
# wires modules/eks, modules/rds, modules/eso, modules/argocd together for
# the staging environment — this is the only file that decides how they're
# connected; each module stays reusable on its own.

module "eks" {
  source = "../../modules/eks"

  environment             = "staging"
  cluster_name            = var.cluster_name
  node_instance_type      = var.node_instance_type
  public_subnet_ids       = data.aws_subnets.public.ids
  private_subnet_ids      = data.aws_subnets.private.ids
  private_route_table_id  = data.aws_route_table.private.id
  admin_principal_arn      = data.aws_caller_identity.current.arn
}

module "rds" {
  source = "../../modules/rds"

  vpc_id                        = data.aws_vpc.main.id
  private_subnet_ids            = data.aws_subnets.private.ids
  eks_cluster_security_group_id = module.eks.cluster_security_group_id
  cluster_name                  = module.eks.name
  aws_region                    = var.aws_region
  account_id                    = data.aws_caller_identity.current.account_id

  # same destroy-order lesson as the original session/eso.tf and argocd.tf:
  # without this, Terraform sees no link between this module and module.eks,
  # so it may destroy both in parallel — revoking cluster-admin access while
  # this module's own pod identity teardown is still running.
  depends_on = [module.eks]
}

module "eso" {
  source = "../../modules/eso"

  aws_region   = var.aws_region
  cluster_name = module.eks.name
  secret_arns  = [data.aws_secretsmanager_secret.stripe_secret_key.arn]

  depends_on = [module.eks]
}

module "argocd" {
  source = "../../modules/argocd"

  # watches only argocd-apps/staging/ — never argocd-apps/production/, so
  # this cluster can't accidentally sync production's Applications
  gitops_path = "argocd-apps/staging"

  depends_on = [module.eks]
}
