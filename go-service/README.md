# Go PDF Report Service

## Setup
```bash
cd go-service
go mod tidy
```

## Env Vars
- PORT (default 8090)
- BACKEND_BASE_URL (default http://localhost:5007)
- BACKEND_USERNAME (default admin@school-admin.com)
- BACKEND_PASSWORD (default 3OU4zn3q6Zh9)

## Run
```bash
go run main.go
```

## Endpoint
- GET /api/v1/students/:id/report
  - Example: http://localhost:8090/api/v1/students/1/report
