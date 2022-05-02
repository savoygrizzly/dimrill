# Dimrill Auth system

## Dimrill RNA (DRNA)

### General Expression

Starts with `servicename` in lowercase.
The expression must go down the logical path to the targeted function, each step being separated by `:`, considering the following structure:

`service:categoryOne:subCategory:functionTargeted`

Each step must start with a lowercase letter should be written in `camelCase` styled syntax. There is no limitation on the number of steps.

### Parameters

Parameters are expressed as follow `:parameterName/parameterValue/parameterSubValue`.

There is no limitation on the number of expressed parameters sub-values.

The use of wildcards `*` is permitted, a wildcard will represent any combination of characters where it is placed.

For example, the wildcard in the following statement:

`service:categoryOne:subCategory:*`

Allows access to any of the subsequent steps of `categoryOne:subCategory`

If a wildcard is used as a `parameterValue` or sub-value, it will represent any subsequent value or sub-values for that parameter.
For instance: `:parameterName/*` represents:

`:parameterName/parameterValue/parameterSubValue`

or

`:parameterName/parameterValue/parameterSubValue2/parameterSubSubValue`
