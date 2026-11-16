# ? main.tf
# Wires all modules for the staging environment — this is the only file that
# decides how they're connected; each module stays reusable on its own.

# Each `module` block loads its folder and run them as well.

module "eks" {
  source = "../../modules/eks"
  environment             = "staging"
  cluster_name            = "quickbite-staging"
  kubernetes_version      = "1.37"
  node_instance_type      = "t3.small"
  node_desired_size       = 2
  node_min_size           = 1
  node_max_size           = 2
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
  pod_namespace                 = "account-service" # !
  pod_service_account           = "account-service" # !
  instance_class                = "db.t4g.micro"
  multi_az                      = false
  allocated_storage             = 20
  skip_final_snapshot           = true
  
  
  depends_on = [module.eks]
}

module "eso" {
  source = "../../modules/eso"
  aws_region   = var.aws_region
  cluster_name = module.eks.name
  namespace    = "external-secrets"
  secret_arns  = [data.aws_secretsmanager_secret.stripe_secret_key.arn]

  depends_on = [module.eks]
}

module "argocd" {
  source = "../../modules/argocd"
  gitops_path = "argocd-apps/staging"

  depends_on = [module.eks]
}
