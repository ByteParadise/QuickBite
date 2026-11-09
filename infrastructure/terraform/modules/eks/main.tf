# ? eks/main.tf
# EKS cluster (control plane) and its worker nodes, plus the access
# grant that lets you `kubectl` into it

# trust policy allowing eks to assume
data "aws_iam_policy_document" "eks_cluster_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

# the cluster's role
resource "aws_iam_role" "eks_cluster" {
  name               = "quickbite-eks-cluster-role"
  assume_role_policy = data.aws_iam_policy_document.eks_cluster_assume.json
}

# EKS permissions (managing ENIs, talking to EC2/ELB APIs, etc)
resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# trust policy allowing EC2 to assume
data "aws_iam_policy_document" "eks_node_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

# the node's role
resource "aws_iam_role" "eks_node" {
  name               = "quickbite-eks-node-role"
  assume_role_policy = data.aws_iam_policy_document.eks_node_assume.json
}

# three EKS worker permissions
# join the cluster
resource "aws_iam_role_policy_attachment" "eks_node_worker" {
  role       = aws_iam_role.eks_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

# run the CNI (container networking)
resource "aws_iam_role_policy_attachment" "eks_node_cni" {
  role       = aws_iam_role.eks_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

# pull images from ECR.
resource "aws_iam_role_policy_attachment" "eks_node_ecr" {
  role       = aws_iam_role.eks_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# EKS (and several of its addons/controllers) expect every subnet it uses
# to carry a `kubernetes.io/cluster/<cluster-name>` tag. base/ couldn't set
# this when it created the subnets, since the cluster name didn't exist yet.
# aws_ec2_tag lets this stack add a tag to a resource it doesn't own,
# without taking over management of the whole subnet.

resource "aws_ec2_tag" "public_cluster" {
  for_each    = toset(var.public_subnet_ids)
  resource_id = each.value
  key         = "kubernetes.io/cluster/${var.cluster_name}"
  # "shared" — this VPC/subnets are also used for things outside this
  # cluster's ownership (base/'s ECR, IAM, etc.), not exclusively by EKS.
  value       = "shared"
}

resource "aws_ec2_tag" "private_cluster" {
  for_each    = toset(var.private_subnet_ids)
  resource_id = each.value
  key         = "kubernetes.io/cluster/${var.cluster_name}"
  value       = "shared"
}

# this gives the private subnets (where EKS worker nodes live)
# outbound internet access — to pull container images, reach
# AWS APIs, etc — without exposing those nodes to inbound traffic
# from the internet.
# base/'s private route table has no route to the internet
# — that's deliberately added here since a NAT Gateway incurs cost.

# allocates a static public IP address
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "quickbite-${var.environment}-nat-eip" }
}

# create NAT with the IP address
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  # NAT Gateways live in a public subnet but serve private subnets' egress
  subnet_id     = var.public_subnet_ids[0]
  tags          = { Name = "quickbite-${var.environment}-nat" }

  depends_on = [aws_eip.nat]
}

# gives the subnet internet route
resource "aws_route" "private_nat" {
  route_table_id         = var.private_route_table_id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}

# the control plane itself
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  # cluster IAM role
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.kubernetes_version

  # both public and private subnets
  # public: lets you run kubectl straight from your laptop, no bastion/VPN
  # private: required for the control plane to reach the worker nodes
  vpc_config {
    subnet_ids = concat(var.public_subnet_ids, var.private_subnet_ids)
    endpoint_public_access  = true
    endpoint_private_access = true
  }

  # API mode is required for aws_eks_access_entry/aws_eks_access_policy_association
  # below; bootstrap_cluster_creator_admin_permissions auto-grants the identity
  # running this apply cluster-admin, which is what makes helm/kubectl work at all
  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  # forces cluster-policy attachment and the subnet tagging to finish first
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_ec2_tag.public_cluster,
    aws_ec2_tag.private_cluster,
  ]
}

# managed group of nodes
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "quickbite-${var.environment}-nodes"
  # node IAM role
  node_role_arn   = aws_iam_role.eks_node.arn
  # workers live in private subnets only
  subnet_ids      = var.private_subnet_ids
  instance_types  = [var.node_instance_type]

  scaling_config {
    desired_size = var.node_desired_size
    min_size     = var.node_min_size
    max_size     = var.node_max_size
  }

  # node IAM policies, and the NAT route since nodes need outbound
  # internet to actually boot and join the cluster
  depends_on = [
    aws_iam_role_policy_attachment.eks_node_worker,
    aws_iam_role_policy_attachment.eks_node_cni,
    aws_iam_role_policy_attachment.eks_node_ecr,
    # nodes need outbound internet (kubelet, kube-proxy images, SSM, etc.)
    aws_route.private_nat,
  ]
}

# Grants the identity running `terraform apply` (you, via the "terraform"
# profile) kubectl access to the cluster it's creating.

# ! Commented out — redundant with access_config's
# bootstrap_cluster_creator_admin_permissions = true above, which already
# makes AWS auto-create an equivalent access entry + AmazonEKSClusterAdminPolicy
# association for the cluster creator on its own. Creating these explicitly
# as well caused:
#   Error: ResourceInUseException: The specified access entry resource
#   is already in use on this cluster.
# resource "aws_eks_access_entry" "admin" {
#   cluster_name  = aws_eks_cluster.main.name
#   principal_arn = var.admin_principal_arn
# }

resource "aws_eks_access_policy_association" "admin" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = var.admin_principal_arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }
}

# installs the Pod Identity Agent itself onto the cluster (a DaemonSet
# AWS manages) — nothing in modules/rds or modules/eso's pod identity
# associations works without this running first
resource "aws_eks_addon" "pod_identity" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "eks-pod-identity-agent"
}
