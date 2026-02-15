
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

export default function PatientAccessRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/access/requests');
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId: number, status: 'approved' | 'denied') => {
    try {
      await api.post('/access/respond', { requestId, status });
      setMessage(`Access request ${status}`);
      fetchRequests();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to respond');
    }
  };

  const handleRevoke = async (doctorId: number) => {
    if (!confirm('Are you sure you want to revoke access for this doctor?')) return;

    try {
      await api.post('/access/revoke', { doctorId });
      setMessage('Access revoked successfully');
      fetchRequests();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to revoke access');
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="patient">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const deniedRequests = requests.filter(r => r.status === 'denied');

  return (
    <DashboardLayout role="patient">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold gradient-text mb-8"
        >
          Access Requests
        </motion.h1>

        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-6 p-4 rounded-xl glass ${
              message.includes('success') || message.includes('approved')
                ? 'border-green-500/50 bg-green-500/10'
                : 'border-red-500/50 bg-red-500/10'
            }`}
          >
            <p className={message.includes('success') || message.includes('approved') ? 'text-green-700' : 'text-red-700'}>
              {message}
            </p>
          </motion.div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg mr-3">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              Pending Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-4">
              {pendingRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass card-3d p-6 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Dr. {request.doctor_first_name} {request.doctor_last_name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{request.doctor_email}</p>
                      {request.reason && (
                        <div className="mt-3 p-4 glass rounded-lg border border-white/20">
                          <p className="text-sm font-medium text-gray-700">Reason:</p>
                          <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-3 flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {new Date(request.requested_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-3 ml-4">
                      <button
                        onClick={() => handleRespond(request.id, 'approved')}
                        className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2 font-medium"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleRespond(request.id, 'denied')}
                        className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2 font-medium"
                      >
                        <XCircleIcon className="h-5 w-5" />
                        <span>Deny</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Approved Requests */}
        {approvedRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg mr-3">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
              Approved Access ({approvedRequests.length})
            </h2>
            <div className="space-y-4">
              {approvedRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass card-3d p-6 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Dr. {request.doctor_first_name} {request.doctor_last_name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{request.doctor_email}</p>
                      {request.is_emergency && (
                        <span className="inline-flex items-center mt-2 px-3 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold rounded-full">
                          <ShieldExclamationIcon className="h-4 w-4 mr-1" />
                          Emergency Access
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-3 flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Approved: {new Date(request.responded_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevoke(request.doctor_id)}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
                    >
                      Revoke Access
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Denied Requests */}
        {deniedRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <div className="p-2 bg-gradient-to-br from-red-400 to-pink-500 rounded-lg mr-3">
                <XCircleIcon className="h-6 w-6 text-white" />
              </div>
              Denied Requests ({deniedRequests.length})
            </h2>
            <div className="space-y-4">
              {deniedRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass card-3d p-6 opacity-75 hover:opacity-100 transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Dr. {request.doctor_first_name} {request.doctor_last_name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{request.doctor_email}</p>
                      <p className="text-xs text-gray-500 mt-3 flex items-center">
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Denied: {new Date(request.responded_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {requests.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass card-3d p-12 text-center"
          >
            <div className="floating">
              <ClockIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No access requests</h3>
            <p className="text-gray-600">You haven't received any access requests yet</p>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
