'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import FileViewer from '@/components/FileViewer';
import AIInsights from '@/components/AIInsights';
import api from '@/lib/api';
import { UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function DoctorPatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [showingAI, setShowingAI] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients/my-patients');
      setPatients(response.data.patients);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientRecords = async (patientId: number) => {
    try {
      const response = await api.get(`/records?patientId=${patientId}`);
      setRecords(response.data.records);
    } catch (error) {
      console.error('Error fetching records:', error);
    }
  };

  const handleViewRecords = (patient: any) => {
    setSelectedPatient(patient);
    fetchPatientRecords(patient.id);
  };

  const handleDownload = async (recordId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/records/${recordId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `record-${recordId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
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

  return (
    <DashboardLayout role="doctor">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Patients</h1>

        {patients.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No patients yet</h3>
            <p className="text-gray-600 mb-6">
              Search for patients and request access to their records
            </p>
            <a
              href="/doctor/search"
              className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Search Patients
            </a>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Patients List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Patients ({patients.length})
                  </h2>
                </div>
                <div className="divide-y">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handleViewRecords(patient)}
                      className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition ${
                        selectedPatient?.id === patient.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {patient.first_name} {patient.last_name}
                      </div>
                      <div className="text-sm text-gray-600">{patient.email}</div>
                      {patient.phone_number && (
                        <div className="text-sm text-gray-500">{patient.phone_number}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Patient Records */}
            <div className="lg:col-span-2">
              {selectedPatient ? (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Records for {selectedPatient.first_name} {selectedPatient.last_name}
                    </h2>
                  </div>
                  <div className="p-6">
                    {records.length === 0 ? (
                      <div className="text-center py-12">
                        <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No records available</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {records.map((record) => (
                          <motion.div 
                            key={record.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-gray-50 rounded-lg"
                          >
                            <h3 className="font-semibold text-gray-900 mb-2">{record.title}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                                {record.record_type}
                              </span>
                              <span>{new Date(record.record_date).toLocaleDateString()}</span>
                            </div>
                            {record.file_path && (
                              <div className="flex space-x-3 mt-2">
                                <button
                                  onClick={() => setViewingRecord(record)}
                                  className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                                >
                                  👁️ View File
                                </button>
                                <button
                                  onClick={() => handleDownload(record.id)}
                                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-700 font-medium px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                                >
                                  📎 Download
                                </button>
                                <button
                                  onClick={() => setShowingAI(showingAI === record.id ? null : record.id)}
                                  className="inline-flex items-center space-x-1 text-sm text-purple-600 hover:text-purple-700 font-medium px-3 py-1.5 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                  <span>AI Insights</span>
                                </button>
                              </div>
                            )}
                            
                            {/* AI Insights Section */}
                            <AnimatePresence>
                              {showingAI === record.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-4 pt-4 border-t border-gray-200"
                                >
                                  <AIInsights 
                                    recordId={record.id} 
                                    token={localStorage.getItem('token') || ''} 
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select a patient
                  </h3>
                  <p className="text-gray-600">
                    Choose a patient from the list to view their medical records
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* File Viewer Modal */}
      {viewingRecord && (
        <FileViewer
          recordId={viewingRecord.id}
          title={viewingRecord.title}
          onClose={() => setViewingRecord(null)}
        />
      )}
    </DashboardLayout>
  );
}
