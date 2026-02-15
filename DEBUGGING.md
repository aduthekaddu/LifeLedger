# LifeLedger Debugging Guide

Comprehensive troubleshooting and debugging guide.

## Common Issues & Solutions

### 1. Database Connection Failed

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check database exists
psql -U postgres -l | grep medsecure

# Create database if missing
psql -U postgres -c "CREATE DATABASE medsecure;"

# Test connection
psql -U postgres -d medsecure
```

**Check credentials in `backend/.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medsecure
DB_USER=postgres
DB_PASSWORD=your_password
```

### 2. JWT Token Invalid/Expired

**Symptoms:**
- "Invalid token" error
- Automatic logout
- 401 Unauthorized responses

**Solutions:**

```bash
# Clear browser localStorage
# In browser console:
localStorage.clear()

# Login again to get new token

# Check JWT_SECRET in backend/.env
# Make sure it's a long random string
```

**Verify token expiration:**
```env
JWT_EXPIRES_IN=7d  # Token valid for 7 days
```

### 3. File Upload Fails

**Symptoms:**
- "File too large" error
- "Invalid file type" error
- Upload hangs

**Solutions:**

```bash
# Check uploads directory exists
ls -la backend/uploads

# Create if missing
mkdir -p backend/uploads
chmod 755 backend/uploads

# Check file size limit in backend/.env
MAX_FILE_SIZE=10485760  # 10MB in bytes

# Check allowed types in frontend/.env.local
NEXT_PUBLIC_ALLOWED_FILE_TYPES=.pdf,.jpg,.jpeg,.png,.doc,.docx
```

**Frontend validation:**
```typescript
// Check file size before upload
if (file.size > 10485760) {
  alert('File too large. Max 10MB');
  return;
}
```

### 4. AI Insights Not Working

**Symptoms:**
- "Failed to generate insights"
- "Access denied" on AI endpoints
- No insights displayed

**Solutions:**

```bash
# Check Gemini API key
grep GEMINI_API_KEY backend/.env

# Test API key
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'

# Check backend logs for AI errors
cd backend
npm run dev
# Look for "AI analysis error" messages
```

**Check database migration:**
```bash
# Verify ai_insights column exists
psql -U postgres -d medsecure -c "\d medical_records" | grep ai_insights

# Run migration if missing
cd backend
npm run migrate:blockchain
```

**Permission issues:**
- Patient can only view their own records
- Doctor needs approved access to patient
- Check access_requests table for approved status

### 5. Blockchain Not Working

**Symptoms:**
- "Blockchain service unavailable"
- Transaction hash not saved
- Contract deployment failed

**Solutions:**

```bash
# Check Hardhat node is running
lsof -i :8545

# Start Hardhat node
cd blockchain
npx hardhat node

# Deploy contract
npm run deploy

# Copy contract address to backend/.env
CONTRACT_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
BLOCKCHAIN_RPC=http://localhost:8545
BLOCKCHAIN_ENABLED=true
```

**Verify deployment:**
```bash
# Check deployment.json exists
cat blockchain/deployment.json

# Test connection
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 6. IPFS Upload Fails

**Symptoms:**
- "IPFS service unavailable"
- "Failed to upload to IPFS"
- No IPFS CID in database

**Solutions:**

```bash
# Check IPFS daemon is running
ipfs id

# Start IPFS daemon
ipfs daemon

# Check IPFS API port
lsof -i :5001

# Test IPFS connection
curl http://localhost:5001/api/v0/version

# Verify backend configuration
grep IPFS backend/.env
```

**Backend .env settings:**
```env
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
```

### 7. Email Notifications Not Sending

**Symptoms:**
- No welcome email received
- No verification email
- SMTP errors in logs

**Solutions:**

```bash
# Check SMTP credentials
grep SMTP backend/.env

# Test email sending
cd backend
npm run test-email

# Check Gmail App Password
# Must be 16 characters, no spaces
SMTP_PASS=abcdabcdabcdabcd
```

**Gmail setup:**
1. Enable 2FA on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password (not regular password)
4. Remove any spaces from password

**Common SMTP errors:**
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
Solution: Use App Password, not regular password

Error: connect ETIMEDOUT
Solution: Check firewall, allow port 587
```

### 8. SMS Not Sending

**Symptoms:**
- No SMS received
- Twilio errors in logs

**Solutions:**

```bash
# Verify Twilio credentials
grep TWILIO backend/.env

# Check Twilio account status
# Login to https://console.twilio.com/

# Verify phone number format
TWILIO_PHONE_NUMBER=+16085576514  # Must include country code
```

**Test Twilio:**
```bash
# Use Twilio CLI
twilio phone-numbers:list
twilio api:core:messages:create \
  --from "+16085576514" \
  --to "+1234567890" \
  --body "Test message"
```

### 9. Frontend Build Errors

**Symptoms:**
- TypeScript errors
- Module not found
- Build fails

**Solutions:**

```bash
# Clear Next.js cache
cd frontend
rm -rf .next
rm -rf node_modules
npm install

# Check for TypeScript errors
npm run build

# Fix common issues
npm install --save-dev @types/node @types/react @types/react-dom

# Verify environment variables
cat .env.local
```

### 10. CORS Errors

**Symptoms:**
- "Access-Control-Allow-Origin" error
- API requests blocked in browser
- Network errors in console

**Solutions:**

```bash
# Check CORS_ORIGIN in backend/.env
CORS_ORIGIN=http://localhost:3000

# Verify frontend URL matches
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

# Check backend CORS configuration
grep -A 5 "cors(" backend/src/server.ts
```

**Backend CORS setup:**
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
```

## Debugging Tools

### Backend Debugging

**Enable debug logging:**
```env
LOG_LEVEL=debug
NODE_ENV=development
```

**View logs:**
```bash
# Real-time logs
cd backend
npm run dev

# Log file
tail -f backend/logs/app.log

# Filter errors only
grep "error" backend/logs/app.log
```

**Database queries:**
```bash
# Enable query logging in PostgreSQL
# Edit postgresql.conf:
log_statement = 'all'

# View query logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

### Frontend Debugging

**Browser DevTools:**
```javascript
// Check localStorage
console.log(localStorage.getItem('token'));
console.log(localStorage.getItem('user'));

// Check API calls
// Network tab → Filter by XHR

// Check console for errors
// Console tab → Look for red errors
```

**React DevTools:**
- Install React DevTools extension
- Inspect component props and state
- Profile performance

### Database Debugging

**Check table contents:**
```sql
-- View all users
SELECT id, email, role, patient_id FROM users;

-- View medical records
SELECT id, patient_id, title, record_type, created_at FROM medical_records;

-- View access requests
SELECT id, doctor_id, patient_id, status FROM access_requests;

-- View AI insights
SELECT id, title, ai_insights IS NOT NULL as has_insights FROM medical_records;

-- Check blockchain logs
SELECT id, record_id, blockchain_tx FROM access_logs WHERE blockchain_tx IS NOT NULL;
```

**Reset database:**
```bash
# Drop and recreate
psql -U postgres -c "DROP DATABASE medsecure;"
psql -U postgres -c "CREATE DATABASE medsecure;"

# Restart backend to reinitialize
cd backend
npm run dev
```

### Network Debugging

**Check ports:**
```bash
# Backend port
lsof -i :5000

# Frontend port
lsof -i :3000

# PostgreSQL port
lsof -i :5432

# Blockchain port
lsof -i :8545

# IPFS port
lsof -i :5001
```

**Test API endpoints:**
```bash
# Health check
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@medsecure.com","password":"Test@123456"}'

# Get records (with token)
curl http://localhost:5000/api/v1/records \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Performance Issues

### Slow Database Queries

**Check query performance:**
```sql
-- Enable timing
\timing

-- Analyze query
EXPLAIN ANALYZE SELECT * FROM medical_records WHERE patient_id = 1;

-- Check indexes
SELECT tablename, indexname FROM pg_indexes WHERE tablename = 'medical_records';
```

**Add missing indexes:**
```sql
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_access_requests_status ON access_requests(status);
```

### Slow File Uploads

**Check file size:**
```bash
# Reduce max file size if needed
MAX_FILE_SIZE=5242880  # 5MB instead of 10MB
```

**Optimize images before upload:**
- Compress images
- Convert to JPEG
- Reduce resolution

### Memory Issues

**Check memory usage:**
```bash
# Node.js memory
node --max-old-space-size=4096 src/server.ts

# System memory
free -h
top
```

## Error Messages Reference

### Backend Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Database not running | Start PostgreSQL |
| `EADDRINUSE` | Port already in use | Kill process or change port |
| `Invalid token` | JWT expired/invalid | Login again |
| `Access denied` | Permission issue | Check user role and access |
| `File too large` | Exceeds max size | Reduce file size |
| `IPFS unavailable` | IPFS not running | Start IPFS daemon |
| `Blockchain error` | Hardhat not running | Start Hardhat node |

### Frontend Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Network Error` | Backend not running | Start backend server |
| `CORS error` | Origin mismatch | Check CORS_ORIGIN setting |
| `401 Unauthorized` | Invalid/expired token | Login again |
| `404 Not Found` | Wrong API URL | Check NEXT_PUBLIC_API_URL |
| `Module not found` | Missing dependency | npm install |

## Getting Help

### Check Logs First

1. Backend logs: `backend/logs/app.log`
2. Frontend console: Browser DevTools
3. Database logs: PostgreSQL logs
4. System logs: `journalctl -u postgresql`

### Collect Debug Information

```bash
# System info
node --version
npm --version
psql --version

# Check running services
ps aux | grep node
ps aux | grep postgres
ps aux | grep ipfs

# Check environment
cat backend/.env | grep -v PASSWORD
cat frontend/.env.local
```

### Common Debug Commands

```bash
# Restart everything
pkill -f node
sudo systemctl restart postgresql
ipfs daemon &
cd blockchain && npx hardhat node &
cd backend && npm run dev &
cd frontend && npm run dev &

# Clean install
rm -rf node_modules package-lock.json
npm install

# Reset database
npm run migrate:blockchain
```
