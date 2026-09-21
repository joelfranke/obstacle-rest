# RESTful API

## Overview
This is a RESTful-based API (nodeJS) intended to capture and track real-time event-day results of an obstacle course race submitted to the API. The API handles four distinct domains.

1) Participant registration
2) Participant obstacle attempt results
3) Participant results and scoring aggregation
4) Race administration and operational statistics

## Documentation
Swagger documentation is available [here](docs/goliathon_swagger.yaml).

## Pre-event check
`npm run test:event:local` registers a small field, starts them, posts obstacle results, and checks individual and team scores against the local API. MongoDB must already be running at `mongodb://127.0.0.1:27017`. If no admin token is stored, the script seeds one and prints it. Dev (`npm run test:event:dev`) runs the same day and needs `API_TOKEN`. Prod (`npm run test:event:prod`) only checks that the API is up and that unauthenticated writes are rejected.

`npm run test:event:prove-node` runs the local day on Node 18 and again on a newer Node. Node 18 has to pass. On today's code the newer Node is expected to error the first time a team score is calculated. That result is reported and does not fail the command.

`npm install` installs a git hook that runs the local check with Node 20.19 or newer before `git push` to Heroku. The push is aborted if that check fails. Pushes to GitHub are not gated. Set `NODE_NEW` if that binary is not installed through nvm.
