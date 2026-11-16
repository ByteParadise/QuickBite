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
