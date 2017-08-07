# RESTful API

##Overview
Implementation notes

##Philosophy

##Endpoint
[API_URL]

###GET
tbc

###POST
[API_URL]/post-result

####Headers
Content-Type :  application/json

####Body//definition
```
{
	"bibNo" : 123, //(integer, mandatory) -- Bib NUMBER of the participant read from the scanned or manually entered code
	"obstID" : 11, //integer, mandatory) -- Obstacle NUMBER being recorded
	"tier" : "G2", //(string, mandatory) -- Obstacle tier attempted set by the app user
	"success" : true //(boolean, mandatory) -- BOOLEAN value recording whether the obstacle try was a success (true) or a failure (false)
}
```
Response Model/Schema
```
{
    "__v": 0,
    "bibNo": 123,
    "obstID": 7,
    "_id": "597911082af9f827a04f0084",
    "success": true,
    "tier": "G2"
}
```

##Response Codes
Response Class (Status 200)
Results were successfully posted

##Error messages
HTTP Status Code | Reason | Response Model
400
409 - what do we do if we accidentally send the wrong result?
404 - 
500 Internal Server Error - Please contact api@publons.com.


