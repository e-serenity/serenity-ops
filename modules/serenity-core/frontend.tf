data "aws_caller_identity" "current" {}

locals {
  enable_ip_filter      = var.enable_dashboard && length(var.dashboard_allowed_ips) > 0
  has_ipv6_allowed      = anytrue([for ip in var.dashboard_allowed_ips : strcontains(ip, ":")])
  dashboard_bucket_name = "${local.name_prefix}-dashboard-${data.aws_caller_identity.current.account_id}"

  mime_types = {
    "html" = "text/html; charset=utf-8"
    "css"  = "text/css; charset=utf-8"
    "js"   = "application/javascript; charset=utf-8"
    "json" = "application/json; charset=utf-8"
    "svg"  = "image/svg+xml"
    "png"  = "image/png"
    "ico"  = "image/x-icon"
    "txt"  = "text/plain; charset=utf-8"
  }

  dashboard_files = var.enable_dashboard ? fileset("${path.module}/front/output", "**/*") : toset([])
}

resource "aws_s3_bucket" "dashboard" {
  count         = var.enable_dashboard ? 1 : 0
  bucket        = local.dashboard_bucket_name
  force_destroy = true

  tags = merge(var.tags, {
    Name = local.dashboard_bucket_name
  })
}

resource "aws_s3_bucket_public_access_block" "dashboard" {
  count                   = var.enable_dashboard ? 1 : 0
  bucket                  = aws_s3_bucket.dashboard[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "dashboard" {
  count  = var.enable_dashboard ? 1 : 0
  bucket = aws_s3_bucket.dashboard[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_object" "dashboard_assets" {
  for_each = local.dashboard_files

  bucket = aws_s3_bucket.dashboard[0].id
  key    = each.value
  source = "${path.module}/front/output/${each.value}"
  etag   = filemd5("${path.module}/front/output/${each.value}")

  content_type = lookup(
    local.mime_types,
    reverse(split(".", each.value))[0],
    "application/octet-stream"
  )
}

resource "aws_cloudfront_origin_access_control" "dashboard" {
  count                             = var.enable_dashboard ? 1 : 0
  name                              = "${local.name_prefix}-dashboard-oac"
  description                       = "OAC for Serenity-Ops Web Dashboard S3 Bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "dashboard_ip_filter" {
  count   = local.enable_ip_filter ? 1 : 0
  name    = "${local.name_prefix}-ip-filter"
  runtime = "cloudfront-js-2.0"
  comment = "Restricts access to Serenity-Ops Dashboard by source IP / CIDR"
  publish = true

  code = <<-EOT
    const ALLOWED_LIST = ${jsonencode(var.dashboard_allowed_ips)};

    function ipToLong(ip) {
      const parts = ip.split('.');
      if (parts.length !== 4) return null;
      return ((parseInt(parts[0], 10) << 24) |
              (parseInt(parts[1], 10) << 16) |
              (parseInt(parts[2], 10) << 8) |
               parseInt(parts[3], 10)) >>> 0;
    }

    function isIpv6Match(clientIp, entry) {
      const c = clientIp.toLowerCase();
      const e = entry.toLowerCase();
      if (e.indexOf('/') === -1) {
        return c === e;
      }
      const parts = e.split('/');
      const prefix = parts[0].replace(/::$/, '');
      return c === parts[0] || c.indexOf(prefix + ':') === 0;
    }

    function isIpAllowed(clientIp) {
      const isClientV6 = clientIp.indexOf(':') !== -1;
      const clientLong = isClientV6 ? null : ipToLong(clientIp);
      for (let i = 0; i < ALLOWED_LIST.length; i++) {
        const entry = ALLOWED_LIST[i].trim();
        const isEntryV6 = entry.indexOf(':') !== -1;
        if (isClientV6 && isEntryV6) {
          if (isIpv6Match(clientIp, entry)) return true;
        } else if (!isClientV6 && !isEntryV6) {
          if (entry.indexOf('/') === -1) {
            if (clientIp === entry) return true;
          } else {
            const split = entry.split('/');
            const rangeIp = split[0];
            const bits = parseInt(split[1], 10);
            if (bits === 32 && clientIp === rangeIp) return true;
            if (clientLong !== null) {
              const rangeLong = ipToLong(rangeIp);
              const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
              if ((clientLong & mask) === (rangeLong & mask)) return true;
            }
          }
        }
      }
      return false;
    }

    function handler(event) {
      const clientIp = event.viewer.ip;
      if (!isIpAllowed(clientIp)) {
        return {
          statusCode: 403,
          statusDescription: 'Forbidden',
          headers: {
            'content-type': { value: 'text/plain; charset=utf-8' }
          },
          body: '403 Forbidden - Access restricted by IP policy (Serenity-Ops)'
        };
      }
      return event.request;
    }
  EOT
}

resource "aws_cloudfront_distribution" "dashboard" {
  count               = var.enable_dashboard ? 1 : 0
  enabled             = true
  is_ipv6_enabled     = !local.enable_ip_filter || local.has_ipv6_allowed
  comment             = "Serenity-Ops Web Dashboard (${local.name_prefix})"
  default_root_object = "index.html"
  price_class         = var.dashboard_price_class

  origin {
    domain_name              = aws_s3_bucket.dashboard[0].bucket_regional_domain_name
    origin_id                = "s3-dashboard"
    origin_access_control_id = aws_cloudfront_origin_access_control.dashboard[0].id
  }

  origin {
    domain_name = replace(replace(aws_lambda_function_url.dashboard_api[0].function_url, "https://", ""), "/", "")
    origin_id   = "lambda-api"

    custom_header {
      name  = "x-serenity-origin-secret"
      value = random_password.api_origin_secret[0].result
    }

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "lambda-api"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"

    dynamic "function_association" {
      for_each = local.enable_ip_filter ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.dashboard_ip_filter[0].arn
      }
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-dashboard"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    dynamic "function_association" {
      for_each = local.enable_ip_filter ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.dashboard_ip_filter[0].arn
      }
    }
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-dashboard-cdn"
  })
}

resource "aws_s3_bucket_policy" "dashboard" {
  count  = var.enable_dashboard ? 1 : 0
  bucket = aws_s3_bucket.dashboard[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.dashboard[0].arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.dashboard[0].arn
          }
        }
      }
    ]
  })
}
