# ? outputs.tf
# exposes a few values from this stack to use afterward — printed to
# the terminal after `terraform apply`, and queryable later via
# `terraform output`

output "cluster_name" {
  value = module.eks.name
}

output "cluster_endpoint" {
  value = module.eks.endpoint
}

output "node_role_arn" {
  value = module.eks.node_role_arn
}

output "rds_proxy_endpoint" {
  value = module.rds.proxy_endpoint
}
