# ? DNS
# DNS resolution is how everything in AWS actually talks to anything,
# including ECR, Secret Manager, RDS endpoints, S3

# Creates VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  # Both true so resources inside the VPC get usable DNS names/resolution
  # EKS specifically requires both enabled to function
  enable_dns_support   = true # true by default
  enable_dns_hostnames = true # false by default

  tags = { Name = "quickbite-vpc" }
}

# Internet Gateway — for both public and private route tables
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "quickbite-igw" }
}

# Fetches which AZs exist and are usable in your region
data "aws_availability_zones" "available" {
  state = "available"
}

# Public subnets — for the ALB and NAT Gateway
resource "aws_subnet" "public" {
  # Two public subnets, one per AZ
  # EKS requires subnets in at least 2 AZs
  count                   = 2
  vpc_id                  = aws_vpc.main.id

  # Carves each subnet's own slice out of the VPC
  # ? cidrsubnet(prefix, newbits, netnum)
  # prefix = the block being carved from, 10.20.0.0/16 in this case
  # newbits = how many extra bits to add to the prefix length
  # New prefix length = 16 + 8 = 24, so every resulting subnet is a /24
  # netnum = which one of the possible /24 blocks to pick.
  # count.index = 0, 1 -> 10.20.0.0/24, 10.20.1.0/24
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)

  # Pins each subnet to a different AZ
  availability_zone       = data.aws_availability_zones.available.names[count.index]

  # Anything launched directly in this subnet gets a public IP automatically.
  map_public_ip_on_launch = true

  tags = {
    Name                     = "quickbite-public-${count.index}"
    # This tag is how the AWS Load Balancer Controller discovers which
    # subnets it's allowed to place a public-facing load balancer into
    # "1" doesn't mean anything, it just used for creating the tag
    "kubernetes.io/role/elb" = "1"
  }
}

# Private subnets — for EKS worker nodes and RDS
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 100)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "quickbite-private-${count.index}"
    # Equivalent auto-discovery tag, but for internal load balancers
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    # Send all internet-bound traffic to the IGW
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "quickbite-public-rt" }
}

# Linking public subnets to the public route table
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Route Table - will have to be connected with NAT Gateway for internet connection
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "quickbite-private-rt" }
}

# Linking private subnets to the private route table
resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
