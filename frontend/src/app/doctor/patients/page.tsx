'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import FileViewer from '@/components/FileViewer';
import AIInsights from '@/components/AIInsights';
import api from '@/lib/api';
import { UserGroupIcon, DocumentTextIcon, MagnifyingGlassIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export default function DoctorPatients() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [showingAI, setShowingAI] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleUploadForPatient = (patient: any) => {
    const patientRef = (patient.patient_id || patient.email || '').toString();
    if (patientRef) {
      router.push(`/doctor/upload-record?patient=${encodeURIComponent(patientRef)}`);
      return;
    }

    router.push('/doctor/upload-record');
  };

  useEffect(() => {
    if (!patients.length) return;

    const patientRef = (searchParams.get('patient') || '').trim().toLowerCase();
    const legacyId = (searchParams.get('id') || '').trim();

    let matchedPatient: any = null;

    if (patientRef) {
      matchedPatient = patients.find((patient) => {
        const byPatientId = String(patient.patient_id || '').trim().toLowerCase() === patientRef;
        const byEmail = String(patient.email || '').trim().toLowerCase() === patientRef;
        return byPatientId || byEmail;
      });
    }

    if (!matchedPatient && legacyId) {
      matchedPatient = patients.find((patient) => String(patient.id) === legacyId);
    }

    if (matchedPatient && matchedPatient.id !== selectedPatient?.id) {
      handleViewRecords(matchedPatient);
    }
  }, [patients, searchParams, selectedPatient?.id]);

  const handleSearchPatients = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim().toLowerCase());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;

    return patients.filter((patient) => {
      const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
      const email = String(patient.email || '').toLowerCase();
      const phone = String(patient.phone_number || '').toLowerCase();
      const patientId = String(patient.patient_id || '').toLowerCase();

      return (
        fullName.includes(searchTerm) ||
        email.includes(searchTerm) ||
        phone.includes(searchTerm) ||
        patientId.includes(searchTerm)
      );
    });
  }, [patients, searchTerm]);

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
                    Patients ({filteredPatients.length})
                  </h2>
                </div>
                <form onSubmit={handleSearchPatients} className="px-4 py-3 border-b bg-gray-50">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search my patients"
                        className="w-full text-sm border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Search
                    </button>
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="px-3 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </form>
                <div className="divide-y">
                  {filteredPatients.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-gray-600">
                      No patients match your search.
                    </div>
                  ) : filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className={`px-6 py-4 transition ${
                        selectedPatient?.id === patient.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {patient.first_name} {patient.last_name}
                      </div>
                      {patient.patient_id && (
                        <div className="text-sm text-blue-700">Patient ID: {patient.patient_id}</div>
                      )}
                      <div className="text-sm text-gray-600">{patient.email}</div>
                      {patient.phone_number && (
                        <div className="text-sm text-gray-500">{patient.phone_number}</div>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleViewRecords(patient)}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          View Records
                        </button>
                        <button
                          onClick={() => handleUploadForPatient(patient)}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                        >
                          Upload Record
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Patient Records */}
            <div className="lg:col-span-2">
              {selectedPatient ? (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Records for {selectedPatient.first_name} {selectedPatient.last_name}
                    </h2>
                    <button
                      onClick={() => handleUploadForPatient(selectedPatient)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4" />
                      <span>Upload Record</span>
                    </button>
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
