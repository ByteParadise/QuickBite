# ? eso/main.tf
# Installs External Secrets Operator (ESO) into the cluster via
# Helm, and configures it to actually talk to AWS Secrets Manager
# — the piece that makes `account-service-secrets` (referenced
# by the Deployment, defined in `externalsecret.yaml`) actually
# get populated

# Installs `external-secrets` chart from its official repo into its own
# `external-secrets` namespace.
resource "helm_release" "external_secrets" {
  # Terraform records the result as a release named `name`, so it can upgrade,
  # roll back or uninstall the set as one unit.
  name             = "external-secrets"
  # Repo where charts are hosted
  repository       = "https://charts.external-secrets.io"
  # Which package to install from the host
  chart            = "external-secrets"
  version          = var.chart_version
  # Where in the cluster the release is installed
  namespace        = var.namespace
  create_namespace = true
  timeout          = 600 # default 300s isn't enough for this chart's uninstall

  # set overrides the chart's template default values
  set {
    # A path into the chart's `values.yaml`
    name  = "serviceAccount.name"
    # value is the name of the Kubernetes ServiceAccount the chart creates.
    # The main ESO controller pod runs as that ServiceAccount.
    value = "external-secrets"
  }
}

# Creates ClusterSecretStore object.
# This tells ESO to read from Secrets Manager in your region. 
# Every `ExternalSecret` in the GitOps repo, such as `account-service-secrets`,
# refers to this store by name.
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

# Trust policy for external-secret pods to assume
data "aws_iam_policy_document" "pod_identity_assume" {
  statement {
    actions = ["sts:AssumeRole", "sts:TagSession"]
    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

# IAM role for external-secrets pods
resource "aws_iam_role" "eso" {
  name               = "quickbite-external-secrets-operator"
  assume_role_policy = data.aws_iam_policy_document.pod_identity_assume.json
}

# Permissions allowing external-secret pods to access Secret Manager
data "aws_iam_policy_document" "eso_secrets_access" {
  statement {
    actions   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    # Secrets registered in Secrets Manager from base
    resources = var.secret_arns
  }
}

# Associate the role and permissions
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
