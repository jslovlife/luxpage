terraform {
  backend "s3" {
    bucket = "luxpage-terraform-state-231037026600"
    key    = "luxpage/poc/terraform.tfstate"
    region = "ap-southeast-1"
  }
}

