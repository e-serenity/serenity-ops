resource "aws_dynamodb_table" "hub" {
  count        = var.enable_dynamodb_hub ? 1 : 0
  name         = local.dynamodb_hub_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = var.dynamodb_enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = local.dynamodb_hub_table_name
  })
}

resource "aws_dynamodb_table_item" "core_registration" {
  count      = var.enable_dynamodb_hub ? 1 : 0
  table_name = aws_dynamodb_table.hub[0].name
  hash_key   = aws_dynamodb_table.hub[0].hash_key
  range_key  = aws_dynamodb_table.hub[0].range_key

  item = jsonencode({
    PK          = { S = "SERENITY#MODULES" }
    SK          = { S = "MOD#serenity-core" }
    name        = { S = "serenity-core" }
    status      = { S = "ACTIVE" }
    environment = { S = var.environment }
    version     = { S = "1.0.0" }
  })
}
