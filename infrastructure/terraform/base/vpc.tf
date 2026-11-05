# ? DNS
# DNS resolution is how everything in AWS actually talks to anything,
# including ECR, Secret Manager, RDS endpoints, S3
resource "aws_vpc" "main" {
  # private IP range the while VPC carves subnets out of
  cidr_block           = "10.20.0.0/16"
  # both true so resources inside the VPC get usable DNS names/resolution
  # EKS specifically requires both enabled to function
  enable_dns_support   = true # true by default
  enable_dns_hostnames = true # false by default

  tags = { Name = "quickbite-vpc" }
}

resource "aws_internet_gateway" "main" {
  # igw gives the VPC any path to/from the public internet at all.
  # without it, nothing in any subnet, public or private, can reach outside.
  vpc_id = aws_vpc.main.id
  tags   = { Name = "quickbite-igw" }
}

# fetches which AZs exist and are usable in your region
data "aws_availability_zones" "available" {
  state = "available"
}

# Public subnets — for the ALB and NAT Gateway(s), created later in the session stack
resource "aws_subnet" "public" {
  # two public subnets, one per AZ
  # EKS requires subnets in at least 2 AZs
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  # carves each subnet's own slice out of the VPC
  # ? cidrsubnet(prefix, newbits, netnum)
  # prefix = the block being carved from, 10.20.0.0/16 in this case
  # newbits = how many extrac bits to add to the prefix length
  # New prefix length = 16 + 8 = 24, so every resulting subnet is a /24
  # netnum = which one of the possible /24 blocks to pick.
  # With newbits: count.index = 0, 1 -> 10.20.0.0/24, 10.20.1.0/24
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  # pins each subnet to a different real AZ from the data lookup above
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  # anything launched directly in this subnet gets a public IP automatically.
  map_public_ip_on_launch = true

  tags = {
    Name                     = "quickbite-public-${count.index}"
    # this tag is how the AWS Load Balancer Controller discovers which
    # subnets it's allowed to place a public-facing load balancer into
    "kubernetes.io/role/elb" = "1"
  }
}

# Private subnets — for EKS worker nodes and RDS, created in the session stack
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 100)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                              = "quickbite-private-${count.index}"
    # equivalent auto-discovery tag, but for internal load balancers
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    # send all internet-bound traffic to the IGW
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "quickbite-public-rt" }
}

# Explicitly links each public subnet to the public route table.
# Subnets don't automatically use any particular route table
# This association is what makes it happen
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Exists now (free); the session stack adds a NAT Gateway route to this
# table only while a session is actually running.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "quickbite-private-rt" }
}

# Same linking role as the public one, for the private subnets
resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
