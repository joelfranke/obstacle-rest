# RESTful API

## Overview
This is a RESTful-based API (nodeJS) intended to capture and track real-time event-day results of an obstacle course race submitted to the API via an iOS app. The API will capture information related to the participant's attempt on a given obstacle.

## Endpoint
[API_URL]

### POST result ([API_URL]/post-result)

#### Headers
Content-Type :  application/json

#### Body //(dataType, mandatory/optional) -- Definition
```
{
	"bibNo" : 123, //(integer, mandatory) -- Bib NUMBER of the participant read from the scanned or manually entered code
	"obstID" : 11, //integer, mandatory) -- Obstacle NUMBER being recorded; will be limited by total number of obstacles in database.
	"tier" : "G2", //(string, mandatory) -- Obstacle tier (G1-G3) attempted set by the app user
	"bibFromBand" : true, //(boolean, optional) -- BOOLEAN value indicating whether the bibNo was manually entered (false) or scanned (true). Currently optional. Will be updated to mandatory.
	"timestamp" : "2017-09-08T01:34:39.391Z", //(DATE, mandatory) DATE object that is automatically written to the db that indicates when an object has been updated.
	"success" : true //(boolean, mandatory) -- BOOLEAN value recording whether the obstacle try was a success (true) or a failure (false)
}
```
n.b. - an autoincrementing value "resultID" will automatically be written to the result (for all non-duplicate results).

##### Duplicate handling
An unlimited number of updates to a result that has already been submitted will be permitted within 2 minutes of the posting of the original result. The "success" and "tier" fields can be changed. No other fields can be changed.

#### Response Model/Schema
Response Class (Status 200)
```
{
    "message": "${firsName}"
}
```

#### Error messages
HTTP Status Code | Reason | Response Model

400 | Something is wrong with your request. Contact xxx@xxx.xxx. | n/a

409 | The result for this participant on this obstacle has already been submitted and written to the database. | ```{message: "This result has already been recorded. Contact mission control if the result is incorrect."}```

404 | The Bib number is not in the database, and the service could not resolve the POSTed request to the appropriate participant. | ```{message: "The Bib number you entered is not valid. Please check and try again."}```

500 | Something went wrong with the service. Contact xxx@xxx.xxx. | n/a

### POST participant ([API_URL]/registration)

#### Headers
Content-Type :  application/json

#### Body //(dataType, mandatory/optional) -- Definition
```
{
	"bibNo" : 123, //(integer, mandatory) -- Bib NUMBER of the participant read from the scanned or manually entered code
	"heat": "7:30 AM", //(string, optional) -- time of heat; a heat time might be assigned, or it might be blank. In the event the participant is running with a team, this is driven by the team heat time.
	"firstName": "Joel", //(string, mandatory) -- First name of participant
  "lastName": "Franke", //(string, mandatory) -- Last name of participant
  "email": "joelfranke@gmail.com",//(string, optional) -- email address of participant. No email validation takes place, must be unique. Email is used as the key lookup for a participant.
  "teamID": "Test Team",//(string, optional) -- Team name
  "gender": "M", //(string, optional) -- gender, "M" or "F" used, but no validation takes place.
  "birthdate": 01/31/1901, // (string, optional) -- birthdate in the format MM/dd/YYYY
	"address1": 1600 Pennsylvania Ave, // (string, optional) -- house number a street name
	"address2": Suite 100, // (string, optional) -- second address line
	"city": Washington, // (string, optional) -- Address city
	"state": DC // (string, optional) -- State value. No validation done on this field.
	"zip": 20006 // (string, optional) -- Zip code. No validation done on this field.
}
```

#### Response Model/Schema
Response Class (Status 200)
```
{
    "message": "${firstName} registered with bibNo: ${bibNo}."
}
```

#### Error messages
HTTP Status Code | Reason | Response Model

400 | Something is wrong with your request. Contact xxx@xxx.xxx. | n/a

404 | Something went wrong with the service. Contact xxx@xxx.xxx. | n/a

500 | Something went wrong with the service. Contact xxx@xxx.xxx. | n/a



### GET (participant/result)
Data for participants or event results will be returned as one or more objects.

#### Participant
- [API_URL]/participant
	- includes support for query parameters "lastName" or "bday"
	- ex. [API_URL]/participant?lastName=smith
	- ex. [API_URL]/participant?bday=1/31/2017
- [API_URL]/participant/[bibNo]

##### Response Model/Schema

[API_URL]/participant*

Response Class (Status 200)
```
{
    "participants": [
        {
            "_id": "59a9734c449b2a3da64cba48",
            "bibNo": 102,
            "age": 21,
            "isDavid": true,
            "gender": "M",
            "teamID": "Team Name",
            "ageGroup": null,
            "zip": 08080,
            "state": NJ,
            "city": Sewell,
            "address2": null,
            "address1": null,
            "birthdate": 1/31/2017,
            "heat": "7:30 AM",
            "email": "email@gmail.com",
            "firstName": "John",
            "lastName": "Smith"
        }
    ]
}
```

##### Error messages
HTTP Status Code | Reason | Response Model

400 | Something is wrong with your request. Contact xxx@xxx.xxx. | n/a

404 | The participant with that Bib number is not in the database | ```{message: "The Bib number you entered is not valid. Please check and try again."}```

500 | Something went wrong with the service. Contact xxx@xxx.xxx. | n/a

#### Results
- [API_URL]/results
- [API_URL]/results?d=n (where the api will return all events with an resultID greater than n)
- [API_URL]/results/[bibNo]

##### Response Model/Schema

[API_URL]/results/145

Response Class (Status 200)
```
{
    "results": [
        {
            "_id": "5988b2daeb9d5600119ec91a",
            "bibNo": 145,
            "obstID": 1,
						"resultID": 44,
            "__v": 0,
            "success": true,
            "tier": "G3"
        }
    ]
}
```

##### Error messages
HTTP Status Code | Reason | Response Model

400 | Something is wrong with your request. Contact xxx@xxx.xxx. | n/a

404 | The participant with that Bib number is not in the database or there are no recorded results. | ```{message: "The Bib number you entered is not valid or there is no result recorded for that Bib number. Please check and try again."}```

500 | Something went wrong with the service. Contact xxx@xxx.xxx. | n/a

## To-do
- Add location based information as context token to validate API request.
- Include validation to ensure only MAX(*n*) obstacle ids can be submitted.
