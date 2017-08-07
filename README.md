# RESTful API

## Overview
This is a RESTful-based API (nodeJS) intended to capture and track real-time event-day results of an obstacle course race submitted to the API via an iOS app. The API will capture information related to the participant's attempt on a given obstacle.

## Endpoint
[API_URL]

### POST ([API_URL]/post-result)

#### Headers
Content-Type :  application/json

#### Body //(dataType, mandatory/optional) -- Definition
```
{
	"bibNo" : 123, //(integer, mandatory) -- Bib NUMBER of the participant read from the scanned or manually entered code
	"obstID" : 11, //integer, mandatory) -- Obstacle NUMBER being recorded; will be limited by total number of obstacles in database.
	"tier" : "G2", //(string, mandatory) -- Obstacle tier (G1-G3) attempted set by the app user
	"success" : true //(boolean, mandatory) -- BOOLEAN value recording whether the obstacle try was a success (true) or a failure (false)
}
```

#### Response Model/Schema
Response Class (Status 200)
```
{
    "message": "Result for ${firsName} ${lastName} (Bib: ${bibNo}) successfully posted."
}
```

#### Error messages
HTTP Status Code | Reason | Response Model

400 | Something is wrong with your request. Contact xxx@xxx.xxx. | n/a

409 | The result for this participant on this obstacle has already been submitted and written to the database. | ```{message: "This result has already been recorded. Contact mission control if the result is incorrect."}```

404 | The Bib number is not in the database, and the service could not resolve the POSTed request to the appropriate participant. | ```{message: "The Bib number you entered is not valid. Please check and try again."}```

500 | Something went wrong with the service. Contact xxx@xxx.xxx. | n/a


### GET (participant/result)
Data for participants or event results will be returned as one or more objects.

#### Participant
- [API_URL]/participant
- [API_URL]/participant/[bibNo]

##### Response Model/Schema

[API_URL]/participant/145

Response Class (Status 200)
```
{
    "participant": {
        "_id": "59889977734d1d32c6857d25",
        "bibNo": 145,
        "isDavid": true,
        "teamID": 111,
        "ageGroup": "F31-40",
        "age": 31,
        "firstName": "joy",
        "lastName": "franke"
    }
}
```

##### Error messages
HTTP Status Code | Reason | Response Model

400 | Something is wrong with your request. Contact xxx@xxx.xxx. | n/a

404 | The participant with that Bib number is not in the database | ```{message: "The Bib number you entered is not valid. Please check and try again."}```

500 | Something went wrong with the service. Contact xxx@xxx.xxx. | n/a

#### Results
- [API_URL]/results
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
- Ensure consistency in error/success messaging.
