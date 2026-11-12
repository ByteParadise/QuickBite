# ? iam-oidc
# Register GitHub as a trusted identity provider for OIDC authentication
# so that GitHub Actions CI workflow can authenticate to AWS and manipulate
# service images on ECR

# Fetches github's TLS certificate for its OIDC (OpenID Conenct)
# token endpoint, so Terraform can read its fingerprint.
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

# Register github as a trusted identity provider in AWS acconunt
resource "aws_iam_openid_connect_provider" "github" {
  # Identity Provider (IdP)
  url             = "https://token.actions.githubusercontent.com"
  # Relying Party (AWS Security Token Service)
  client_id_list  = ["sts.amazonaws.com"]
  # The certificate fingerprint from the data block above,
  # so AWS can verify github's token signature is valid
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}

# Trust policy
data "aws_iam_policy_document" "github_actions_trust" {
  statement {
    # Specifies how the caller proves who they are.
    # CI reaches out to this endpoint with its JWT token to be validated by STS service.
    # You specify this IAM role ARN in GitHub CI workflow.
    actions = ["sts:AssumeRoleWithWebIdentity"]

    # Specifies who is even allowed to try.
    principals {
      # Federated: external identity provider
      type        = "Federated"
      # Register GitHub
      identifiers = [aws_iam_openid_connecft_provider.github.arn]
    }

    # When AWS receives JWT token, it performs additional checks for validation.
    # Checks token's audience is sts.amazonaws.com.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
        values = concat(
          [for repo in var.github_repos : "repo:${var.github_org}/${repo}:*"],
          [for repo in var.github_repos : "repo:${var.github_org}@*/${repo}@*:*"]
        )
    }
  }
}

# IAM role
# Once IAM role is created, you specify its ARN in GitHub workflow
# as an env variable so that it knows which role to request
resource "aws_iam_role" "github_actions_ci" {
  name               = "quickbite-gh-ci-ecr-push"
  assume_role_policy = data.aws_iam_policy_document.github_actions_trust.json
}

# Permissions policy
data "aws_iam_policy_document" "ecr_push" {
  # Needed to log in to ECR at all
  statement {
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    # Since it's account-level, not tied to one repo
    resources = ["*"]
  }

  # The actual push permissions, scoped to only ECR repos created here
  statement {
    effect = "Allow"
    actions = [
      # Fetches a URL to read an existing layer's content, used when Docker needs to
      # reference/verify a layer that's already in the registry
      "ecr:GetDownloadUrlForLayer",
      # Fetches existing image manifests (the JSON describeing an image's layers + config)
      "ecr:BatchGetImage",
      # Checks which layers already exist in the repo, so only new leyers get uploaded
      "ecr:BatchCheckLayerAvailability",
      # Publishes the final manifest itself once its layers are all uploaded
      "ecr:PutImage",
      # Starts a new layer upload session
      "ecr:InitiateLayerUpload",
      # Pploads one chunck of a layer's data within that session
      "ecr:UploadLayerPart",
      # Finalizes the uplaod once all parts are sent, making that layer actually available in the repo
      "ecr:CompleteLayerUpload",
    ]
    # Scoped only to the services specified in ecr.tf
    resources = [for repo in aws_ecr_repository.service : repo.arn]
  }
}

# Attaches the permissions document directly to the role
resource "aws_iam_role_policy" "ecr_push" {
  name   = "quickbite-gh-ci-ecr-push-policy"
  role   = aws_iam_role.github_actions_ci.id
  policy = data.aws_iam_policy_document.ecr_push.json
}


