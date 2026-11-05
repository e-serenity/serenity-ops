resource "aws_sesv2_dedicated_ip_pool" "dedicated_pool" {
  pool_name    = "${var.name_prefix}-dedicated"
  scaling_mode = "MANAGED"
  tags         = var.tags
}

resource "aws_sesv2_configuration_set" "configuration_set" {
  configuration_set_name = "${var.name_prefix}-dedicated"

  delivery_options {
    sending_pool_name = aws_sesv2_dedicated_ip_pool.dedicated_pool.pool_name
  }

  tags = var.tags
}

resource "aws_sns_topic" "sending_reports_topic" {
  name         = "${var.name_prefix}-ses-sending-reports"
  display_name = "ses-sending-reports"
  tags         = var.tags
}

resource "aws_sesv2_configuration_set_event_destination" "sending_reports" {
  configuration_set_name = aws_sesv2_configuration_set.configuration_set.configuration_set_name
  event_destination_name = "sending-reports"

  event_destination {
    sns_destination {
      topic_arn = aws_sns_topic.sending_reports_topic.arn
    }

    enabled              = true
    matching_event_types = ["REJECT", "BOUNCE", "COMPLAINT", "DELIVERY", "RENDERING_FAILURE", "DELIVERY_DELAY"]
  }
}

resource "aws_sqs_queue" "sending_reports" {
  name                      = "${var.name_prefix}-sending-reports"
  delay_seconds             = 5
  max_message_size          = 2048
  message_retention_seconds = 7200
  receive_wait_time_seconds = 10
  sqs_managed_sse_enabled   = true
  tags                      = var.tags
}

resource "aws_sqs_queue_policy" "sqs_queue_policy" {
  queue_url = aws_sqs_queue.sending_reports.id
  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "sqspolicy"
    Statement = [
      {
        Sid       = "AllowSNSPublish"
        Effect    = "Allow"
        Principal = "*"
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.sending_reports.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.sending_reports_topic.arn
          }
        }
      }
    ]
  })
}

resource "aws_sns_topic_subscription" "sending_reports_subscription" {
  topic_arn = aws_sns_topic.sending_reports_topic.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.sending_reports.arn
}

resource "aws_dynamodb_table" "bounce" {
  name         = "${var.name_prefix}-ses-sending-reports"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "UserId"
  range_key    = "messageId"

  attribute {
    name = "UserId"
    type = "S"
  }

  attribute {
    name = "messageId"
    type = "S"
  }

  attribute {
    name = "domain"
    type = "S"
  }

  attribute {
    name = "from"
    type = "S"
  }

  attribute {
    name = "eventType"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  global_secondary_index {
    name            = "ByAgency"
    projection_type = "ALL"

    key_schema {
      attribute_name = "from"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "UserId"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "ByDomain"
    projection_type = "ALL"

    key_schema {
      attribute_name = "domain"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "UserId"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "ByEvent"
    projection_type = "ALL"

    key_schema {
      attribute_name = "eventType"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "UserId"
      key_type       = "RANGE"
    }
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}
