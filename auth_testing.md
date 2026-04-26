# Docnode Auth Testing Playbook

## Step 1: MongoDB Verification
```
mongosh
use docnode
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify:
- bcrypt hash starts with `$2b$`
- indexes exist on users.email (unique), login_attempts.identifier, password_reset_tokens.expires_at (TTL)

## Step 2: API Testing
```
# Register
curl -c cookies.txt -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@docnode.com","password":"senha123"}'

# Login
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@docnode.com","password":"admin123"}'

# Me (with cookie)
curl -b cookies.txt http://localhost:8001/api/auth/me

# Forgot password
curl -X POST http://localhost:8001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@docnode.com"}'

# Logout
curl -b cookies.txt -X POST http://localhost:8001/api/auth/logout
```

## Step 3: Authorization & Data Isolation
- Create 2 users, ensure user A cannot read user B's documents/familiares.
- Test 401 on all protected endpoints without token.
- Test account deletion cascades and removes all user-owned data.
