# fetches github's TLS certificate for its OIDC (OpenID Conenct)
# token endpoint, so Terraform can read its fingerprint.
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

# Register github as a trusted identity provider in AWS acconunt
resource "aws_iam_openid_connect_provider" "github" {
  # Identity Provider (IdP)
  url             = "https://token.actions.githubusercontent.com"
  # Relying Party
  client_id_list  = ["sts.amazonaws.com"]
  # the certificate fingerprint from the data block above,
  # so AWS can verify github's token signature is valid
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}

# trust policy
data "aws_iam_policy_document" "github_actions_trust" {
  statement {
    # the specific permission being granted: swap a web identity
    # token (github's) for temporary AWS credentials
    actions = ["sts:AssumeRoleWithWebIdentity"]

    # says the OIDC provider from above is who is being trusted
    principals {
      # Federated: external identity provider
      type        = "Federated"
      identifiers = [aws_iam_openid_connecft_provider.github.arn]
    }

    # The token's audience must be sts.amazonaws.com, confirming
    # it's really meant from AWS
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # The token's subject must match repo:ByteParadise/QuickBite:*.
    # This is what actually restricts which github repo can assume this role.
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
resource "aws_iam_role" "github_actions_ci" {
  name               = "quickbite-gh-ci-ecr-push"
  # this is the role CI will assume at runtime
  assume_role_policy = data.aws_iam_policy_document.github_actions_trust.json
}

# this is the permissions policy (separate from the trust policy above)
# what the role can actually do once assumed
data "aws_iam_policy_document" "ecr_push" {
  # needed to log in to ECR at all
  statement {
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    # since it's account-level, not tied to one repo
    resources = ["*"]
  }

  # the actual push permissions, scoped to only ECR repos created here
  statement {
    effect = "Allow"
    actions = [
      # checks which layers already exist in the repo, so only new leyers get uploaded
      "ecr:BatchCheckLayerAvailability",
      # fetches a URL to read an existing layer's content, used when Docker needs to
      # reference/verify a layer that's already in the registry
      "ecr:GetDownloadUrlForLayer",
      # fetches existing image manifests (the JSON describeing an image's layers + config)
      "ecr:BatchGetImage",
      # publishes the final manifest itself once its layers are all uploaded
      "ecr:PutImage",
      # starts a new layer upload session
      "ecr:InitiateLayerUpload",
      # uploads one chunck of a layer's data within that session
      "ecr:UploadLayerPart",
      # finalizes the uplaod once all parts are sent, making that layer actually available in the repo
      "ecr:CompleteLayerUpload",
    ]
    resources = [for repo in aws_ecr_repository.service : repo.arn]
  }
}

# attaches that permissions document directly to the role
resource "aws_iam_role_policy" "ecr_push" {
  name   = "quickbite-gh-ci-ecr-push-policy"
  role   = aws_iam_role.github_actions_ci.id
  policy = data.aws_iam_policy_document.ecr_push.json
}


