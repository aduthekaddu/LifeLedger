'use client';

import DashboardLayout from '@/components/DashboardLayout';
import ProfilePage from '@/components/ProfilePage';

export default function DoctorProfile() {
  return (
    <DashboardLayout role="doctor">
      <ProfilePage role="doctor" />
    </DashboardLayout>
  );
}
