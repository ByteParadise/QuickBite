# EKS (and several of its addons/controllers) expect every subnet it uses
# to carry a `kubernetes.io/cluster/<cluster-name>` tag. base/ couldn't set
# this when it created the subnets, since the cluster name didn't exist yet.
# aws_ec2_tag lets this stack add a tag to a resource it doesn't own,
# without taking over management of the whole subnet.

resource "aws_ec2_tag" "public_cluster" {
  for_each    = toset(data.aws_subnets.public.ids)
  resource_id = each.value
  key         = "kubernetes.io/cluster/${var.cluster_name}"
  # "shared" — this VPC/subnets are also used for things outside this
  # cluster's ownership (base/'s ECR, IAM, etc.), not exclusively by EKS.
  value       = "shared"
}

resource "aws_ec2_tag" "private_cluster" {
  for_each    = toset(data.aws_subnets.private.ids)
  resource_id = each.value
  key         = "kubernetes.io/cluster/${var.cluster_name}"
  value       = "shared"
}
