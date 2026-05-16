# Vehicle Scheduling Service Backend

## Endpoints

- `GET /health`
- `GET /api/source-data`
- `GET /api/schedule`
- `GET /api/schedule/:depotId`

## Algorithm

The service uses 0/1 knapsack dynamic programming.

- Weight = service duration
- Value = operational impact
- Capacity = mechanic hours available at the depot

Time complexity: `O(n * H)`, where `n` is number of tasks and `H` is mechanic-hour budget.
Space complexity: `O(H)` for DP values, plus selected task reconstruction data.

## Screenshots

![health](./screenshots/server_health.JPG)
![source data](./screenshots/source_data.JPG)
![schedule](./screenshots/schedule.JPG)
![schedule for depot 1](./screenshots/schedule_D1.JPG)
![schedule for depot 2](./screenshots/schedule_D2.JPG)
