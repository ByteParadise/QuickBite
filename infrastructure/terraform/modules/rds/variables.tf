variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "eks_cluster_security_group_id" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "account_id" {
  type = string
}

variable "pod_namespace" {
  type    = string
  default = "account-service"
}

variable "pod_service_account" {
  type    = string
  default = "account-service"
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "multi_az" {
  type    = bool
  default = false
}

# short-lived environments (staging) don't need a final snapshot on
# teardown; a persistent environment (production) should set this false.
variable "skip_final_snapshot" {
  type    = bool
  default = true
}
