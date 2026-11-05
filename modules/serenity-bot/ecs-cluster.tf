resource "aws_ecs_cluster" "this" {
  count = local.create_ecs_cluster ? 1 : 0
  name  = local.ecs_cluster_name

  setting {
    name  = "containerInsights"
    value = var.ecs_container_insights
  }

  tags = merge(var.tags, {
    Name = local.ecs_cluster_name
  })
}

resource "aws_ecs_cluster_capacity_providers" "this" {
  count        = local.create_ecs_cluster ? 1 : 0
  cluster_name = aws_ecs_cluster.this[0].name

  capacity_providers = [
    aws_ecs_capacity_provider.managed_instances[0].name
  ]

  default_capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.managed_instances[0].name
    base              = 1
    weight            = 100
  }

  depends_on = [
    aws_ecs_capacity_provider.managed_instances
  ]
}

resource "aws_ecs_capacity_provider" "managed_instances" {
  count   = local.create_ecs_cluster ? 1 : 0
  name    = local.ecs_capacity_provider_name
  cluster = aws_ecs_cluster.this[0].name

  managed_instances_provider {
    infrastructure_role_arn = aws_iam_role.ecs_infra[0].arn
    propagate_tags          = "CAPACITY_PROVIDER"

    instance_launch_template {
      ec2_instance_profile_arn = aws_iam_instance_profile.ecs_instance[0].arn
      monitoring               = "DETAILED"

      network_configuration {
        subnets         = local.private_subnet_ids
        security_groups = [aws_security_group.ecs_managed[0].id]
      }

      instance_requirements {
        memory_mib {
          min = var.ecs_instance_min_memory_mib
        }

        vcpu_count {
          min = var.ecs_instance_min_vcpu
        }

        burstable_performance  = var.ecs_burstable_performance
        allowed_instance_types = var.ecs_allowed_instance_types
      }
    }
  }

  tags = var.tags

  depends_on = [
    aws_iam_role_policy_attachment.ecs_infra_managed,
    aws_iam_role_policy_attachment.ecs_infra_pass_role,
    aws_iam_role_policy_attachment.ecs_instance_agent,
  ]
}

resource "aws_security_group" "ecs_managed" {
  count       = local.create_ecs_cluster ? 1 : 0
  name_prefix = "${local.name_prefix}-ecs-managed-"
  description = "Network traffic control for Serenity-Bot ECS Managed Instances"
  vpc_id      = local.vpc_id

  egress {
    description = "Allow all outbound traffic for container image pulls and API calls"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${local.name_prefix}-ecs-managed-sg"
  })
}

data "aws_iam_policy_document" "ecs_infra_assume" {
  count = local.create_ecs_cluster ? 1 : 0

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_infra" {
  count              = local.create_ecs_cluster ? 1 : 0
  name_prefix        = "${local.name_prefix}-ecs-infra-"
  assume_role_policy = data.aws_iam_policy_document.ecs_infra_assume[0].json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_infra_managed" {
  count      = local.create_ecs_cluster ? 1 : 0
  role       = aws_iam_role.ecs_infra[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonECSInfrastructureRolePolicyForManagedInstances"
}

data "aws_iam_policy_document" "ecs_infra_pass_role" {
  count = local.create_ecs_cluster ? 1 : 0

  statement {
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.ecs_instance[0].arn]

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "ecs_infra_pass_role" {
  count       = local.create_ecs_cluster ? 1 : 0
  name_prefix = "${local.name_prefix}-ecs-passrole-"
  description = "Allows ECS service to pass the instance role to underlying EC2 instances"
  policy      = data.aws_iam_policy_document.ecs_infra_pass_role[0].json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_infra_pass_role" {
  count      = local.create_ecs_cluster ? 1 : 0
  role       = aws_iam_role.ecs_infra[0].name
  policy_arn = aws_iam_policy.ecs_infra_pass_role[0].arn
}

data "aws_iam_policy_document" "ec2_instance_assume" {
  count = local.create_ecs_cluster ? 1 : 0

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_instance" {
  count              = local.create_ecs_cluster ? 1 : 0
  name_prefix        = "${local.name_prefix}-ecs-inst-"
  assume_role_policy = data.aws_iam_policy_document.ec2_instance_assume[0].json

  tags = var.tags
}

resource "aws_iam_instance_profile" "ecs_instance" {
  count       = local.create_ecs_cluster ? 1 : 0
  name_prefix = "${local.name_prefix}-ecs-inst-profile-"
  role        = aws_iam_role.ecs_instance[0].name

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_instance_agent" {
  count      = local.create_ecs_cluster ? 1 : 0
  role       = aws_iam_role.ecs_instance[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonECSInstanceRolePolicyForManagedInstances"
}

resource "aws_iam_role_policy_attachment" "ecs_instance_ssm" {
  count      = local.create_ecs_cluster ? 1 : 0
  role       = aws_iam_role.ecs_instance[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ecs_instance_cloudwatch" {
  count      = local.create_ecs_cluster ? 1 : 0
  role       = aws_iam_role.ecs_instance[0].name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}
