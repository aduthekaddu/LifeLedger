'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { MagnifyingGlassIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function DoctorSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await api.get(`/patients/search?query=${searchQuery}`);
      setPatients(response.data.patients);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (patient: any) => {
    setSelectedPatient(patient);
    setMessage('');
  };

  const submitAccessRequest = async () => {
    if (!reason.trim()) {
      setMessage('Please provide a reason for access');
      return;
    }

    setRequesting(true);
    try {
      await api.post('/access/request', {
        patientId: selectedPatient.id,
        reason,
        isEmergency: false,
      });
      setMessage('Access request sent successfully');
      setSelectedPatient(null);
      setReason('');
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to send request');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-4xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold gradient-text mb-8"
        >
          Search Patients
        </motion.h1>

        {/* Search Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass card-3d p-6 mb-8"
        >
          <form onSubmit={handleSearch} className="flex space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient ID, name, or email..."
                className="w-full pl-12 pr-4 py-3 glass border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2 font-medium"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </form>
        </motion.div>

        {/* Message */}
        {message && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-6 p-4 rounded-xl glass ${
              message.includes('success') ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'
            }`}
          >
            <p className={message.includes('success') ? 'text-green-700' : 'text-red-700'}>
              {message}
            </p>
          </motion.div>
        )}

        {/* Search Results */}
        {patients.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass card-3d"
          >
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-2xl font-semibold text-gray-900">Search Results</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {patients.map((patient, index) => (
                  <motion.div 
                    key={patient.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-5 glass rounded-xl border border-white/20 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center">
                      <div className="p-3 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl mr-4">
                        <UserIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {patient.first_name} {patient.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">ID: {patient.id}</p>
                        <p className="text-sm text-gray-600">{patient.email}</p>
                        {patient.phone_number && (
                          <p className="text-sm text-gray-600">{patient.phone_number}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRequestAccess(patient)}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
                    >
                      Request Access
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Access Request Modal */}
        {selectedPatient && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass card-3d p-8 max-w-md w-full"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold gradient-text">
                  Request Access to Records
                </h3>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setReason('');
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-600" />
                </button>
              </div>
              <p className="text-gray-700 mb-6">
                Patient: <span className="font-semibold">{selectedPatient.first_name} {selectedPatient.last_name}</span>
              </p>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Access *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 glass border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  rows={4}
                  placeholder="Please provide a reason for accessing this patient's records..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={submitAccessRequest}
                  disabled={requesting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 font-medium"
                >
                  {requesting ? 'Sending...' : 'Send Request'}
                </button>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setReason('');
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
