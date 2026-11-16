# ? variables.tf
# Here the variables here provides fields which you can manually
# configure depending on which environment you are using these
# modules within. By configuring these variables, the actual
# resource that is being built here, which is eks/main.tf will
# adopt the changes and launched based on the set variables.

variable "environment" {
  description = "short name used in resource/tag naming (e.g. \"staging\", \"production\")"
  type        = string
}

variable "cluster_name" {
  type = string
}

variable "kubernetes_version" {
  type    = string
}

variable "node_instance_type" {
  type = string
}

variable "node_desired_size" {
  type    = number
}

variable "node_min_size" {
  type    = number
}

variable "node_max_size" {
  type    = number
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
