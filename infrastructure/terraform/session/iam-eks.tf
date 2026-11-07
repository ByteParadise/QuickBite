# ? iam-eks.tf
# creates the two IAM roles EKS needs — one for the control plane
# itself, one for the worker EC2 instances — each with different
# trust policies and different permissions

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
