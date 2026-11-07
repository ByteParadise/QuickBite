# ? pod-identity.tf
# this is what actually grants AWS permissions to specific pods running
# in the cluster — service gets permission to connect to the RDS Proxy,
# and the External Secrets Operator gets permission to read the Secrets
# Manager containers. Pod identity is the mechanism; it replaces node-
# level IAM (where every pod on a node shares the node's permissions)
# with per-workload IAM, scoped to exactly the pods that need it.

# trust policy allowing pod(s) to assume
# shared both roles below use
data "aws_iam_policy_document" "pod_identity_assume" {
  statement {
    actions = ["sts:AssumeRole", "sts:TagSession"]
    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

# installs the Pod Identity Agent itself onto the cluster (a DaemonSet
# AWS managers) — nothing below works without this running first
resource "aws_eks_addon" "pod_identity" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "eks-pod-identity-agent"
}

# a role for `account-service`'s pod, with the `rds_connect` policy from
# rds.tf attached (permission to generate an IAM token for the RDS Proxy)
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
# credentials." `depends_on` the addon, since this association is meaningless
# without the agent running
resource "aws_eks_pod_identity_association" "account_service" {
  cluster_name    = aws_eks_cluster.main.name
  namespace       = "account-service"
  service_account = "account-service"
  role_arn        = aws_iam_role.account_service_pod.arn

  depends_on = [aws_eks_addon.pod_identity]
}

# --- External Secrets Operator: needs to read the one secret container ---
# scoped to read-only access on secret from `secrets.tf`
data "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "quickbite/account-service/STRIPE_SECRET_KEY"
}
data "aws_iam_policy_document" "eso_secrets_access" {
  statement {
    actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = [
      data.aws_secretsmanager_secret.stripe_secret_key.arn,
    ]
  }
}
resource "aws_iam_role" "eso" {
  name               = "quickbite-external-secrets-operator"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_assume.json
}
resource "aws_iam_role_policy" "eso_secrets_access" {
  role   = aws_iam_role.eso.id
  policy = data.aws_iam_policy_document.eso_secrets_access.json
}

# the same kind of link, for ESO's own namespace/ServiceAccount
resource "aws_eks_pod_identity_association" "eso" {
  cluster_name    = aws_eks_cluster.main.name
  namespace       = "external-secrets"
  service_account = "external-secrets"
  role_arn        = aws_iam_role.eso.arn

  depends_on = [aws_eks_addon.pod_identity]
}
