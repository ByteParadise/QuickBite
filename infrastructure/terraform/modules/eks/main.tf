# ? eks/main.tf
# EKS cluster (control plane) and its worker nodes, plus the access
# grant that lets you `kubectl` into it

# Trust policy for eks to assume
data "aws_iam_policy_document" "eks_cluster_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

# IAM role for EKS
resource "aws_iam_role" "eks_cluster" {
  name               = "quickbite-eks-cluster-role"
  assume_role_policy = data.aws_iam_policy_document.eks_cluster_assume.json
}

# EKS permissions (managing ENIs, talking to EC2/ELB APIs, etc)
resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# Trust policy for node to assume
data "aws_iam_policy_document" "eks_node_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

# IAM role for node
resource "aws_iam_role" "eks_node" {
  name               = "quickbite-eks-node-role"
  assume_role_policy = data.aws_iam_policy_document.eks_node_assume.json
}

# EKS Node permissions
resource "aws_iam_role_policy_attachment" "eks_node" {
  for_each = toset([
    # Join the cluster
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    # Run the CNI (Container networking)
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    # Pull images from ECR
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
  ])
  role       = aws_iam_role.eks_node.name
  policy_arn = each.value
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

# Allocates a static public IP address for NAT
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "quickbite-${var.environment}-nat-eip" }
}

# Create NAT with the IP address
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  # NAT Gateways live in a public subnet and serve private subnets' egress
  subnet_id     = var.public_subnet_ids[0]
  tags          = { Name = "quickbite-${var.environment}-nat" }

  depends_on = [aws_eip.nat]
}

# Gives the private subnet internet route.
# EKS nodes need outbound internet access to pull container images,
# reach AWS APIs, etc — without being exposed to inbound traffic.
resource "aws_route" "private_nat" {
  route_table_id         = var.private_route_table_id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}

# Create the control plane itself
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.kubernetes_version

  # Assign both public and private subnets
  # public: lets you run kubectl straight from your laptop, no bastion/VPN
  # private: required for the control plane to reach the worker nodes
  vpc_config {
    subnet_ids = concat(var.public_subnet_ids, var.private_subnet_ids)
    endpoint_public_access  = true
    endpoint_private_access = true
  }

  access_config {
    # Getting into an EKS cluster takes two separate questions:
    # 1. "Who are you?": IAM answers this. kubectl sends a token from
    # `aws eks get-token`, and EKS verifies it. This is the same in every mode.
    # - This happens when you call `aws_eks_cluster_auth` in providers.tf
    # 2. "What may this IAM identity do in Kubernetes?": Kubernetes doesn't
    # understand IAM, so EKS needs a lookup table that maps an IAM ARN to
    # Kubernetes permissions.
    # `authentication_mode` decides where that lookup table lives.
    # 1. The `aws-auth` ConfigMap
    # - A YAML object inside the cluster, edited with `kubectl`.
    # - You need cluster access to change it, which causes a chicken-and-egg problem
    # 2. Access entires
    # - Stored in the EKS API, outside the cluster
    # - Managed with the AWS CLI or Terraform (aws_eks_access_entry, 
    # aws_eks_access_policy_association), which below bootstrap already creates,
    # and logged in CloudTrail.
    # - Changing them doesn't require cluster access.
    authentication_mode = "API"
    # Automatic admin for the creator.
    # 1. When the cluster is created, EKS adds an access entry for the IAM
    # identity that created it (through the `terraform` profile), with
    # AmazonEKSClusterAdminPolicy.
    # 2. That's why the helm/kubectl providers can install thgins during the
    # same `apply`.
    # 3. It only takes effect at creation. Changing it later is expected to
    # force the cluster to be replaced.
    bootstrap_cluster_creator_admin_permissions = true
  }

  # Force cluster-policy attachment and the subnet tagging to finish first
  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_ec2_tag.public_cluster,
    aws_ec2_tag.private_cluster,
  ]
}

# Create group of nodes
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "quickbite-${var.environment}-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = [var.node_instance_type]

  scaling_config {
    desired_size = var.node_desired_size
    min_size     = var.node_min_size
    max_size     = var.node_max_size
  }

  # Node IAM policies, and the NAT route since nodes need outbound
  # internet to actually boot and join the cluster
  depends_on = [
    aws_iam_role_policy_attachment.eks_node_worker,
    aws_iam_role_policy_attachment.eks_node_cni,
    aws_iam_role_policy_attachment.eks_node_ecr,
    aws_route.private_nat,
  ]
}

# Installs the Pod Identity Agent itself onto the cluster (a DaemonSet
# AWS manages) — nothing in modules/rds or modules/eso's pod identity
# associations works without this running first
resource "aws_eks_addon" "pod_identity" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "eks-pod-identity-agent"
}
