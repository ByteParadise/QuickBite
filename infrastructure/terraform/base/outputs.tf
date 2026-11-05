
# ? how outputs get allocated
# 1. terraform apply runs
# 2. Terraform calls the real AWS API to create each resource
#  (VPC, subnets, ECR repos, IAM role)
# 3. AWS itself generates the real identifiers — the VPC ID,
#  subnet IDs, the role's ARN — Terraform doesn't choose these,
#  AWS does, at creation time
# 4. Terraform records everything AWS returned into its state
#  file (terraform.tfstate) — this is the record of "what exists
#  right now and what AWS says its attributes are"
# 5. Output blocks are evaluated after that — aws_vpc.main.id
#  just means "look up the id attribute of this resource in
#  state, whatever AWS actually assigned it"

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "ecr_repository_urls" {
  value = { for k, v in aws_ecr_repository.service : k => v.repository_url }
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions_ci.arn
}
