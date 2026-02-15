'use client';

import DashboardLayout from '@/components/DashboardLayout';
import ProfilePage from '@/components/ProfilePage';

export default function AdminProfile() {
  return (
    <DashboardLayout role="admin">
      <ProfilePage role="admin" />
    </DashboardLayout>
  );
}
