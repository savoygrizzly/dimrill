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
      "Type": ["Ressource"],
      "Arguments": {
        "pricelist": {
          "type": "string",
          "enum": ["public", "distributor"],
          "dataFrom": "req.body.pricelist"
        }
      },
      "Condition": {
        "Enforce": {
          "ToQuery:InArray": {
            "organizations": "user:organizations"
          }
        },
        "Operators": ["StringEquals", "InArray"],
        "ContextOperators": ["InArray"]
      },
      "Variables": {
        "type": "object",
        "properties": {
          "req": {
            "type": "object",
            "properties": {
              "body": {
                "type": "object",
                "properties": {
                  "currency": {
                    "type": "string"
                  },
                  "pricelist": {
                    "type": "number"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```
