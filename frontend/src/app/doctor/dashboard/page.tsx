'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingScreen from '@/components/LoadingScreen';
import Onboarding from '@/components/Onboarding';
import { useToast } from '@/components/Toast';
import api from '@/lib/api';
import { UserGroupIcon, ClockIcon, CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsRes, requestsRes] = await Promise.all([
        api.get('/patients/my-patients'),
        api.get('/access/requests'),
      ]);

      setPatients(patientsRes.data.patients);
      setRequests(requestsRes.data.requests);
      showToast('success', 'Dashboard loaded successfully!');
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="doctor">
        <LoadingScreen message="Loading your dashboard..." />
      </DashboardLayout>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');

  return (
    <DashboardLayout role="doctor">
      <Onboarding role="doctor" />
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold gradient-text mb-8"
        >
          Doctor Dashboard
        </motion.h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass card-3d p-6 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 font-medium">My Patients</p>
                <p className="text-3xl font-bold gradient-text">{patients.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass card-3d p-6 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl">
                <ClockIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 font-medium">Pending Requests</p>
                <p className="text-3xl font-bold gradient-text">{pendingRequests.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass card-3d p-6 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl">
                <CheckCircleIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 font-medium">Approved Access</p>
                <p className="text-3xl font-bold gradient-text">{approvedRequests.length}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* My Patients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass card-3d mb-8"
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-2xl font-semibold text-gray-900">My Patients</h2>
          </div>
          <div className="p-6">
            {patients.length === 0 ? (
              <div className="text-center py-12">
                <div className="floating mx-auto w-fit mb-4">
                  <UserGroupIcon className="h-16 w-16 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4">No patients yet. Search and request access to patient records.</p>
                <a
                  href="/doctor/search"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
                >
                  Search Patients
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {patients.slice(0, 5).map((patient, index) => (
                  <motion.div
                    key={patient.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 glass rounded-xl border border-white/20 hover:shadow-lg transition-all duration-200"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {patient.first_name} {patient.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{patient.email}</p>
                    </div>
                    <a
                      href={`/doctor/patients?id=${patient.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium flex items-center space-x-1"
                    >
                      <span>View Records</span>
                      <ArrowRightIcon className="h-4 w-4" />
                    </a>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass card-3d"
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-2xl font-semibold text-gray-900">Recent Access Requests</h2>
          </div>
          <div className="p-6">
            {requests.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No access requests</p>
            ) : (
              <div className="space-y-3">
                {requests.slice(0, 5).map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 glass rounded-xl border border-white/20 hover:shadow-lg transition-all duration-200"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {request.patient_first_name} {request.patient_last_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-medium text-white ${
                      request.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                      request.status === 'pending' ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
                      'bg-gradient-to-r from-red-500 to-pink-600'
                    }`}>
                      {request.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
