# exposes what other modules (rds, eso, argocd) and the calling root
# module need: connection info for the helm/kubectl providers, plus the
# cluster's own security group so rds's security group can allow it in.

output "name" {
  value = aws_eks_cluster.main.name
}

output "endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "certificate_authority" {
  value = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_security_group_id" {
  value = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "node_role_arn" {
  value = aws_iam_role.eks_node.arn
}
