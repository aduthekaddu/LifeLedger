'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function DoctorAccessRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <DashboardLayout role="doctor">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const denied = requests.filter(r => r.status === 'denied');

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Access Requests</h1>

        {/* Pending */}
        {pending.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <ClockIcon className="h-6 w-6 text-yellow-600 mr-2" />
              Pending ({pending.length})
            </h2>
            <div className="space-y-4">
              {pending.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {request.patient_first_name} {request.patient_last_name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{request.patient_email}</p>
                  {request.reason && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">{request.reason}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Requested: {new Date(request.requested_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved */}
        {approved.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
              Approved ({approved.length})
            </h2>
            <div className="space-y-4">
              {approved.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {request.patient_first_name} {request.patient_last_name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{request.patient_email}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Approved: {new Date(request.responded_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Denied */}
        {denied.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <XCircleIcon className="h-6 w-6 text-red-600 mr-2" />
              Denied ({denied.length})
            </h2>
            <div className="space-y-4">
              {denied.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow p-6 opacity-75">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {request.patient_first_name} {request.patient_last_name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{request.patient_email}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Denied: {new Date(request.responded_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {requests.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No access requests</h3>
            <p className="text-gray-600">You haven't sent any access requests yet</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
