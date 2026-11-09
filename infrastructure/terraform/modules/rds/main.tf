# ! RDS Proxy "standard" IAM auth
# account-service authenticates to the PROXY
# with a short-lived IAM token (no stored password, ever reaches the pod).
# The proxy itself authenticates to the real Postgres instance using a
# password — but that password is the RDS-managed master secret, auto
# generated/stored/rotated by AWS, never touched by Terraform or a human.

# ? rds/main.tf
# Postgres provision, an RDS Proxy sitting in front enforcing IAM auth,
# security groups controlling who can reach what, and the IAM permission
# (plus pod identity wiring) needed for account-service to connect through
# the proxy

# assigns RDS private subnet
resource "aws_db_subnet_group" "account_service" {
  name       = "quickbite-account-service"
  subnet_ids = var.private_subnet_ids
}

# firewall for the database itself; only allow inbound Postgres traffic (port 5432)
# from the Proxy's security group specifically — nothing else can reach the db
# directly, not even the EKS nodes
resource "aws_security_group" "rds_account_service" {
  name   = "quickbite-rds-account-service"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds_proxy_account_service.id]
  }
}

# firewall for the Proxy; only allows inbound traffic from the EKS cluster's
# security group (so only pods on this cluster can reach it), and allows outbound
# traffic to reach the database
resource "aws_security_group" "rds_proxy_account_service" {
  name   = "quickbite-rds-proxy-account-service"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.eks_cluster_security_group_id]
  }

  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# the actual Postgres database
resource "aws_db_instance" "account_service" {
  identifier     = "quickbite-account-service"
  engine         = "postgres"
  engine_version = "17"
  instance_class = var.instance_class
  multi_az       = var.multi_az

  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = "account"
  username = "account_service_app"
  # AWS generates, stores, and rotates this in Secrets Manager directly —
  # no password is ever visible to Terraform, state, or a human.
  manage_master_user_password = true

  db_subnet_group_name    = aws_db_subnet_group.account_service.name
  vpc_security_group_ids  = [aws_security_group.rds_account_service.id]
  publicly_accessible     = false

  # short-lived session stack — no snapshot needed on teardown. A
  # persistent environment (production) should set this false.
  skip_final_snapshot = var.skip_final_snapshot
}


# grants that role permission to read the one specific master-password secret,
# nothing broader
# trust policy allowing proxy to assume
data "aws_iam_policy_document" "rds_proxy_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["rds.amazonaws.com"]
    }
  }
}
# the proxy's role
resource "aws_iam_role" "rds_proxy" {
  name               = "quickbite-rds-proxy-account-service"
  assume_role_policy = data.aws_iam_policy_document.rds_proxy_assume.json
}
# proxy permission (read the auto-managed master secret)
data "aws_iam_policy_document" "rds_proxy_secret_access" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_db_instance.account_service.master_user_secret[0].secret_arn]
  }
}
# attach the permission to the role
resource "aws_iam_role_policy" "rds_proxy_secret_access" {
  role   = aws_iam_role.rds_proxy.id
  policy = data.aws_iam_policy_document.rds_proxy_secret_access.json
}

# the Proxy itself
resource "aws_db_proxy" "account_service" {
  name                    = "quickbite-account-service"
  engine_family           = "POSTGRESQL"
  role_arn                = aws_iam_role.rds_proxy.arn
  vpc_subnet_ids          = var.private_subnet_ids
  vpc_security_group_ids  = [aws_security_group.rds_proxy_account_service.id]
  require_tls             = true

  auth {
    auth_scheme = "SECRETS"
    # clients (account-service) MUST present an IAM token to connect here —
    # this is the actual "no password reaches the app" guarantee
    iam_auth    = "REQUIRED"
    secret_arn  = aws_db_instance.account_service.master_user_secret[0].secret_arn
  }
}

# register the actual database instance as what this Proxy forwards connections to
# (a Proxy on its own doesn't know which database )
resource "aws_db_proxy_default_target_group" "account_service" {
  db_proxy_name = aws_db_proxy.account_service.name
}
resource "aws_db_proxy_target" "account_service" {
  db_proxy_name          = aws_db_proxy.account_service.name
  target_group_name      = aws_db_proxy_default_target_group.account_service.name
  db_instance_identifier = aws_db_instance.account_service.identifier
}


# Permission to connect to the proxy via an IAM token, scoped to this
# specific proxy + db username. Attached to account-service's Pod Identity
# role below.
locals {
  rds_proxy_resource_id = element(split(":", aws_db_proxy.account_service.arn), 6)
}
data "aws_iam_policy_document" "rds_connect" {
  statement {
    actions = ["rds-db:connect"]
    resources = [
      "arn:aws:rds-db:${var.aws_region}:${var.account_id}:dbuser:${local.rds_proxy_resource_id}/${aws_db_instance.account_service.username}"
    ]
  }
}
resource "aws_iam_policy" "rds_connect" {
  name   = "quickbite-account-service-rds-connect"
  policy = data.aws_iam_policy_document.rds_connect.json
}

# --- account-service's Pod Identity: grants its pod permission to connect ---
# trust policy allowing pod(s) to assume
data "aws_iam_policy_document" "pod_identity_assume" {
  statement {
    actions = ["sts:AssumeRole", "sts:TagSession"]
    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

# a role for `account-service`'s pod, with the rds_connect policy above
# attached (permission to generate an IAM token for the RDS Proxy)
resource "aws_iam_role" "account_service_pod" {
  name               = "quickbite-account-service-pod"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_assume.json
}
resource "aws_iam_role_policy_attachment" "account_service_rds_connect" {
  role       = aws_iam_role.account_service_pod.name
  policy_arn = aws_iam_policy.rds_connect.arn
}

# Matches on (cluster, namespace, service_account) — all three must line up
# exactly with what the Deployment/ServiceAccount actually use in the
# cluster, or the pod silently gets no credentials at all.

# the actual link: "pods running as the `account-service` ServiceAccount, in
# the `account-service` namespace, on this cluster, get this IAM role's
# credentials."
resource "aws_eks_pod_identity_association" "account_service" {
  cluster_name    = var.cluster_name
  namespace       = var.pod_namespace
  service_account = var.pod_service_account
  role_arn        = aws_iam_role.account_service_pod.arn
}
