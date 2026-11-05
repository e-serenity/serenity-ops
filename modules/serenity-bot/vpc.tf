data "aws_vpc" "existing" {
  count = local.create_ecs_cluster && !local.create_vpc ? 1 : 0
  id    = var.existing_vpc_id
}

resource "aws_vpc" "this" {
  count                = local.create_vpc ? 1 : 0
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

resource "aws_internet_gateway" "this" {
  count  = local.create_vpc && length(var.public_subnet_cidrs) > 0 ? 1 : 0
  vpc_id = aws_vpc.this[0].id

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-igw"
  })
}

resource "aws_subnet" "public" {
  count             = local.create_vpc ? length(var.public_subnet_cidrs) : 0
  vpc_id            = aws_vpc.this[0].id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = element(local.azs, count.index)

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-subnet-public-${count.index + 1}-${element(local.azs, count.index)}"
    Tier = "public"
  })
}

resource "aws_subnet" "private" {
  count             = local.create_vpc ? length(var.private_subnet_cidrs) : 0
  vpc_id            = aws_vpc.this[0].id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = element(local.azs, count.index)

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-subnet-private-${count.index + 1}-${element(local.azs, count.index)}"
    Tier = "private"
  })
}

resource "aws_eip" "nat" {
  count  = local.nat_gateway_count
  domain = "vpc"

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-eip-${element(local.azs, count.index)}"
  })
}

resource "aws_nat_gateway" "this" {
  count         = local.nat_gateway_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-nat-public-${count.index + 1}-${element(local.azs, count.index)}"
  })

  depends_on = [aws_internet_gateway.this]
}
