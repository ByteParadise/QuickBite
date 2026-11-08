# ? eso.tf
# installs External Secrets Operator (ESO) into the cluster via
# Helm, and configures it to actually talk to AWS Secrets Manager
# — the piece that makes `account-service-secrets` (referenced
# by the Deployment, defined in `externalsecret.yaml`) actually
# get populated

# generates a short-lived auth token for the cluster Terraform
# just created. Needed because the `helm` and `kubectl` providers
# below have to authenticate to the Kubernetes API, same as your
# own `kubectl` would, but using Terraform's own credentials rather
# than a stored one.
data "aws_eks_cluster_auth" "main" {
  name = aws_eks_cluster.main.name
}

# points the Helm provider at this specific cluster, so `helm_release`
# resources below install into the right place
provider "helm" {
  kubernetes {
    host                   = aws_eks_cluster.main.endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.main.token
  }
}

# same connection info, for the separate kubectl provider used below
provider "kubectl" {
  host                   = aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
  load_config_file       = false
}

# the actual install: pulls the `external-secrets` chart from its official
# repository into its own `external-secrets` namespace. The `set` block
# forces its ServiceAccount's name to exactly `external-secrets`.
resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = "2.14.0"
  namespace        = "external-secrets"
  create_namespace = true

  # pinned explicitly, not left to the chart's auto-generated fullname —
  # must exactly match pod-identity.tf's association, same fragility as
  # the Deployment's serviceAccountName earlier
  set {
    name  = "serviceAccount.name"
    value = "external-secrets"
  }

  # ensures the node group (somewhere to actually run the pod) and the Pod
  # Identity association both exist first.
    depends_on = [
    aws_eks_node_group.main,
    aws_eks_pod_identity_association.eso,
    # exist to force destory order: without this, Terraform sees no link between this rosource
    # and the access policy association, so it may destory both in parallel — revoking cluster-
    # admin access while this resource's own unintall is still running. This makes Terraform
    # destroy this resource first, before access is revoked.
    aws_eks_access_policy_association.admin,
  ]

}

# creates a `ClusterSecretStore`, a custom resource ESO itself defines, telling
# it how to reach Secrets Manager (just service + region — no crendentials
# needed, since ESO's pod gets AWS permissions automatically via its own Pod
# Identity association). This uses the separate kubectl provider instead of
# Terraform's official `kubernetes_manifest` resource specifically because
# `kubernetes_manifest` validates against the CRD's shcema at `plan` time —
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

    depends_on = [
      helm_release.external_secrets, 
      aws_eks_access_policy_association.admin
    ]
}
