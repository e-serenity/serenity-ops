resource "aws_vpc_endpoint" "s3" {
  count             = local.create_ecs_cluster && var.enable_s3_endpoint && length(local.private_route_table_ids) > 0 ? 1 : 0
  vpc_id            = local.vpc_id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = local.private_route_table_ids

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-s3-endpoint"
  })
}

resource "aws_security_group" "bedrock_endpoint_sg" {
  count       = local.create_ecs_cluster && var.enable_bedrock_endpoint ? 1 : 0
  name        = "${local.name_prefix}-bedrock-endpoint-sg"
  description = "Security group for Bedrock Runtime VPC Interface Endpoint"
  vpc_id      = local.vpc_id

  ingress {
    description = "Allow HTTPS traffic from the VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [local.vpc_cidr_block]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-bedrock-endpoint-sg"
  })
}

resource "aws_vpc_endpoint" "bedrock_runtime" {
  count               = local.create_ecs_cluster && var.enable_bedrock_endpoint ? 1 : 0
  vpc_id              = local.vpc_id
  service_name        = "com.amazonaws.${var.region}.bedrock-runtime"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = local.private_subnet_ids
  security_group_ids  = [aws_security_group.bedrock_endpoint_sg[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-bedrock-endpoint"
  })
}
