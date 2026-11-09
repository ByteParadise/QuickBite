# ! never applied — see versions.tf's header comment.
# Mirrors environments/staging/main.tf's wiring exactly; only the values
# passed to the modules differ, reflecting what a persistent, real-traffic
# environment would actually need.

module "eks" {
  source = "../../modules/eks"

  environment        = "production"
  cluster_name       = var.cluster_name
  node_instance_type = var.node_instance_type
  # more headroom than staging's 2/1/2 — a single-node loss shouldn't
  # take the whole cluster down
  node_desired_size      = 3
  node_min_size          = 2
  node_max_size          = 5
  public_subnet_ids      = data.aws_subnets.public.ids
  private_subnet_ids     = data.aws_subnets.private.ids
  private_route_table_id = data.aws_route_table.private.id
  admin_principal_arn    = data.aws_caller_identity.current.arn
}

module "rds" {
  source = "../../modules/rds"

  vpc_id                        = data.aws_vpc.main.id
  private_subnet_ids            = data.aws_subnets.private.ids
  eks_cluster_security_group_id = module.eks.cluster_security_group_id
  cluster_name                  = module.eks.name
  aws_region                    = var.aws_region
  account_id                    = data.aws_caller_identity.current.account_id

  # real data, real failover requirement, real backup retention —
  # the opposite of staging's throwaway-database defaults
  instance_class      = "db.t4g.small"
  multi_az            = true
  skip_final_snapshot = false

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

  # production tracks `main`, not a sprint branch — the promotion event
  # discussed separately is what actually updates this path's content,
  # not this Terraform configuration itself
  gitops_target_revision = "main"
  # watches only argocd-apps/production/ — never argocd-apps/staging/
  gitops_path             = "argocd-apps/production"

  depends_on = [module.eks]
}
