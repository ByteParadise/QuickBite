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
}

variable "pod_service_account" {
  type    = string
}

variable "instance_class" {
  type    = string
}

variable "multi_az" {
  type    = bool
}

variable "allocated_storage" {
  type    = number
}


# short-lived environments (staging) don't need a final snapshot on
# teardown; a persistent environment (production) should set this false.
variable "skip_final_snapshot" {
  type    = bool
  default = true
}
