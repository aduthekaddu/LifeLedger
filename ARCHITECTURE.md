# LifeLedger System Architecture

Complete technical architecture and design documentation.

## System Overview

LifeLedger is a secure, blockchain-enabled medical record management system with AI-powered insights.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Patient  │  │  Doctor  │  │  Admin   │  │   Auth   │   │
│  │Dashboard │  │Dashboard │  │Dashboard │  │  Pages   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ REST API
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js + Express)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │ Records  │  │  Access  │  │   AI     │   │
│  │Controller│  │Controller│  │Controller│  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Blockchain│  │   IPFS   │  │  Email   │  │   SMS    │   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↕              ↕              ↕              ↕
┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│  PostgreSQL  │ │Blockchain│ │   IPFS   │ │ Google Gemini│
│   Database   │ │  (Local) │ │  (Local) │ │      AI      │
└──────────────┘ └──────────┘ └──────────┘ └──────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: React Hooks
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT (JSON Web Tokens)
- **Encryption**: AES-256-CBC
- **File Upload**: Multer
- **Validation**: Express Validator

### Database
- **Primary**: PostgreSQL 14+
- **ORM**: pg (node-postgres)
- **Migrations**: Custom SQL scripts

### Blockchain
- **Framework**: Hardhat
- **Network**: Local Ethereum node
- **Smart Contract**: Solidity
- **Library**: ethers.js

### Storage
- **Decentralized**: IPFS (InterPlanetary File System)
- **Local Files**: File system with encryption

### AI & External Services
- **AI**: Google Gemini API (gemini-2.0-flash-exp)
- **OCR**: Tesseract.js
- **PDF Parsing**: pdf-parse
- **Email**: Nodemailer (Gmail SMTP)
- **SMS**: Twilio

## Database Schema

### Users Table
```sql
users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('patient', 'doctor', 'admin')),
  phone_number VARCHAR(20),
  date_of_birth DATE,
  address TEXT,
  emergency_contact VARCHAR(255),
  patient_id VARCHAR(20) UNIQUE,  -- Format: PT-YYYY-NNNN
  qr_code TEXT,  -- UUID for QR access
  email_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Medical Records Table
```sql
medical_records (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  record_type VARCHAR(50),
  record_date DATE NOT NULL,
  file_path TEXT,
  file_hash TEXT,
  ipfs_cid VARCHAR(100),  -- IPFS Content ID
  ai_insights TEXT,  -- JSON string of AI analysis
  blockchain_tx VARCHAR(100),  -- Blockchain transaction hash
  is_encrypted BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Access Requests Table
```sql
access_requests (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'denied', 'revoked')),
  reason TEXT,
  is_emergency BOOLEAN DEFAULT false,
  blockchain_tx VARCHAR(100),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  expires_at TIMESTAMP
)
```

### Access Logs Table
```sql
access_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  record_id INTEGER REFERENCES medical_records(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  access_type VARCHAR(20) CHECK (access_type IN ('normal', 'emergency', 'qr_code')),
  blockchain_tx VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Other Tables
- **consents**: Patient consent management
- **notifications**: In-app notifications

## Security Architecture

### Authentication Flow
1. User submits credentials
2. Backend validates against database
3. Password verified using bcrypt
4. JWT token generated with user info
5. Token sent to client
6. Client stores token in localStorage
7. Token included in Authorization header for API requests

### Data Encryption
- **At Rest**: AES-256-CBC encryption for sensitive data
- **In Transit**: HTTPS (TLS/SSL)
- **Passwords**: Bcrypt hashing with salt
- **Files**: Encrypted before storage

### Access Control
- **Role-Based Access Control (RBAC)**
  - Patient: Own records only
  - Doctor: Approved patient records
  - Admin: All records
- **Permission Checks**: Every API endpoint validates user role
- **Access Logging**: All record access logged to blockchain

## Blockchain Integration

### Smart Contract (MedicalRecordAudit.sol)
```solidity
contract MedicalRecordAudit {
  struct AccessLog {
    uint256 recordId;
    address accessor;
    string accessorRole;
    uint256 timestamp;
    string action;
  }
  
  mapping(uint256 => AccessLog[]) public recordAccessLogs;
  
  function logAccess(
    uint256 recordId,
    address accessor,
    string memory accessorRole,
    string memory action
  ) public;
  
  function getAccessLogs(uint256 recordId) 
    public view returns (AccessLog[] memory);
}
```

### Blockchain Service Flow
1. User accesses medical record
2. Backend logs access to PostgreSQL
3. Backend calls smart contract `logAccess()`
4. Transaction mined on blockchain
5. Transaction hash stored in database
6. Immutable audit trail created

## IPFS Integration

### File Storage Flow
1. User uploads medical file
2. Backend encrypts file
3. File uploaded to IPFS node
4. IPFS returns Content ID (CID)
5. CID stored in database
6. Original file optionally deleted
7. File retrieved using CID when needed

### Benefits
- Decentralized storage
- Content-addressed (tamper-proof)
- Redundancy and availability
- Reduced server storage costs

## AI Analysis System

### File Analysis Pipeline
```
Upload File → Detect Type → Extract Text → AI Analysis → Save Insights
     ↓            ↓              ↓              ↓            ↓
  Multer      MIME Type      PDF/OCR      Gemini API    PostgreSQL
```

### Text Extraction
- **PDF Files**: pdf-parse library
- **Images**: Tesseract.js OCR
- **Supported**: JPG, PNG, PDF

### AI Analysis (Google Gemini)
```typescript
Input: {
  title: string,
  description: string,
  recordType: string,
  recordDate: Date,
  extractedFileText: string
}

Output: {
  summary: string,
  concerns: string[],
  recommendations: string[],
  relatedConditions: string[]
}
```

### AI Insights Storage
- Stored as JSON in `medical_records.ai_insights`
- Cached for performance
- Regenerated on demand

## API Architecture

### RESTful Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/verify-email` - Email verification
- `GET /api/v1/auth/profile` - Get user profile

#### Medical Records
- `GET /api/v1/records` - List records
- `POST /api/v1/records` - Upload record
- `GET /api/v1/records/:id` - Get record details
- `GET /api/v1/records/:id/download` - Download file
- `PUT /api/v1/records/:id` - Update record
- `DELETE /api/v1/records/:id` - Delete record

#### AI Analysis
- `GET /api/v1/ai/insights/:recordId` - Get AI insights
- `POST /api/v1/ai/analyze/:recordId` - Generate AI analysis

#### Access Management
- `POST /api/v1/access/request` - Request access
- `GET /api/v1/access/requests` - List requests
- `PUT /api/v1/access/requests/:id` - Approve/deny request
- `GET /api/v1/access/logs` - View access logs

#### Blockchain
- `GET /api/v1/blockchain/logs/:recordId` - Get blockchain logs
- `GET /api/v1/blockchain/verify/:txHash` - Verify transaction

### Middleware Stack
1. **Helmet**: Security headers
2. **CORS**: Cross-origin resource sharing
3. **Rate Limiting**: DDoS protection
4. **Body Parser**: JSON/URL-encoded parsing
5. **Authentication**: JWT verification
6. **Error Handler**: Centralized error handling

## Notification System

### Email Notifications
- Welcome email with Patient ID
- Email verification
- Access request notifications
- Access approval/denial
- Emergency access alerts

### SMS Notifications
- Welcome SMS with Patient ID
- Access request alerts
- Emergency access alerts

### Templates
- HTML email templates with responsive design
- Gradient styling matching app theme
- HIPAA compliance footer

## File Upload System

### Configuration
- Max file size: 10MB
- Allowed types: PDF, JPG, PNG, DOC, DOCX
- Storage: Local filesystem + optional IPFS
- Encryption: AES-256 before storage

### Upload Flow
1. Client selects file
2. Frontend validates size/type
3. File sent via multipart/form-data
4. Backend validates again
5. File encrypted
6. Saved to uploads directory
7. Hash calculated (SHA-256)
8. Metadata stored in database
9. Optional: Upload to IPFS
10. Optional: Log to blockchain

## Performance Optimizations

### Frontend
- Code splitting with Next.js
- Image optimization
- Lazy loading components
- Framer Motion animations (GPU-accelerated)
- Client-side caching

### Backend
- Database connection pooling
- Query optimization with indexes
- File streaming for downloads
- Async/await for I/O operations
- Rate limiting to prevent abuse

### Database
- Indexed columns: email, patient_id, record IDs
- Foreign key constraints
- Efficient JOIN queries
- Connection pooling

## Scalability Considerations

### Horizontal Scaling
- Stateless backend (JWT tokens)
- Load balancer ready
- Database replication support
- IPFS cluster for storage

### Vertical Scaling
- Optimized queries
- Caching layer (Redis ready)
- CDN for static assets
- Database partitioning

## Monitoring & Logging

### Application Logs
- Winston logger
- Log levels: error, warn, info, debug
- File rotation
- Structured logging (JSON)

### Access Logs
- All record access logged
- Blockchain audit trail
- IP address tracking
- User agent logging

### Health Checks
- `/health` endpoint
- Database connectivity
- IPFS node status
- Blockchain node status

## Deployment Architecture

### Development
- Local PostgreSQL
- Local Hardhat blockchain
- Local IPFS node
- Hot reload (nodemon, Next.js)

### Production (Recommended)
- Managed PostgreSQL (AWS RDS, DigitalOcean)
- Private Ethereum network or testnet
- IPFS cluster or Pinata
- PM2 for process management
- Nginx reverse proxy
- SSL/TLS certificates
- Docker containers
- CI/CD pipeline

## Security Best Practices

1. **Never commit secrets** - Use .env files
2. **Validate all inputs** - Prevent injection attacks
3. **Sanitize outputs** - Prevent XSS
4. **Use HTTPS** - Encrypt data in transit
5. **Rate limiting** - Prevent brute force
6. **CORS configuration** - Restrict origins
7. **Security headers** - Helmet middleware
8. **Regular updates** - Keep dependencies current
9. **Audit logs** - Track all access
10. **Backup strategy** - Regular database backups
