locals {
  name_prefix        = "${var.application}-${var.environment}"
  health_port        = 8000
  ecr_repository_url = var.create_ecr_repository ? aws_ecr_repository.this[0].repository_url : null
  ecr_tag            = coalesce(var.ecr_image_tag, var.environment)
  image              = var.create_ecr_repository ? "${local.ecr_repository_url}:${local.ecr_tag}" : var.image
  enable_hub         = var.dynamodb_table_name != ""

  create_ecs_cluster = trimspace(var.cluster_arn) == ""
  create_vpc         = local.create_ecs_cluster && var.create_vpc

  azs = length(var.availability_zones) > 0 ? var.availability_zones : [
    "${var.region}a",
    "${var.region}b",
    "${var.region}c"
  ]

  nat_gateway_count = local.create_vpc && var.enable_nat_gateway && length(var.public_subnet_cidrs) > 0 ? (
    var.single_nat_gateway ? 1 : length(var.public_subnet_cidrs)
  ) : 0

  vpc_id                  = local.create_vpc ? aws_vpc.this[0].id : (local.create_ecs_cluster ? var.existing_vpc_id : null)
  vpc_cidr_block          = local.create_vpc ? aws_vpc.this[0].cidr_block : (local.create_ecs_cluster ? data.aws_vpc.existing[0].cidr_block : null)
  public_subnet_ids       = local.create_vpc ? aws_subnet.public[*].id : []
  private_subnet_ids      = local.create_vpc ? aws_subnet.private[*].id : var.subnet_ids
  private_route_table_ids = local.create_vpc ? aws_route_table.private[*].id : var.existing_private_route_table_ids

  ecs_cluster_name           = coalesce(var.ecs_cluster_name, "${local.name_prefix}-cluster-managed")
  ecs_capacity_provider_name = coalesce(var.capacity_provider_name, "${local.name_prefix}-managed-instances")

  effective_cluster_arn            = local.create_ecs_cluster ? aws_ecs_cluster.this[0].arn : var.cluster_arn
  effective_capacity_provider_name = local.create_ecs_cluster ? aws_ecs_capacity_provider.managed_instances[0].name : var.capacity_provider_name
  effective_cluster_name = local.create_ecs_cluster ? aws_ecs_cluster.this[0].name : (
    length(split("/", var.cluster_arn)) > 1 ? element(split("/", var.cluster_arn), length(split("/", var.cluster_arn)) - 1) : var.cluster_arn
  )

  container_log_group_name = "/aws/ecs/${local.name_prefix}"
}
