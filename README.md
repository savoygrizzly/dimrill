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
For example, the wildcard in the following statement: `service:categoryOne:subCategory:*`  
Allows access to any of the subsequent steps of `categoryOne:subCategory`

If a wildcard is used as a `parameterValue` or sub-value, it will represent any subsequent value or sub-values for that parameter.
For instance: `:parameterName/*` will include all the following:

```
:parameterName/parameterValue/parameterSubValue
:parameterName/parameterValue/parameterSubValue2/parameterSubSubValue
:parameterName/parameterValue/parameterSubValue2/parameterSubSubValue1
:parameterName/parameterValue/parameterSubValue3/parameterSubSubValue1
:parameterName/parameterValue/parameterSubValue3/parameterSubSubValue2
:parameterName/parameterValue/parameterSubValue3/parameterSubSubValue3
:parameterName/parameterValue/parameterSubValue4/parameterSubSubValue1/somethingElse
```

### Using variables

In Dimrill the 3 following variables are accesible in a policy scope:

`req` Which should contain the request sent to the server.  
`user` Which should contain the data related to the user for which a resource acces is to be authentified.  
`context` Thru which the implementation can pass along some context to help authentify the request, context can be anything from a DB document to a custom object.

All variables passed to Dimrill **MUST BE JS objects** with named and accesible properties.

Variables can then be accessed in a statement using the following syntax, similarly to ES6 templates string:

`${variable:property}`

Sub-properties can be accesed using the standard dot notation.

Consider the following example:

```Javascript

const context = {
    animalName:"Truffier",
    age:2,
    race:"Wild Board",
    abilities:[
        "fast_running",
        "truffles_finding",
        "giving_cuddles"
    ],
    body:{
        eyes:"blue",
        colors:{
            main:"brown",
            stripes:"black"
        }
    }
};

/*
    With the following context object is passed to Dimrill,

    ${context:animalName} -> Truffier
    ${context:age} -> 2
    ${context:body.eyes} -> blue
    ${context:body.colors.main} -> brown
    ${context:body.colors.stripes} -> black
*/

```

There is no depth limitation on objects. However considering our example and as of **version:1.0.0**, it is currently not possible to access array elements in variables.

```Javascript
/*
    The following wouldn't work
    ${context:abilities.0} -> Error,
    ${context:abilities[0]} -> Error
*/
```
