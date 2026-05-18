# Login Response (modified)

**Endpoint**: `POST /api/auth/login`

The login response now includes `is_platform_admin` in the user object.

**Response**:

```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin User",
    "is_platform_admin": true
  }
}
```
