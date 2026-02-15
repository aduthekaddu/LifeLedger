'use client';

import DashboardLayout from '@/components/DashboardLayout';
import ProfilePage from '@/components/ProfilePage';

export default function PatientProfile() {
  return (
    <DashboardLayout role="patient">
      <ProfilePage role="patient" />
    </DashboardLayout>
  );
}
