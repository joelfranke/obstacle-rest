# RESTful API

## Overview
This is a RESTful-based API (nodeJS) intended to capture and track real-time event-day results of an obstacle course race submitted to the API via an iOS app. The API will capture information related to the participant's attempt on a given obstacle.

## Endpoint
[API_URL]

### POST result ([API_URL]/post-result&k={API_KEY})

#### Headers
Content-Type :  application/json

#### Body //(dataType, mandatory/optional) -- Definition
```
{
	"bibNo" : 123, //(integer, mandatory) -- Bib NUMBER of the participant read from the scanned or manually entered code
	"obstID" : 11, //integer, mandatory) -- Obstacle NUMBER being recorded; will be limited by total number of obstacles in database.
	"tier" : 2, //(integer, mandatory) -- Obstacle tier (1-3) attempted set by the app user
	"bibFromBand" : true, //(boolean, optional) -- BOOLEAN value indicating whether the bibNo was manually entered (false) or scanned (true). Currently optional. Will be updated to mandatory.
	"timestamp" : "2017-09-08T01:34:39.391Z", //(DATE, mandatory) DATE object that is automatically written to the db that indicates when an object has been updated.
	"deviceTime" : "2017-09-08T01:34:39.391Z", //(String, optional) String timestamp from the local device submitting the event result. Set to optional to facilitate testing.
	"success" : true //(boolean, mandatory) -- BOOLEAN value recording whether the obstacle try was a success (true) or a failure (false)
}
```
n.b. - an autoincrementing value "resultID" will automatically be written to the result (for all non-duplicate results).

##### Duplicate handling
An unlimited number of updates to a result that has already been submitted will be permitted within 2 minutes of the posting of the original result. The "success" and "tier" fields can be changed. No other fields can be changed.

#### Response Model/Schema
Response Class (Status 200 / 409)
```
{
    "message": "${firstName}",
		bibNo: "${bibNo}",
		obstID: "${obstID}",
		heat: "${heat}"
}
```

#### Error messages
HTTP Status Code | Reason | Response Model

400 | Something is wrong with your request. Contact xxx@xxx.xxx. | n/a

404 | The Bib number is not in the database, and the service could not resolve the POSTed request to the appropriate participant. | ```{message: "BibNo not found.", bibNo:{$bibNo}, obstID: ${obstID}}```

500 | Something went wrong with the service. Contact xxx@xxx.xxx. | n/a

### POST participant ([API_URL]/registration&k={API_KEY})

#### Headers
Content-Type :  application/json

#### Body //(dataType, mandatory/optional) -- Definition
```
{
	"_id" : "59a9734c449b2a3da64cbead", //(string, optional [mandatory for updating existing registrant]) -- db object id STRING from GET /participant response, must be passed with "bibNo" and "firstName" for an existing registrant.
	"bibNo" : 123, //(integer, mandatory) -- Bib NUMBER of the participant read from the scanned or manually entered code
	"heat": "7:30 AM", //(string, optional) -- time of heat; a heat time might be assigned, or it might be blank. In the event the participant is running with a team, this is driven by the team heat time.
	"firstName": "Joel", //(string, mandatory) -- First name of participant
  "lastName": "Franke", //(string, mandatory) -- Last name of participant
  "email": "joelfranke@gmail.com",//(string, optional) -- email address of participant. No email validation takes place, must be unique. Email is used as the key lookup for a participant.
  "teamID": "Test Team",//(string, optional) -- Team name
  "gender": "M", //(string, optional) -- gender, "M" or "F" used, but no validation takes place.
  "birthdate": "01/31/1901", // (string, optional) -- birthdate in the format MM/dd/YYYY
	"address1": "1600 Pennsylvania Ave", // (string, optional) -- house number a street name
	"address2": "Suite 100", // (string, optional) -- second address line
	"city": "Washington", // (string, optional) -- Address city
	"state": "DC" // (string, optional) -- State value. No validation done on this field.
	"zip": "20006" // (string, optional) -- Zip code. No validation done on this field.
	"phone": ""(856)555-5555" // (string, optional) -- Phone number. No validation done on this field.
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
[API_URL]/participant&k={API_KEY}
	- includes support for query parameters "lastName" or "bday"
	- ex. [API_URL]/participant?lastName=smith
	- ex. [API_URL]/participant?bday=1/31/2017
  - [API_URL]/participant?bibNo={bibNo}
	- [API_URL]/participant?onTeam={teamID}

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
            "lastName": "Smith",
						"phone": "(856)555-5555"
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
            "tier": 3
        }
    ]
}
```

##### Error messages
HTTP Status Code | Reason | Response Model

400 | Something is wrong with your request. Contact xxx@xxx.xxx. | n/a

404 | The participant with that Bib number is not in the database or there are no recorded results. | ```{message: "The Bib number you entered is not valid or there is no result recorded for that Bib number. Please check and try again."}```

500 | Something went wrong with the service. Contact xxx@xxx.xxx. | n/a

### POST Time result ([API_URL]/timing&k={API_KEY})

#### Headers
Content-Type :  application/json

#### Body //(dataType, mandatory/optional) -- Definition
```
{
	"bibNo" : 123, //(integer, mandatory) -- Bib NUMBER of the participant read from the scanned or manually entered code
	"location" : "start", //string, mandatory) -- One of "start", "finish", "rope", case sensitive
	"deviceTime" : "8:28:29 AM", //(string, mandatory) -- timestamp or elapsed time to be written to database
	"bibFromBand": true, //(boolean, optional) -- BOOLEAN value indicating whether the bibNo was manually entered (false) or scanned (true).
	// for tiebreaker
	"time": 1.05 // (number, optional) -- elapsed time (as NUMBER) for rope climb tiebreaker


}
```

### GET Scores ([API_URL]/scoring)
Supports following parameters, no token required. Only one parameter is considered (regardless of how many are passed), in this order of precedence, gender, teamScores, team, onTeam, davids, bibNo, recent, otherwise all results are sent

	- /scoring?gender={M or F for Male/Female} // Individual, returns scores for either the top 25 Males or Females
	- /scoring?teamScores=true // Team, (only true is considered, false may be passed but will be ignored); returns scores for all teams
	- /scoring?team={teamName} // Team, returns scores for a given team. An added field "rank" is passed when this parameter is passed
	- /scoring?onTeam={teamName} // Individual, returns scores for all members of a given team
	- /scoring?davids=true //  Individual, (only true is considered, false may be passed but will be ignored); returns scores for all individuals who have successfully completed the first four G3s
	- /scoring?bibNo={bibNo} // Individual, returns scores for a single individual
	- /scoring?recent=true // Individual, (only true is considered, false may be passed but will be ignored); returns scores for all individuals who have finished in the last 15 minutes since the request was made
	- scoring // all scores for all participants

#### Headers
Content-Type :  application/json

#### Body //(dataType, mandatory/optional) -- Definition
Individual
```
{
    "participantScores": [
        {
            "_id": "5af1a9210bf74a29643e2853", // db object id STRING
            "firstName": "Barry", // First name of participant
            "lastName": "Porch", // Last name of participant
            "gender": "M", // gender, "M" or "F" used, case sensitive
            "bibNo": 100, // Bib NUMBER of the participant read from the scanned or manually entered code
            "g1": 0, // NUMBER of G1s successfully completed
            "g2": 1, // NUMBER of G2s successfully completed
            "g3": 11, // NUMBER of G3s successfully completed
            "score": 58.011010000000006, // Calculated score based on number of obstacles completed * various multipliers
            "progress": "Course Complete", // or '9/12', Progress based # of obstacles completed
            "__v": 0,
            "next": 99, // NUMBER of next obstacle, 99 = course complete
            "updatedOn": "2018-05-09T13:49:03.803Z", // Timestamp of last update
            "isDavid": true, // true/false, whether the participant is a david
            "teamID": null, // Team name STRING
            "participant": "<a href='/individual/?id=100'>Porch, Barry</a>" //HTML for display of name in dashboard
        }
			]
		}

```

Team
```
{
    "teamScores": [
        {
            "_id": "5af731402736a6bbaf99a0ed",// db object id STRING
            "g1": 4, // NUMBER of G1s successfully completed
            "g2": 5, // NUMBER of G2s successfully completed
            "g3": 11,// NUMBER of G3s successfully completed
            "score": 74.02923039999999, // Calculated score based on number of obstacles completed * various multipliers for top three male and top three female.
            "onCourse": 124,//total number of participants who have not yet completed the course
            "updatedOn": "2018-05-12T19:53:30.098Z",//timestamp
            "teamID": "PPK"//team name
        }
    ]
}
```
