module.exports = {
    // [service]
    blackeye: {
     
      
      Statement:[
        {
          Effect:"Allow",
          Action:[
              "newOrder:createOrder:distributorPrice",
              "newOrder:editDelivery",
          ],
          Ressource:[
              "newOrder:"
          ]
        },
        {
          Effect:"Allow",
          Action:[
            "blackeye:displayOrder:draft",
            "blackeye:displayOrder:order",
            "blackeye:displayOrder:proforma",
            "blackeye:displayOrder:invoice"
          ],
          Condition:{
            /*
              Conditions variables:

              Variables are adressed by prefixing them with $ and enclosing in {} like so ${}
              Variables are contained in the following objects:

              req: the request sent to the system
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
            "ToContext:AnyValue:StringStrictlyEquals":{
              "${context.organization.attached}":"${user.id}"
            }
          }
        }
      
    ],
        // [action]

        new_order: {
          //typeof object means next parameter(s) must be iterated
          type01: {}, // [action_type]
          type02: ["1", "3"], // [action_type] [action_parameter]
        },
      },
      display: {
        // [functionality]
        Conditions: [
          {
            organization_id: "organization_1",
          },
        ],
        drafts: ["type01"],
      },
      organization_1: {
        //Organization policies will be merged with the following if present
        // [functionality]
        
      },
    },
    production: {
      cheeta_id: {
        //Organization policies will be merged with the following if present
        pouring_line: {
          view_queue: "*", //typeof string == * means every object in action, iteration stops here
        },
        edit_line: ["1"], //typeof Array means all items in array are concerned
      },
    },
  };
  
  const page = {
    display: ["draft"]
    }
  };
  // blackeye:display:draft
  //