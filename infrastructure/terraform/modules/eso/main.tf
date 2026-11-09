# ? eso/main.tf
# installs External Secrets Operator (ESO) into the cluster via
# Helm, and configures it to actually talk to AWS Secrets Manager
# — the piece that makes `account-service-secrets` (referenced
# by the Deployment, defined in `externalsecret.yaml`) actually
# get populated
#
# the helm/kubectl provider connections themselves live in the calling
# root module (environments/staging/providers.tf) — Terraform restricts
# configuring providers inside non-root modules, so this module just
# consumes the root's default helm/kubectl provider configuration.

# the actual install: pulls the `external-secrets` chart from its official
# repository into its own `external-secrets` namespace. The `set` block
# forces its ServiceAccount's name to exactly `external-secrets`.
resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = var.chart_version
  namespace        = "external-secrets"
  create_namespace = true
  timeout          = 600 # default 300s isn't enough for this chart's uninstall

  # pinned explicitly, not left to the chart's auto-generated fullname —
  # must exactly match the pod identity association below's namespace/
  # service_account, same fragility as the Deployment's serviceAccountName
  set {
    name  = "serviceAccount.name"
    value = "external-secrets"
  }
}

# creates a `ClusterSecretStore`, a custom resource ESO itself defines, telling
# it how to reach Secrets Manager (just service + region — no credentials
# needed, since ESO's pod gets AWS permissions automatically via its own Pod
# Identity association below). This uses the separate kubectl provider instead of
# Terraform's official `kubernetes_manifest` resource specifically because
# `kubernetes_manifest` validates against the CRD's schema at `plan` time —
# and that CRD doesn't exist until the Helm chart above actually installs it,
# creating a chicken-and-egg failure the kubectl provider sidesteps by not
# doing that validation.
resource "kubectl_manifest" "cluster_secret_store" {
  yaml_body = yamlencode({
    apiVersion = "external-secrets.io/v1"
    kind       = "ClusterSecretStore"
    metadata   = { name = "aws-secrets-manager" }
    spec = {
      provider = {
        aws = {
          service = "SecretsManager"
          region  = var.aws_region
        }
      }
    }
  })

  depends_on = [helm_release.external_secrets]
}

# --- External Secrets Operator's own Pod Identity: read-only access to
# the secrets it's been scoped to (var.secret_arns), nothing broader ---

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

data "aws_iam_policy_document" "eso_secrets_access" {
  statement {
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = var.secret_arns
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

# the link: "pods running as the `external-secrets` ServiceAccount, in the
# `external-secrets` namespace, on this cluster, get this IAM role's
# credentials."
resource "aws_eks_pod_identity_association" "eso" {
  cluster_name    = var.cluster_name
  namespace       = "external-secrets"
  service_account = "external-secrets"
  role_arn        = aws_iam_role.eso.arn
}
