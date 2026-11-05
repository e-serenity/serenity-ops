locals {
  name_prefix             = "${var.project_name}-${var.environment}"
  dynamodb_hub_table_name = coalesce(var.dynamodb_hub_table_name, "${local.name_prefix}-hub")
}
