variable "aws_region" {
  default = "us-east-1"
}

variable "cluster_name" {
  default = "quickbite-session"
}

# Verified against AWS's EKS version lifecycle page (2026-11-06): 1.34-1.37
# are in standard support, 1.31-1.33 are paid extended support (6x the
# control plane rate). 1.37 is newest, longest runway before this matters again.
variable "kubernetes_version" {
  default = "1.37"
}

variable "node_instance_type" {
  # small/cheap, fine for a short-lived single-service test
  default = "t3.small"
}
