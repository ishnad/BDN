---
description: "API design and implementation conventions. Applied to API route files."
applyTo: "src/api/**"
---

# API Conventions

## Route Design
- RESTful resource naming: `/api/v1/resources` (plural), `/api/v1/resources/:id`
- Use HTTP verbs correctly: GET (read), POST (create), PUT (replace), PATCH (update), DELETE

## Response Envelope
All endpoints return a consistent envelope:
```ts
// Success
{ "data": <payload>, "error": null }

// Error
{ "data": null, "error": { "code": "RESOURCE_NOT_FOUND", "message": "Human-readable message" } }
```

## HTTP Status Codes
- 200 OK, 201 Created, 204 No Content
- 400 Bad Request (validation failure), 401 Unauthorized, 403 Forbidden, 404 Not Found
- 409 Conflict (duplicate), 422 Unprocessable Entity, 500 Internal Server Error

## Security Rules
- Validate all inputs at the route layer before passing to business logic
- Never return raw database objects — map to explicit response DTOs
- Rate-limit auth endpoints (login, register, password-reset)
- Authenticate before authorizing — check identity first, permissions second
