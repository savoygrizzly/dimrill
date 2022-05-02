# Dimrill Auth system

## Dimrill RNA (DRNA)

### General Expression

Starts with `servicename` in lowercase.
The expression must go down the logical path to the targeted function, each step being separated by `:`.
Consider the following structure:

`service:categoryOne:subCategory:functionTargeted`

Each step must start with a lowercase letter should be written in `camelCase` styled syntax. There is no limitation on the number of steps.

### Paremeters

Parameters are expressed as follow `:parameterName/parameterValue/parameterSubValue`.
There is no limitation on the number of expressed parameters sub-values.
