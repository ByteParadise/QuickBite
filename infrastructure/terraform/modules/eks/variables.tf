variable "environment" {
  description = "short name used in resource/tag naming (e.g. \"staging\", \"production\")"
  type        = string
}

variable "cluster_name" {
  type = string
}

# Verified against AWS's EKS version lifecycle page (2026-11-06): 1.34-1.37
# are in standard support, 1.31-1.33 are paid extended support (6x the
# control plane rate). 1.37 is newest, longest runway before this matters again.
variable "kubernetes_version" {
  type    = string
  default = "1.37"
}

variable "node_instance_type" {
  type = string
}

variable "node_desired_size" {
  type    = number
  default = 2
}

variable "node_min_size" {
  type    = number
  default = 1
}

variable "node_max_size" {
  type    = number
  default = 2
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

# base/'s private route table has no route to the internet by default
# (see main.tf's NAT section) — this module adds one.
variable "private_route_table_id" {
  type = string
}

# the identity running `terraform apply`, granted cluster-admin access
variable "admin_principal_arn" {
  type = string
}
