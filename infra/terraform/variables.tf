variable "region" {
  type    = string
  default = "ap-southeast-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "name_tag" {
  type    = string
  default = "luxpage-poc"
}

variable "key_name" {
  type    = string
  default = "luxpage-key"
}

variable "security_group_id" {
  type    = string
  default = "sg-038fefd5de9c11e6e"
}

variable "idle_minutes" {
  type    = number
  default = 60
}

variable "idle_cpu_threshold" {
  type    = number
  default = 2
}

variable "idle_network_bytes_threshold" {
  type    = number
  default = 1000000
}

