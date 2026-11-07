# ? nat.tf
# this gives the private subnets (where EKS worker nodes live)
# outbound internet access — to pull container images, reach
# AWS APIs, etc — without exposing those nodes to inbound traffic
# from the internet. 
# base/'s private route table has no route to the internet 
# — that's deliberately added here since a NAT Gateway incurs cost.

data "aws_route_table" "private" {
  filter {
    name   = "tag:Name"
    values = ["quickbite-private-rt"]
  }
}

# allocates a static public IP address
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "quickbite-session-nat-eip" }
}

# create NAT with the IP address
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  # NAT Gateways live in a public subnet but serve private subnets' egress
  subnet_id     = data.aws_subnets.public.ids[0]
  tags          = { Name = "quickbite-session-nat" }

  depends_on = [aws_eip.nat]
}

# gives the subnet internet route
resource "aws_route" "private_nat" {
  route_table_id         = data.aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}
