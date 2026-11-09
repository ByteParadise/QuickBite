# ? argocd/main.tf
# installs Argo CD itself into the cluster, then bootstraps the one piece that
# lets everything after this be driven entirely by Git — no more Terraform
# changes needed when more services are added
#
# the helm/kubectl provider connections themselves live in the calling
# root module (environments/staging/providers.tf) — see modules/eso/main.tf's
# header comment for why.

# installs Argo CD into the cluster via Helm.
# Argo CD only talks to the in-cluster Kubernetes API and a public Git
# repo over HTTPS, no AWS API calls.
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = var.chart_version
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
        repoURL        = var.gitops_repo_url
        targetRevision = var.gitops_target_revision
        path           = var.gitops_path
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
