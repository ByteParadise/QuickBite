variable "aws_region" {
  default = "us-east-1"
}

variable "cluster_name" {
  default = "quickbite-production"
}

# larger than staging's t3.small — production traffic isn't a single
# short-lived test
variable "node_instance_type" {
  default = "t3.medium"
}
