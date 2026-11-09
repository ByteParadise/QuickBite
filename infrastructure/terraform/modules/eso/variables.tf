variable "chart_version" {
  type    = string
  default = "2.14.0"
}

variable "aws_region" {
  type = string
}

variable "cluster_name" {
  type = string
}

# ARNs of the Secrets Manager secrets ESO is allowed to read — currently
# just account-service's STRIPE_SECRET_KEY, passed in from the root module.
# A list so future services' secrets can be appended without changing this
# module's shape.
variable "secret_arns" {
  type = list(string)
}
