provider "aws" {
  region = local.region

  default_tags {
    tags = local.tags
  }
}

terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.50.0"
    }
  }

  backend "s3" {
    bucket       = "e-serenity-tf-eu-west-3"
    key          = "serenity-ops/preprod/terraform.tfstate"
    region       = "eu-west-3"
    use_lockfile = true
    encrypt      = true
  }
}
