# ? argocd/main.tf
# Installs Argo CD itself into the cluster, then bootstraps the one piece that
# lets everything after this be driven entirely by Git — no more Terraform
# changes needed when more services are added.

# Installs Argo CD into the cluster via Helm.
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = var.chart_version
  namespace        = "argocd"
  create_namespace = true
  timeout          = 600

  # Trimmed to fit this cluster's small single-node pod-count limit
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
}


# Bootstraps Application Argo CD which watches QuickBite-gitops's argocd-apps/
# directory.
resource "kubectl_manifest" "argocd_bootstrap_app" {
  yaml_body = yamlencode({
    apiVersion = "argoproj.io/v1alpha1"
    kind       = "Application"
    # The name shown in the Argo CD UI
    metadata   = { name = "argocd-apps", namespace = "argocd" }
    spec = {
      project = "default"
      # Which repo to sync with
      source = {
        repoURL        = var.gitops_repo_url
        targetRevision = var.gitops_target_revision
        path           = var.gitops_path
        directory      = { recurse = true }
      }
      # Where to apply
      destination = {
        # The cluster Argo CD itself runs in
        server    = "https://kubernetes.default.svc"
        namespace = "argocd"
      }
      # How syncing behaves
      syncPolicy = {
        automated = { selfHeal = true, prune = true }
      }
    }
  })

  depends_on = [helm_release.argocd]
}
