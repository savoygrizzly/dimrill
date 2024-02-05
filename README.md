# Dimrill

**VERSION 3.00**

Release notes

Wildcards `*` for parameters are now required to be specified as `&*`or`&*/*`. Wildcard for parameters on endpoints specified like so `files:createOrder:*`or`files:createOrder*`**are now invalid**. In order to specify any paramters for an endpoint use`files:createOrder:&*`.

## What is Dimrill, and the philosophy behind it

Dimrill is a policy based authorization platform, it doesnt replace your JWT token, nor does it replace your login logic.
What it does is help you supplement a role based authorization (eg. an `admin` role for a user that can oversee eveyrthing, a `user` that can perform certain actions and then maybe a `manager` sitting in the middle of all that).

It is intended for complex roles handling, and will allow you to define "roles" dynamically based on the ressources and action required.
Thereofre Dimrill is using something called `DRNA` as in Dynamic Ressource Naming Authority, in a way it helps you define via a schema which **Ressource** _think `GET`_ and **Action**, _think `POST`_ you need to authorize, which arguments _think `parameters` or `request.body`_ are required to be passed, and helps you define conditions for extra validation.

This is done by declaring a schema that let you define the what and the where:

```json
{
  "files": {
    "createOrder": {
      "Type": ["Ressource", "Action"],
      "Arguments": {
        "pricelist": {
          "type": "string",
          "enum": ["public", "distributor"],
          "dataFrom": "req.body.pricelist"
        },
        "currency": {
          "type": "string",
          "enum": ["EUR", "USD"],
          "dataFrom": "req.body.currency"
        }
      }
    }
  }
}
```

And a policy that lets you define who:

```json
[
  {
    "Version": "1.0",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["files:createOrder&pricelist/*"]
      }
    ]
  }
]
```

A user or entity with this policy attached will be allowed to create an order with whatever pricelist (note the wildcard after the parameter name `*`), and since no other parameters are defined, all values will be allowed (same as doing `files:createOrder&*`).

If we wanted to restrict our user or entity to only create orders with a pricelist of distributor and in USD we could change that policy to:

```json
[
  {
    "Version": "1.0",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["files:createOrder&pricelist/distributor&currency/USD"]
      }
    ]
  }
]
```

If we wished to pass `req.body` to Dimrill we could also implement a condition like so:

```json
[
  {
    "Version": "1.0",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["files:createOrder&pricelist/distributor&currency/USD"]
      }
    ],
    "Condition": {
      "StringEquals": {
        "{{req.body.pricelist}}": "distributor",
        "{{req.body.currency}}": "USD"
      }
    }
  }
]
```

This assumes `pricelist` and `currency` are within the `req.body` and that the request body content is passed to dimrill.
