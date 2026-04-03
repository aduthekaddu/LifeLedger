# LifeLedger – Viva Questions & Blockchain Implementation Guide

This document covers potential viva (oral examination) questions about the LifeLedger project and a detailed explanation of how blockchain is implemented within the system.

---

## Table of Contents

1. [Project Overview Questions](#1-project-overview-questions)
2. [Blockchain Implementation Questions](#2-blockchain-implementation-questions)
3. [Smart Contract Questions](#3-smart-contract-questions)
4. [Backend Architecture Questions](#4-backend-architecture-questions)
5. [Database & Data Flow Questions](#5-database--data-flow-questions)
6. [Security & Encryption Questions](#6-security--encryption-questions)
7. [IPFS & Decentralized Storage Questions](#7-ipfs--decentralized-storage-questions)
8. [Frontend & User Roles Questions](#8-frontend--user-roles-questions)
9. [AI Integration Questions](#9-ai-integration-questions)
10. [System Design & Scalability Questions](#10-system-design--scalability-questions)
11. [How Blockchain Is Implemented in LifeLedger](#11-how-blockchain-is-implemented-in-lifeledger)

---

## 1. Project Overview Questions

**Q1. What is LifeLedger? What problem does it solve?**
> LifeLedger is a secure, role-based medical record management system that integrates blockchain (Ethereum/Hardhat) and IPFS decentralized storage. It solves the problem of fragmented, insecure, and non-auditable medical records by providing a tamper-proof, consent-driven, and fully auditable system for patients, doctors, and administrators.

**Q2. Who are the three types of users in LifeLedger, and what can each do?**
> - **Patient**: View and upload their own records, approve/deny doctor access requests, generate emergency QR codes, revoke access, and view their consent and audit history.
> - **Doctor**: Request access to patient records, upload records on behalf of patients, use emergency QR codes to access records in emergencies, and view AI-generated insights.
> - **Admin**: Add or remove doctor accounts, view all users and audit logs, and monitor overall system activity.

**Q3. What tech stack does LifeLedger use?**
> - **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion, Axios
> - **Backend**: Node.js, Express.js, TypeScript, JWT authentication, Winston logging
> - **Database**: PostgreSQL
> - **Blockchain**: Solidity smart contract, Hardhat local Ethereum node, ethers.js
> - **Decentralized Storage**: IPFS
> - **AI**: Google Gemini API (gemini-2.0-flash-exp)
> - **Security**: AES-256-CBC encryption, bcryptjs, Helmet, rate limiting

**Q4. What does HIPAA compliance mean in the context of this project?**
> HIPAA (Health Insurance Portability and Accountability Act) requires that patient health information (PHI) be protected. LifeLedger addresses this through: AES-256 encryption of data at rest and in transit, strict RBAC so only authorized users see records, full audit logging of every access event, patient consent management, and secure authentication via JWT.

**Q5. What is the Patient ID format used in LifeLedger?**
> Patient IDs follow the format `PT-YYYY-NNNN` (e.g., `PT-2024-0001`). They are unique identifiers stored in the `users` table and used by doctors to search for patients.

---

## 2. Blockchain Implementation Questions

**Q6. Why is blockchain used in LifeLedger instead of just a regular database?**
> A regular database can be modified by a system administrator, which means audit logs could be altered or deleted. Blockchain provides an **immutable** record: once a transaction is written to a block and confirmed, it cannot be changed or erased. This makes the audit trail trustworthy even if the database is compromised.

**Q7. What blockchain platform does LifeLedger use, and why?**
> LifeLedger uses a **local Hardhat Ethereum node** for development. Hardhat is a development environment for Ethereum smart contracts. It provides a local JSON-RPC node (at `http://localhost:8545`), pre-funded test accounts, and fast block mining—making it ideal for developing and testing Ethereum-compatible smart contracts without paying real gas fees.

**Q8. What is a smart contract? How does LifeLedger use one?**
> A smart contract is self-executing code deployed on a blockchain. It runs exactly as written and cannot be altered after deployment. LifeLedger deploys the `MedicalRecordAudit` contract (written in Solidity) to log every medical record access and consent action as an immutable, on-chain audit trail.

**Q9. What is the name of the smart contract in LifeLedger and what is its purpose?**
> The smart contract is `MedicalRecordAudit.sol`. Its purpose is to:
> - Log every access to a medical record (who accessed it, when, what type of access, and whether it was an emergency).
> - Store consent grants and revocations between patients and doctors with expiry timestamps.
> - Provide verifiable, tamper-proof statistics on total accesses and consents.

**Q10. What is the difference between logging to PostgreSQL and logging to the blockchain?**
> - **PostgreSQL** stores rich relational data quickly and can be queried with SQL. However, it is mutable—records can be updated or deleted.
> - **Blockchain** stores only a hash and metadata; writes are slow and cost gas, but the records are **immutable** and **decentralized**. The blockchain transaction hash (`txHash`) is then stored back in PostgreSQL as proof of the on-chain event.

**Q11. What is `ethers.js` and how is it used in this project?**
> `ethers.js` is a JavaScript/TypeScript library for interacting with Ethereum-compatible blockchains. In LifeLedger's `blockchainService.ts`, it is used to:
> - Connect to the local Hardhat node via `JsonRpcProvider`.
> - Create a `Wallet` signer from the first Hardhat account.
> - Instantiate the deployed `MedicalRecordAudit` contract.
> - Call contract functions (`logAccess`, `grantConsent`, `revokeConsent`, etc.) and wait for transaction receipts.
> - Hash identifiers using `ethers.id()` (keccak256).

**Q12. How does the backend connect to the blockchain node?**
> The `blockchainService.ts` creates an `ethers.JsonRpcProvider` pointing to `http://localhost:8545` (or the `BLOCKCHAIN_RPC` environment variable). It then calls `provider.getSigner(0)` to use the first pre-funded Hardhat account as the transaction signer.

**Q13. What is a transaction hash, and where is it stored in LifeLedger?**
> A transaction hash (`txHash`) is a unique cryptographic identifier returned after a blockchain transaction is mined. It acts as a receipt and can be used to look up the transaction on any block explorer. In LifeLedger, the `txHash` is stored in the `blockchain_tx` column of both the `medical_records` and `access_logs` tables in PostgreSQL.

**Q14. What happens if the blockchain node is unavailable?**
> The `blockchainService.ts` handles this gracefully: if the `contract` object is not initialized, functions return `{ success: false, error: 'Blockchain not initialized' }` or an empty array. The system continues to work—records are saved to PostgreSQL—but without blockchain logging. A warning is printed to the console.

---

## 3. Smart Contract Questions

**Q15. What is Solidity and what version is used?**
> Solidity is a statically-typed programming language for writing Ethereum smart contracts. LifeLedger uses `pragma solidity ^0.8.19`, which means version 0.8.19 or higher (but below 0.9.0).

**Q16. Describe the `AccessLog` struct in the smart contract.**
> ```solidity
> struct AccessLog {
>     address accessor;    // Ethereum address of the caller
>     bytes32 recordHash;  // Hash of the record data
>     uint256 timestamp;   // Unix timestamp (block.timestamp)
>     string accessType;   // "view", "upload", "emergency", etc.
>     string patientId;    // Patient identifier
>     string doctorId;     // Doctor identifier
>     bool isEmergency;    // Emergency access flag
> }
> ```

**Q17. Describe the `ConsentLog` struct in the smart contract.**
> ```solidity
> struct ConsentLog {
>     address patient;     // Patient's Ethereum address
>     address doctor;      // Doctor's Ethereum address
>     uint256 grantedAt;   // Timestamp when consent was given
>     uint256 expiresAt;   // Timestamp when consent expires
>     bool isActive;       // Whether consent is currently active
>     string consentType;  // "normal", "emergency", etc.
> }
> ```

**Q18. What mappings are used in the `MedicalRecordAudit` contract?**
> - `mapping(bytes32 => AccessLog[]) public recordAccess` — stores an array of access logs keyed by a hashed record ID.
> - `mapping(bytes32 => ConsentLog) public consents` — stores consent records keyed by a hashed consent ID.
> - `mapping(address => bool) public authorizedUsers` — access control list of authorized backend addresses.

**Q19. What Solidity modifiers are defined, and what do they do?**
> - `onlyOwner`: Restricts function to the contract deployer (`msg.sender == owner`). Used for `authorizeUser` and `revokeUser`.
> - `onlyAuthorized`: Restricts function to addresses in `authorizedUsers`. Used for `logAccess`, `grantConsent`, and `revokeConsent`.

**Q20. What events does the smart contract emit and why are events important?**
> - `AccessLogged(recordId, accessor, timestamp, accessType, isEmergency)` — emitted on each record access.
> - `ConsentGranted(consentId, patient, doctor, expiresAt)` — emitted when consent is granted.
> - `ConsentRevoked(consentId, patient, timestamp)` — emitted when consent is revoked.
>
> Events are important because they are stored in the transaction logs on the blockchain and can be efficiently queried by off-chain applications (e.g., block explorers, DApps) without reading all contract state.

**Q21. How does `logAccess` work step by step?**
> 1. The caller must be in `authorizedUsers` (enforced by `onlyAuthorized`).
> 2. A new `AccessLog` struct is pushed to `recordAccess[recordId]`.
> 3. The global `totalAccesses` counter is incremented.
> 4. The `AccessLogged` event is emitted.

**Q22. How does consent expiry work in the smart contract?**
> When `grantConsent` is called, `expiresAt` is set to `block.timestamp + duration` (in seconds). The `isConsentValid` function checks both `consent.isActive == true` and `block.timestamp < consent.expiresAt`. If either condition fails, the consent is considered invalid.

**Q23. What is `block.timestamp` in Solidity?**
> `block.timestamp` is a global variable in Solidity that returns the Unix timestamp (seconds since 1 January 1970) of the current block as set by the miner. It is used for recording when events occur and for computing consent expiry.

**Q24. How is the smart contract deployed, and where is the deployment information stored?**
> The deployment script `blockchain/scripts/deploy.js` uses Hardhat's `ethers.getContractFactory('MedicalRecordAudit')` and `.deploy()` to deploy the contract. After deployment, the contract address, network name, deployment timestamp, and ABI are written to `blockchain/deployment.json`. The backend's `blockchainService.ts` reads this file at startup.

**Q25. What is the ABI (Application Binary Interface) of a smart contract?**
> The ABI is a JSON description of a smart contract's functions, their parameters, and return types. It tells client libraries like `ethers.js` how to encode function calls and decode return values so the backend can interact with the deployed contract.

---

## 4. Backend Architecture Questions

**Q26. What is the role of the `blockchainService.ts` file?**
> It is the backend's interface to the blockchain. It initializes the connection to the Hardhat node and the deployed smart contract, and exports functions (`logAccessToBlockchain`, `grantConsentOnBlockchain`, `revokeConsentOnBlockchain`, `getBlockchainAuditTrail`, `isConsentValidOnBlockchain`, `getBlockchainStats`) that are called by controllers and routes when blockchain interaction is required.

**Q27. How does the backend hash a record ID before sending it to the blockchain?**
> It uses `ethers.id(recordId.toString())`, which computes the keccak256 hash of the string representation of the record ID. This converts a numeric PostgreSQL ID into a `bytes32` value suitable for use as a blockchain mapping key.

**Q28. What are the blockchain-related API endpoints?**
> - `GET /api/v1/blockchain/stats` — returns total accesses and consents from the contract's `getStats()` function.
> - `GET /api/v1/blockchain/audit/:recordId` — returns the full audit trail for a record from `getAccessLogs()`.
> - `GET /api/v1/blockchain/verify` — verifies that the blockchain integration is working and returns node info.

**Q29. What is JWT and how is it used in LifeLedger?**
> JWT (JSON Web Token) is a compact, signed token used for stateless authentication. After login, the backend generates a JWT containing the user's ID and role, signed with a secret key. The client stores this token and sends it in the `Authorization: Bearer <token>` header with every request. The `auth` middleware verifies and decodes the token to authenticate and authorize the user.

**Q30. What is the purpose of the `auth` middleware?**
> It intercepts every protected API request, extracts the JWT from the `Authorization` header, verifies its signature, and attaches the decoded user object to `req.user`. If the token is missing or invalid, the request is rejected with a 401 Unauthorized response.

**Q31. What logging framework is used and what does it log?**
> Winston is used for application logging. It logs at multiple levels (error, warn, info, debug) to both the console and rotating log files (JSON format). Access logs, blockchain events, errors, and system startup messages are all logged through Winston.

---

## 5. Database & Data Flow Questions

**Q32. What database does LifeLedger use and what are its main tables?**
> PostgreSQL is used. Key tables:
> - `users` — stores all users (patients, doctors, admins) with role, credentials, and patient-specific fields.
> - `medical_records` — stores record metadata, file path, IPFS CID, AI insights, and blockchain transaction hash.
> - `access_requests` — tracks doctor requests for patient record access, including status and expiry.
> - `access_logs` — immutable log of every record access with user, action, IP, and blockchain tx hash.
> - `consents` — patient consent grants/revocations.
> - `notifications` — in-app notifications.

**Q33. What is an IPFS CID and where is it stored in the database?**
> A CID (Content Identifier) is IPFS's unique address for a piece of content, derived from the cryptographic hash of the content itself. It is stored in the `ipfs_cid` column of the `medical_records` table so the file can be retrieved from IPFS later.

**Q34. What is the full flow when a doctor uploads a medical record?**
> 1. Doctor submits the file and record metadata via the frontend.
> 2. Multer receives the file; backend validates size and type.
> 3. File is encrypted with AES-256 and saved locally.
> 4. SHA-256 hash of the file is calculated (`file_hash`).
> 5. (Optional) File is uploaded to IPFS; CID is returned.
> 6. AI analysis is triggered (Google Gemini processes extracted text).
> 7. Metadata, file path, IPFS CID, and AI insights are saved to PostgreSQL.
> 8. `blockchainService.logAccessToBlockchain()` is called; tx hash stored in `medical_records.blockchain_tx`.
> 9. Notifications are sent to the patient (email/SMS).

**Q35. What is the `file_hash` column used for?**
> The `file_hash` stores the SHA-256 hash of the encrypted file. It can be used to verify that a downloaded file has not been tampered with — the hash computed from the downloaded file should match the stored hash.

---

## 6. Security & Encryption Questions

**Q36. What encryption algorithm is used for data at rest?**
> AES-256-CBC (Advanced Encryption Standard with 256-bit key in Cipher Block Chaining mode). This is implemented in `backend/src/utils/encryption.ts` and applied to sensitive file data before storage.

**Q37. How are passwords stored securely?**
> Passwords are hashed using **bcryptjs** with a salt. bcrypt is a one-way hashing algorithm specifically designed for passwords — it is deliberately slow to resist brute-force attacks, and the salt prevents rainbow table attacks.

**Q38. What is the role of Helmet in the backend?**
> Helmet is an Express middleware that sets security-related HTTP response headers (e.g., `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`). These headers protect against common web vulnerabilities like clickjacking, MIME sniffing, and cross-site scripting (XSS).

**Q39. What is rate limiting and why is it used?**
> Rate limiting (implemented via `express-rate-limit`) restricts how many requests a client can make in a given time window. It protects against brute-force login attacks, denial-of-service (DoS) attempts, and API abuse.

**Q40. What is RBAC and how is it implemented in LifeLedger?**
> RBAC (Role-Based Access Control) restricts system access based on user roles. In LifeLedger, every user has a `role` of `'patient'`, `'doctor'`, or `'admin'`. Backend route handlers check `req.user.role` before processing a request, ensuring, for example, that only admins can add doctors, or that a patient can only access their own records.

---

## 7. IPFS & Decentralized Storage Questions

**Q41. What is IPFS?**
> IPFS (InterPlanetary File System) is a peer-to-peer distributed file system. Unlike HTTP, which uses location-based addressing (URLs), IPFS uses content-based addressing (CIDs). A file's CID is derived from its content hash, so the same file always has the same CID regardless of where it is stored.

**Q42. Why is IPFS used in LifeLedger instead of storing files only on a server?**
> IPFS provides:
> - **Decentralization**: No single point of failure.
> - **Content integrity**: The CID is derived from the file's hash, so any tampering changes the CID.
> - **Redundancy**: Files can be pinned on multiple nodes.
> - **Reduced server storage**: Large files are offloaded to the IPFS network.

**Q43. What is the IPFS upload flow in LifeLedger?**
> 1. The backend encrypts the file.
> 2. It sends the encrypted file to the local IPFS node via HTTP API.
> 3. IPFS returns a CID.
> 4. The CID is stored in `medical_records.ipfs_cid`.
> 5. To retrieve the file, the backend fetches it from IPFS using the CID.

---

## 8. Frontend & User Roles Questions

**Q44. What framework is used for the frontend and why?**
> Next.js 14 (built on React 18) is used. Next.js offers server-side rendering (SSR), static site generation (SSG), file-based routing, and built-in API routes. For a healthcare system, SSR improves initial load performance and SEO (if needed), while TypeScript adds type safety.

**Q45. What is the QR code feature and how does it work?**
> Each patient has a unique QR code (backed by a UUID stored in `users.qr_code`). In an emergency, a doctor can scan this QR code using the `html5-qrcode` library. The backend receives the QR UUID, identifies the patient, auto-approves emergency access, logs it to the blockchain as `isEmergency: true`, and grants temporary record access without requiring explicit patient approval.

**Q46. How does the frontend communicate with the backend?**
> The frontend uses **Axios** to make HTTP requests to the backend REST API (`/api/v1/...`). The JWT token is attached to every request in the `Authorization: Bearer <token>` header. React Hook Form is used to manage form state and validation on the client side.

---

## 9. AI Integration Questions

**Q47. What AI service is integrated and what does it do?**
> Google Gemini API (`gemini-2.0-flash-exp` model) is used for medical record analysis. After a file is uploaded, its text is extracted (using `pdf-parse` for PDFs or `tesseract.js` for images via OCR), and sent to Gemini with a prompt to produce: a summary, a list of concerns, recommendations, and related conditions.

**Q48. How is extracted text from files processed?**
> - **PDFs**: `pdf-parse` extracts raw text from the PDF.
> - **Images (JPG/PNG)**: `tesseract.js` runs Optical Character Recognition (OCR) to extract text.
> The extracted text is then sent to the Gemini API along with the record's title, description, type, and date.

**Q49. Where are AI insights stored?**
> AI insights are stored as a JSON string in the `ai_insights` column of the `medical_records` table. The structure contains `summary`, `concerns`, `recommendations`, and `relatedConditions`. They are cached in the database and can be regenerated on demand via the `/api/v1/ai/analyze/:recordId` endpoint.

---

## 10. System Design & Scalability Questions

**Q50. How does LifeLedger handle stateless authentication at scale?**
> By using JWT tokens, the backend does not need to store session state. Any backend instance can verify a token using the shared secret key. This makes it straightforward to run multiple backend instances behind a load balancer for horizontal scaling.

**Q51. What is the health check endpoint and what does it verify?**
> The `/health` endpoint verifies:
> - Database connectivity (can the backend query PostgreSQL?)
> - IPFS node availability
> - Blockchain node availability
> This is used for monitoring and container orchestration (e.g., Docker health checks, Kubernetes readiness probes).

**Q52. What is Docker Compose used for in this project?**
> Two Docker Compose files are provided:
> - `docker-compose.yml` — runs the core services (backend, frontend, PostgreSQL, IPFS).
> - `docker-compose-full.yml` — includes the blockchain node as well.
> They allow the full application stack to be started with a single `docker-compose up` command.

**Q53. What is the recommended production deployment setup?**
> - **Database**: Managed PostgreSQL (e.g., AWS RDS or DigitalOcean)
> - **Blockchain**: Private Ethereum network or a testnet (e.g., Sepolia)
> - **Storage**: IPFS cluster or a pinning service like Pinata
> - **Process Manager**: PM2
> - **Reverse Proxy**: Nginx with SSL/TLS certificates
> - **Containerization**: Docker with CI/CD pipeline

---

## 11. How Blockchain Is Implemented in LifeLedger

This section provides a complete, step-by-step explanation of the blockchain implementation.

### 11.1 Technology Choices

| Component | Technology | Role |
|-----------|-----------|------|
| Smart Contract Language | Solidity ^0.8.19 | Defines on-chain data structures and logic |
| Development Framework | Hardhat | Local Ethereum node, compilation, deployment |
| Client Library | ethers.js v6 | Backend-to-blockchain communication |
| Blockchain Network | Local Hardhat node | Simulates Ethereum (port 8545) |

---

### 11.2 Smart Contract: `MedicalRecordAudit.sol`

Located at `blockchain/contracts/MedicalRecordAudit.sol`, this is the only smart contract in the project.

#### Data Structures

```solidity
struct AccessLog {
    address accessor;    // Who accessed the record
    bytes32 recordHash;  // Cryptographic hash of the record
    uint256 timestamp;   // When access occurred (block.timestamp)
    string accessType;   // "view", "upload", "emergency", "qr_code"
    string patientId;    // Patient identifier
    string doctorId;     // Doctor identifier
    bool isEmergency;    // Emergency flag
}

struct ConsentLog {
    address patient;     // Patient's Ethereum address
    address doctor;      // Doctor's Ethereum address
    uint256 grantedAt;   // Consent grant timestamp
    uint256 expiresAt;   // Consent expiry timestamp
    bool isActive;       // Whether consent is still valid
    string consentType;  // "normal" or "emergency"
}
```

#### Storage

```solidity
mapping(bytes32 => AccessLog[])  public recordAccess;    // All accesses per record
mapping(bytes32 => ConsentLog)   public consents;         // Consent per consent ID
mapping(address => bool)         public authorizedUsers;  // Access control
```

#### Key Functions

| Function | Modifier | Description |
|----------|----------|-------------|
| `logAccess(recordId, recordHash, accessType, patientId, doctorId, isEmergency)` | `onlyAuthorized` | Appends an `AccessLog` entry and increments `totalAccesses` |
| `grantConsent(consentId, patient, doctor, duration, consentType)` | `onlyAuthorized` | Creates a `ConsentLog` with expiry = `now + duration` |
| `revokeConsent(consentId)` | `onlyAuthorized` | Sets `consents[consentId].isActive = false` |
| `getAccessLogs(recordId)` | `view` | Returns all access logs for a record |
| `isConsentValid(consentId)` | `view` | Returns `true` if consent is active and not expired |
| `getStats()` | `view` | Returns `(totalAccesses, totalConsents)` |
| `authorizeUser(address)` | `onlyOwner` | Adds an address to `authorizedUsers` |

#### Events

```solidity
event AccessLogged(bytes32 indexed recordId, address indexed accessor, uint256 timestamp, string accessType, bool isEmergency);
event ConsentGranted(bytes32 indexed consentId, address indexed patient, address indexed doctor, uint256 expiresAt);
event ConsentRevoked(bytes32 indexed consentId, address indexed patient, uint256 timestamp);
```

---

### 11.3 Deployment

The script `blockchain/scripts/deploy.js` deploys the contract to the local Hardhat node:

```js
const MedicalRecordAudit = await ethers.getContractFactory('MedicalRecordAudit');
const contract = await MedicalRecordAudit.deploy();
await contract.waitForDeployment();
```

After deployment, it writes `blockchain/deployment.json`:

```json
{
  "address": "0xABC...",
  "network": "localhost",
  "deployedAt": "2024-01-01T00:00:00.000Z",
  "abi": [ ... ]
}
```

---

### 11.4 Backend Service: `blockchainService.ts`

Located at `backend/src/services/blockchainService.ts`, this TypeScript module is the bridge between the Node.js backend and the Ethereum blockchain.

#### Initialization

```typescript
// Read deployment info
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

// Connect to Hardhat node
const provider = new ethers.JsonRpcProvider('http://localhost:8545');

// Get signer (first Hardhat account)
const signer = await provider.getSigner(0);

// Instantiate deployed contract
contract = new ethers.Contract(contractAddress, contractABI, signer);
```

#### Logging a Record Access

When a doctor or patient views a medical record:

```typescript
const recordIdHash = ethers.id(recordId.toString());  // keccak256 hash
const recordHash   = ethers.id(JSON.stringify(recordData));

const tx      = await contract.logAccess(recordIdHash, recordHash, accessType, patientId, doctorId, isEmergency);
const receipt = await tx.wait();

// receipt.transactionHash is stored in the database
```

#### Granting Consent

When a patient approves a doctor's access request:

```typescript
const consentIdHash = ethers.id(consentId.toString());
const tx = await contract.grantConsent(consentIdHash, patientAddress, doctorAddress, duration, consentType);
const receipt = await tx.wait();
```

#### Revoking Consent

When a patient revokes a doctor's access:

```typescript
const consentIdHash = ethers.id(consentId.toString());
const tx = await contract.revokeConsent(consentIdHash);
await tx.wait();
```

#### Retrieving the Audit Trail

```typescript
const recordIdHash = ethers.id(recordId.toString());
const logs = await contract.getAccessLogs(recordIdHash);
// Returns an array of AccessLog structs
```

---

### 11.5 End-to-End Blockchain Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User Action (View / Upload / Approve Access)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend Controller (e.g., recordController.ts)             │
│  - Validates JWT and role                                   │
│  - Reads/writes to PostgreSQL                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  blockchainService.ts                                       │
│  - ethers.id() creates keccak256 hashes                     │
│  - contract.logAccess() / grantConsent() called             │
│  - tx.wait() waits for block confirmation                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Hardhat Local Ethereum Node (http://localhost:8545)        │
│  - Transaction signed by backend's wallet                   │
│  - MedicalRecordAudit.sol executes on-chain                 │
│  - AccessLog / ConsentLog appended to mapping               │
│  - Event emitted (AccessLogged / ConsentGranted)            │
│  - Transaction mined; txHash returned                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  txHash stored in PostgreSQL                                │
│  (medical_records.blockchain_tx / access_logs.blockchain_tx)│
└─────────────────────────────────────────────────────────────┘
```

---

### 11.6 Why This Design Matters

| Property | Explanation |
|----------|------------|
| **Immutability** | Once mined, blockchain entries cannot be altered. Even a database admin cannot erase the audit trail. |
| **Transparency** | Any authorized party can retrieve access logs directly from the blockchain using `getAccessLogs()`. |
| **Tamper Detection** | The `recordHash` stored on-chain is a keccak256 hash of the record data. If the record is modified, the hash will no longer match, revealing tampering. |
| **Consent Enforcement** | Smart contract time-locked consent (`expiresAt`) ensures access rights automatically expire without relying on manual database updates. |
| **Non-repudiation** | Each log entry includes the Ethereum `accessor` address, providing cryptographic proof of who performed an action. |

---

*This document covers the main topics likely to be asked in a viva for the LifeLedger project. For deeper exploration, refer to `ARCHITECTURE.md`, `FLOW.md`, and the source files in `blockchain/` and `backend/src/services/`.*
