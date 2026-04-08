# LifeLedger User Flows

Complete user workflows and feature documentation.

## User Roles

### Patient
- Upload and manage own medical records
- Grant/revoke doctor access
- View AI insights on records
- Download records
- Receive notifications

### Doctor
- Search for patients
- Request access to patient records
- View approved patient records
- Upload records for patients
- View AI insights
- Emergency access (with logging)

### Admin
- Manage all users
- Create doctor accounts
- View system statistics
- Access all records
- Monitor access logs

## Authentication Flows

### 1. Patient Registration

```
User → Registration Page
  ↓
Enter Details:
  - Email
  - Password (min 8 chars, uppercase, lowercase, number, special)
  - First Name
  - Last Name
  - Phone Number
  - Date of Birth
  - Address
  - Emergency Contact
  ↓
Submit Form
  ↓
Backend:
  - Validate input
  - Hash password (bcrypt)
  - Generate Patient ID (PT-YYYY-NNNN)
  - Generate QR code (UUID)
  - Generate verification token
  - Send welcome email with Patient ID
  - Send welcome SMS with Patient ID
  - Send verification email
  ↓
Success → Redirect to Login
  ↓
User checks email
  ↓
Click verification link
  ↓
Email verified → Can login
```

**Patient ID Format:**
- `PT-2024-0001` (PT = Patient, Year, Sequential Number)
- Unique identifier for each patient
- Used for QR code access

### 2. Login Flow

```
User → Login Page
  ↓
Enter Credentials:
  - Email
  - Password
  ↓
Submit
  ↓
Backend:
  - Find user by email
  - Verify password (bcrypt)
  - Check email_verified = true
  - Check is_active = true
  - Generate JWT token
  - Return token + user data
  ↓
Frontend:
  - Store token in localStorage
  - Store user data in localStorage
  - Redirect to dashboard based on role:
    * Patient → /patient/dashboard
    * Doctor → /doctor/dashboard
    * Admin → /admin/dashboard
```

**JWT Token Contains:**
```json
{
  "id": 1,
  "email": "patient@lifeledger.com",
  "role": "patient",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Patient Workflows

### 1. Upload Medical Record

```
Patient Dashboard → My Records → Upload Record
  ↓
Fill Form:
  - Title (required)
  - Record Type (dropdown)
  - Date (required)
  - Description (optional)
  - Attach File (PDF, JPG, PNG, DOC, DOCX, max 10MB)
  ↓
Submit
  ↓
Backend:
  - Validate file type and size
  - Encrypt file (AES-256)
  - Save to uploads directory
  - Calculate file hash (SHA-256)
  - Extract text from file:
    * PDF → pdf-parse
    * Image → Tesseract OCR
  - Upload to IPFS (if enabled)
  - Generate AI insights (Google Gemini)
  - Log to blockchain (if enabled)
  - Save metadata to database
  ↓
Success → Record appears in list
  ↓
Patient can:
  - View file
  - Download file
  - View AI insights
  - Delete record
```

**Record Types:**
- General
- Lab Results
- Prescription
- X-Ray
- MRI
- CT Scan
- Vaccination
- Other

### 2. View AI Insights

```
Patient → My Records → Select Record → AI Insights Button
  ↓
Two Options:
  1. View AI Insights (fetch existing)
  2. Generate AI Analysis (create new)
  ↓
If "View AI Insights":
  - Fetch from database
  - Display if exists
  - Show message if not available
  ↓
If "Generate AI Analysis":
  - Extract text from file (OCR/PDF)
  - Send to Google Gemini API
  - Analyze medical content
  - Save insights to database
  - Display results
  ↓
AI Insights Display:
  - Summary (overview of findings)
  - Concerns (yellow alerts)
  - Recommendations (green suggestions)
  - Related Conditions (purple tags)
  - Disclaimer (not medical advice)
```

**AI Analysis Process:**
```
File Upload
  ↓
Text Extraction
  ↓
Gemini API Call
  ↓
Parse Response
  ↓
Save to Database (ai_insights column)
  ↓
Display to User
```

### 3. Manage Doctor Access

```
Patient → Access Management
  ↓
View Pending Requests:
  - Doctor name
  - Reason for access
  - Request date
  - Emergency flag
  ↓
Actions:
  - Approve → Doctor gets access
  - Deny → Request rejected
  ↓
View Active Access:
  - List of doctors with access
  - Revoke button
  ↓
Revoke Access:
  - Confirm action
  - Access removed immediately
  - Doctor notified
```

### 4. QR Code Access

```
Patient → Profile → View QR Code
  ↓
QR Code displays UUID string
  ↓
Emergency Scenario:
  - Patient unconscious
  - Doctor scans QR code
  - Gets UUID string
  ↓
Doctor → Emergency Access → Enter UUID
  ↓
Backend:
  - Find patient by QR code
  - Grant temporary access
  - Log to blockchain
  - Send notification to patient
  - Send SMS alert
  ↓
Doctor can view records
  ↓
Access logged for audit
```

## Doctor Workflows

### 1. Search for Patient

```
Doctor Dashboard → Search Patients
  ↓
Enter Search:
  - Patient ID (PT-YYYY-NNNN)
  - Email
  - Name
  ↓
Submit
  ↓
Backend:
  - Search users table
  - Filter by role = 'patient'
  - Return matching results
  ↓
Results Display:
  - Patient name
  - Patient ID
  - Email
  - Request Access button
```

### 2. Request Access to Records

```
Doctor → Search → Select Patient → Request Access
  ↓
Fill Form:
  - Reason for access (required)
  - Emergency checkbox
  ↓
Submit
  ↓
Backend:
  - Create access_request record
  - Status = 'pending'
  - Send email to patient
  - Send SMS to patient
  - Log to blockchain (if enabled)
  ↓
Patient receives notification
  ↓
Patient approves/denies
  ↓
Doctor receives notification
  ↓
If approved:
  - Doctor can view records
  - Access logged
```

### 3. View Patient Records

```
Doctor → My Patients → Select Patient
  ↓
View Patient Info:
  - Name
  - Patient ID
  - Contact info
  ↓
View Medical Records:
  - List of all records
  - Sorted by date
  ↓
For each record:
  - View file
  - Download file
  - View AI insights
  ↓
All access logged to:
  - access_logs table
  - Blockchain (if enabled)
```

### 4. Upload Record for Patient

```
Doctor → Upload Record
  ↓
Select Patient (from approved list)
  ↓
Fill Form:
  - Title
  - Record Type
  - Date
  - Description
  - Attach File
  ↓
Submit
  ↓
Backend:
  - Same process as patient upload
  - doctor_id field set
  - Patient notified
  ↓
Record appears in patient's list
```

### 5. Emergency Access

```
Emergency Situation
  ↓
Doctor → Emergency Access
  ↓
Enter Patient QR Code (UUID)
  ↓
Backend:
  - Find patient by qr_code
  - Grant immediate access
  - Set access_type = 'emergency'
  - Log to blockchain
  - Send SMS alert to patient
  - Send email alert to patient
  ↓
Doctor can view all records
  ↓
Access expires after 24 hours
  ↓
Full audit trail maintained
```

## Admin Workflows

### 1. Create Doctor Account

```
Admin Dashboard → User Management → Create Doctor
  ↓
Fill Form:
  - Email
  - Password
  - First Name
  - Last Name
  - Phone Number
  - Specialization
  ↓
Submit
  ↓
Backend:
  - Create user with role = 'doctor'
  - Hash password
  - Send welcome email
  - Send credentials
  ↓
Doctor can login
```

### 2. View System Statistics

```
Admin Dashboard
  ↓
Statistics Display:
  - Total Users (by role)
  - Total Records
  - Pending Access Requests
  - Recent Activity
  - Storage Usage
  - Blockchain Transactions
  - IPFS Files
```

### 3. Monitor Access Logs

```
Admin → Access Logs
  ↓
View All Access:
  - User who accessed
  - Patient accessed
  - Record accessed
  - Timestamp
  - IP address
  - Access type (normal/emergency/qr_code)
  - Blockchain transaction hash
  ↓
Filter by:
  - Date range
  - User
  - Patient
  - Access type
  ↓
Export logs (CSV)
```

## Advanced Features

### 1. Blockchain Audit Trail

```
Any Record Access
  ↓
Backend logs to PostgreSQL
  ↓
Call Smart Contract:
  logAccess(recordId, accessor, role, action)
  ↓
Transaction mined on blockchain
  ↓
Transaction hash returned
  ↓
Hash saved in database
  ↓
Immutable audit trail created
  ↓
View Blockchain Logs:
  - GET /api/v1/blockchain/logs/:recordId
  - Returns all access events
  - Verifiable on blockchain
```

**Smart Contract Events:**
- Record viewed
- Record downloaded
- Record uploaded
- Access granted
- Access revoked
- Emergency access

### 2. IPFS Decentralized Storage

```
File Upload
  ↓
Encrypt file locally
  ↓
Upload to IPFS node
  ↓
IPFS returns CID (Content ID)
  ↓
CID saved in database
  ↓
Original file optionally deleted
  ↓
File Retrieval:
  - Fetch from IPFS using CID
  - Decrypt file
  - Stream to user
  ↓
Benefits:
  - Decentralized
  - Tamper-proof
  - Redundant
  - Cost-effective
```

### 3. AI Medical Analysis

```
Record with File
  ↓
Text Extraction:
  - PDF: pdf-parse library
  - Image: Tesseract.js OCR
  ↓
Extracted text sent to Gemini API
  ↓
Prompt:
  "Analyze this medical record and provide:
   - Summary
   - Concerns
   - Recommendations
   - Related conditions"
  ↓
Gemini processes medical content
  ↓
Returns structured JSON
  ↓
Saved to database (ai_insights column)
  ↓
Displayed in UI with:
  - Color-coded sections
  - Icons
  - Animations
  - Disclaimer
```

**AI Capabilities:**
- Identify abnormal values
- Suggest follow-up tests
- Detect patterns
- Recommend specialists
- Flag urgent concerns

### 4. Email & SMS Notifications

**Email Notifications:**
- Welcome email (with Patient ID)
- Email verification
- Access request received
- Access request approved/denied
- Emergency access alert
- Record uploaded by doctor

**SMS Notifications:**
- Welcome SMS (with Patient ID)
- Access request alert
- Emergency access alert

**Email Template Features:**
- Responsive HTML design
- Gradient styling
- Brand colors
- HIPAA compliance footer
- Unsubscribe link

## Security Workflows

### 1. Data Encryption

```
Sensitive Data
  ↓
AES-256-CBC Encryption
  ↓
Encrypted data stored
  ↓
Retrieval:
  - Fetch encrypted data
  - Decrypt with key
  - Return to authorized user
```

**Encrypted Fields:**
- Medical record descriptions
- File contents
- Personal information

### 2. Access Control

```
API Request
  ↓
Extract JWT token from header
  ↓
Verify token signature
  ↓
Check token expiration
  ↓
Extract user info (id, role)
  ↓
Check permissions:
  - Patient: Own records only
  - Doctor: Approved access only
  - Admin: All records
  ↓
If authorized: Process request
If not: Return 403 Forbidden
```

### 3. Audit Logging

```
Every Record Access
  ↓
Log to access_logs table:
  - user_id
  - patient_id
  - record_id
  - action
  - ip_address
  - user_agent
  - access_type
  - timestamp
  ↓
Log to blockchain (if enabled)
  ↓
Immutable audit trail
  ↓
Compliance reporting
```

## Mobile Responsiveness

All pages are fully responsive:
- Desktop: Full layout with sidebar
- Tablet: Collapsible sidebar
- Mobile: Drawer menu, stacked layout

**Breakpoints:**
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

## Notification System

### In-App Notifications
```
Event occurs
  ↓
Create notification in database
  ↓
Real-time update (polling/websocket)
  ↓
Badge count updates
  ↓
User clicks notification
  ↓
Mark as read
  ↓
Navigate to relevant page
```

### Email Notifications
```
Event occurs
  ↓
Generate HTML email from template
  ↓
Send via Nodemailer (Gmail SMTP)
  ↓
Log success/failure
  ↓
Retry on failure (3 attempts)
```

### SMS Notifications
```
Event occurs
  ↓
Format SMS message
  ↓
Send via Twilio API
  ↓
Log success/failure
  ↓
Retry on failure (3 attempts)
```

## Error Handling

### Frontend
```
API Call
  ↓
Try/Catch block
  ↓
If error:
  - Display user-friendly message
  - Log to console
  - Show retry option
  ↓
If success:
  - Update UI
  - Show success message
```

### Backend
```
Request received
  ↓
Validate input
  ↓
Try/Catch block
  ↓
If error:
  - Log error details
  - Return appropriate status code
  - Return error message
  ↓
If success:
  - Return data
  - Log success
```

## Performance Optimization

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Caching
- Debouncing search

### Backend
- Database connection pooling
- Query optimization
- File streaming
- Async operations
- Rate limiting

## Compliance & Privacy

### HIPAA Compliance
- Encryption at rest and in transit
- Access logging
- Audit trails
- User authentication
- Role-based access control
- Data backup
- Breach notification

### GDPR Compliance
- User consent
- Right to access
- Right to deletion
- Data portability
- Privacy policy
- Cookie consent

## Future Enhancements

1. **Real-time Notifications** - WebSocket integration
2. **Mobile App** - React Native version
3. **Telemedicine** - Video consultations
4. **Appointment Scheduling** - Calendar integration
5. **Prescription Management** - E-prescriptions
6. **Lab Integration** - Direct lab result import
7. **Wearable Integration** - Fitness tracker data
8. **Multi-language Support** - i18n
9. **Advanced Analytics** - Health trends
10. **Insurance Integration** - Claims processing
