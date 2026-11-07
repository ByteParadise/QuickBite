# ? outputs.tf
# exposes a few values from this stack to use afterward — printed to 
# the terminal after `terraform apply`, and queryable later via 
# `terraform output`

output "cluster_name" {
  value = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "node_role_arn" {
  value = aws_iam_role.eks_node.arn
}

output "rds_proxy_endpoint" {
  value = aws_db_proxy.account_service.endpoint
}
