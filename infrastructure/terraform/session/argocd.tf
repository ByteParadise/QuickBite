# ? argocd.tf
# installs Argo CD itself into the cluster, then bootstraps the one piece that
# lets everything after this be driven entirely by Git — no more Terraform
# changes needed when when more services are added

# installs Argo CD into the cluster via Helm.
# Argo CD only talks to the in-cluster Kubernetes API and a public Git
# repo over HTTPS, no AWS API calls.
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "10.15.0"
  namespace        = "argocd"
  create_namespace = true
  timeout          = 600

    # trimmed to fit this cluster's small single-node pod-count limit
  # (not a resource-sizing issue — t3.small simply allows a limited
  # number of pods per node) — none of these are needed for this setup
  # anyway: no SSO (dex), no notification channels configured
  # (notifications), and ApplicationSets aren't used, only plain
  # Applications committed directly (applicationSet)
  set {
    name  = "dex.enabled"
    value = "false"
  }
  set {
    name  = "notifications.enabled"
    value = "false"
  }
  set {
    name  = "applicationSet.enabled"
    value = "false"
  }

  # same destroy-order lesson as eso.tf's helm_release — forces this to
  # be destroyed before admin's cluster access is revoked
  depends_on = [
    aws_eks_node_group.main,
    aws_eks_access_policy_association.admin,
  ]
}

# bootstraps the one Application Argo CD needs created outside Git: it
# watches QuickBite-gitops's argocd-apps/ directory, and every Application
# manifest committed there (one per service) is picked up and synced
# automatically from that point on — no further Terraform changes needed
# as more services are added. This pattern is called 'app of apps'.
resource "kubectl_manifest" "argocd_bootstrap_app" {
  yaml_body = yamlencode({
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    metadata   = { name = "argocd-apps", namespace = "argocd" }
    spec = {
      project = "default"
      source = {
        repoURL        = "https://github.com/ByteParadise/QuickBite-gitops.git"
        targetRevision = "main"
        path           = "argocd-apps"
        directory      = { recurse = true }
      }
      destination = {
        server    = "https://kubernetes.default.svc"
        namespace = "argocd"
      }
      syncPolicy = {
        automated = { selfHeal = true, prune = true }
      }
    }
  })

  depends_on = [helm_release.argocd]
}
