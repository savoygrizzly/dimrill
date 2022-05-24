module.exports = {
  // [service]

  Statement: [
    {
      Effect: "Allow",
      Action: [
        "newOrder:createOrder:distributorPrice",
        "newOrder:editDelivery",
      ],
      Ressource: ["newOrder:"],
    },
    {
      Effect: "Allow",
      Action: [
        "blackeye:displayOrder:draft",
        "blackeye:displayOrder:order",
        "blackeye:displayOrder:proforma",
        "blackeye:displayOrder:invoice",
      ],
      Condition: {
        /*
              Conditions variables:

              Variables are adressed by prefixing them with $ and enclosing in {} like so ${}
              Variables are contained in the following objects:

              req: the request sent to the server
              context: the object targeted by the request, for instance a database document, a database query, etc..
              user: the current user
            
            */
        /* Conditions operators
              - StringStrictlyEquals ===
              - StringEquals ==
              - StringStrictlyNotEquals !==
              - StringNotEquals !=
              - NumericEquals ==
              - NumericNotEquals !=
              - NumericLessThan <
              - NumericLessThanEquals <=
              - NumericGreaterThan <
              - NumericGreaterThanEquals >=
              - DateEquals ==
              - DateNotEquals !=
              - DateLessThan <
              - DateLessThanEquals <=
              - DateGreaterThan >
              - DateGreaterThanEquals >=
              - Bool ==
              - InArray Array.includes(value)
              
           */
        "ToContext:AnyValue:StringStrictlyEquals": {
          "${context.organization.attached}": "${user.id}",
        },
      },
    },
  ],
};
