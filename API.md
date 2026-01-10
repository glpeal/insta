# API Documentation

Base URL: `http://localhost:3001/api`

## Authentication Endpoints

### Login
```http
POST /api/instagram/login
Content-Type: application/json

{
  "username": "your_instagram_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Успешный вход",
  "accountId": 1
}
```

### Restore Session
```http
POST /api/instagram/restore-session
Content-Type: application/json

{
  "username": "your_instagram_username"
}
```

### Check Session
```http
GET /api/instagram/check-session
```

**Response:**
```json
{
  "success": true,
  "isLoggedIn": true,
  "account": {
    "id": 1,
    "username": "username",
    "lastLogin": "2024-01-10T12:00:00Z"
  }
}
```

### Logout
```http
POST /api/instagram/logout
```

## Settings Endpoints

### Get Settings
```http
GET /api/settings
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "id": 1,
    "account_id": 1,
    "automation_enabled": true,
    "dm_template": "Привет! Спасибо за комментарий!",
    "max_dm_per_hour": 30,
    "min_delay_seconds": 10,
    "max_delay_seconds": 90,
    "updated_at": "2024-01-10T12:00:00Z"
  }
}
```

### Update Settings
```http
PUT /api/settings
Content-Type: application/json

{
  "automation_enabled": true,
  "dm_template": "Новый текст сообщения",
  "max_dm_per_hour": 40,
  "min_delay_seconds": 15,
  "max_delay_seconds": 120
}
```

## Logs Endpoints

### Get DM Logs
```http
GET /api/logs/dm?limit=100
```

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "account_id": 1,
      "recipient_username": "user123",
      "message_template": "Привет!",
      "status": "sent",
      "error_message": null,
      "sent_at": "2024-01-10T12:00:00Z",
      "created_at": "2024-01-10T11:59:00Z"
    }
  ]
}
```

### Get Tracked Comments
```http
GET /api/logs/comments
```

### Get System Logs
```http
GET /api/logs/system?limit=100
```

## Status Endpoints

### Get System Status
```http
GET /api/status
```

**Response:**
```json
{
  "success": true,
  "status": {
    "instagram": {
      "isLoggedIn": true,
      "account": {
        "id": 1,
        "username": "username",
        "lastLogin": "2024-01-10T12:00:00Z"
      }
    },
    "queue": {
      "queueLength": 5,
      "isProcessing": true,
      "isPaused": false,
      "sentThisHour": 10,
      "pendingTasks": 3,
      "failedTasks": 0
    },
    "tracker": {
      "isTracking": true,
      "postsCount": 5,
      "checkIntervalSeconds": 60
    }
  }
}
```

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-10T12:00:00Z"
}
```

## Test DM

### Send Test DM
```http
POST /api/instagram/send-test-dm
Content-Type: application/json

{
  "username": "test_user",
  "message": "Test message"
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing parameters)
- `401` - Unauthorized (not logged in)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate limited to 100 requests per 15 minutes per IP address.

## CORS

CORS is enabled for all origins in development. Configure appropriately for production.
