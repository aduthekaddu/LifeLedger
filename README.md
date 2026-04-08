# LifeLedger - Medical Record Management System

A secure, role-based medical record management system with blockchain integration and IPFS storage.

## Features

### Patient Features
- View all medical records
- Upload medical records
- Approve/disapprove doctor access requests
- View access audit trail
- Manage consent for data sharing
- Generate emergency access QR code
- Revoke access permissions
- View consent statistics

### Doctor Features
- Upload medical records for patients
- Access patient records (with permission)
- Search patients by ID
- Emergency QR code access
- View patient list
- Request emergency access with reason
- Add records with attachments

### Admin Features
- Add/remove doctors
- View all doctors
- Dashboard statistics
- Monitor system activity
- Manage user accounts
- System-wide audit logs

### Security Features
- JWT-based authentication
- Role-based access control (RBAC)
- End-to-end encryption (AES-256)
- Two-factor authentication ready
- Complete audit logging
- Blockchain integration (Hyperledger Fabric)
- IPFS for decentralized file storage

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL database
- Hyperledger Fabric blockchain
- IPFS for file storage
- JWT authentication
- Winston logging
- bcryptjs for password hashing

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Axios for API calls
- Hero Icons
- React Hook Form

## Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for quick setup instructions.

**Test Accounts:** The system automatically creates test accounts on first run:
- Admin: `admin@lifeledger.com` / `Test@123456`
- Doctor: `aditya.singh@lifeledger.com` / `Test@123456`
- Patient: `patient@lifeledger.com` / `Test@123456`

See [TEST_ACCOUNTS.md](./TEST_ACCOUNTS.md) for detailed testing workflows.

## Project Structure

```
medsecure/
├── backend/          # Express API server
├── frontend/         # Next.js application
├── blockchain/       # Hyperledger Fabric network
├── SETUP.md         # Detailed setup instructions
└── README.md        # This file
```

## License

MIT License - See LICENSE file for details

## Security & Compliance

This system is designed with HIPAA compliance in mind:
- Encrypted data storage
- Audit logging
- Access controls
- Secure authentication
- Data backup and recovery

**Note:** Full HIPAA compliance requires additional operational procedures, security assessments, and legal review beyond the technical implementation.
