variable "aws_region" {
  default = "us-east-1"
}

variable "cluster_name" {
  default = "quickbite-staging"
}

variable "node_instance_type" {
  # small/cheap, fine for a short-lived single-service test
  default = "t3.small"
}
