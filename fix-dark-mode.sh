#!/bin/bash

# Fix ProfilePage (already done)
echo "ProfilePage already fixed"

# Fix Patient Dashboard
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/patient/dashboard/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/patient/dashboard/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/patient/dashboard/page.tsx

# Fix Patient Records
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/patient/records/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/patient/records/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/patient/records/page.tsx

# Fix Patient Access Requests
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/patient/access-requests/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/patient/access-requests/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/patient/access-requests/page.tsx

# Fix Patient Access Logs
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/patient/access-logs/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/patient/access-logs/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/patient/access-logs/page.tsx

# Fix Doctor Dashboard
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/doctor/dashboard/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/doctor/dashboard/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/doctor/dashboard/page.tsx

# Fix Doctor Emergency Access
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/doctor/emergency/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/doctor/emergency/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/doctor/emergency/page.tsx
sed -i 's/text-red-900/text-red-900 dark:text-red-100/g' frontend/src/app/doctor/emergency/page.tsx
sed -i 's/text-yellow-900/text-yellow-900 dark:text-yellow-100/g' frontend/src/app/doctor/emergency/page.tsx
sed -i 's/bg-red-50/bg-red-50 dark:bg-red-900\/20/g' frontend/src/app/doctor/emergency/page.tsx
sed -i 's/bg-yellow-50/bg-yellow-50 dark:bg-yellow-900\/20/g' frontend/src/app/doctor/emergency/page.tsx

# Fix Doctor Patients
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/doctor/patients/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/doctor/patients/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/doctor/patients/page.tsx

# Fix Doctor Search
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/doctor/search/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/doctor/search/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/doctor/search/page.tsx

# Fix Doctor Upload Record
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/doctor/upload-record/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/doctor/upload-record/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/doctor/upload-record/page.tsx

# Fix Doctor Access Requests
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/doctor/access-requests/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/doctor/access-requests/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/doctor/access-requests/page.tsx

# Fix Admin Dashboard
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/admin/dashboard/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/admin/dashboard/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/admin/dashboard/page.tsx

# Fix Admin Doctors
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/admin/doctors/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/admin/doctors/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/admin/doctors/page.tsx

# Fix Admin Patients
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/admin/patients/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/admin/patients/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/admin/patients/page.tsx

# Fix Admin Audit Logs
sed -i 's/text-gray-900/text-gray-900 dark:text-gray-100/g' frontend/src/app/admin/audit-logs/page.tsx
sed -i 's/bg-white\/50/bg-white\/50 dark:bg-gray-800\/50/g' frontend/src/app/admin/audit-logs/page.tsx
sed -i 's/border-gray-200/border-gray-200 dark:border-gray-600/g' frontend/src/app/admin/audit-logs/page.tsx

echo "✅ All dark mode fixes applied!"
echo "Please refresh your browser to see the changes."
