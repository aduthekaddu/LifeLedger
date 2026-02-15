export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'doctor' | 'admin';
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  qrCode?: string;
  createdAt?: string;
}

export interface MedicalRecord {
  id: number;
  patientId: number;
  doctorId?: number;
  title: string;
  description?: string;
  recordType?: string;
  recordDate: string;
  filePath?: string;
  fileHash?: string;
  ipfsHash?: string;
  blockchainHash?: string;
  createdAt: string;
  doctorFirstName?: string;
  doctorLastName?: string;
  patientFirstName?: string;
  patientLastName?: string;
}

export interface AccessRequest {
  id: number;
  doctorId: number;
  patientId: number;
  status: 'pending' | 'approved' | 'denied' | 'revoked';
  reason?: string;
  isEmergency: boolean;
  requestedAt: string;
  respondedAt?: string;
  doctorFirstName?: string;
  doctorLastName?: string;
  doctorEmail?: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientEmail?: string;
}

export interface AccessLog {
  id: number;
  userId: number;
  patientId: number;
  recordId?: number;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  accessType: 'normal' | 'emergency' | 'qr_code';
  createdAt: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  patientFirstName?: string;
  patientLastName?: string;
  userFirstName?: string;
  userLastName?: string;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  patients: number;
  doctors: number;
  records: number;
  pendingRequests: number;
}

export interface ConsentStats {
  totalDoctors: number;
  approvedDoctors: number;
  pendingRequests: number;
}
