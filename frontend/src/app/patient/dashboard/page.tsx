'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingScreen from '@/components/LoadingScreen';
import Onboarding from '@/components/Onboarding';
import { useToast } from '@/components/Toast';
import api from '@/lib/api';
import { DocumentTextIcon, UserGroupIcon, ClockIcon, ShieldCheckIcon, SparklesIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

export default function PatientDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recordsRes, consentRes] = await Promise.all([
        api.get('/records'),
        api.get('/patients/consent-stats'),
      ]);

      setRecentRecords(recordsRes.data.records.slice(0, 5));
      setStats(consentRes.data.stats);
      showToast('success', 'Dashboard loaded successfully!');
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Records',
      value: recentRecords.length,
      icon: DocumentTextIcon,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      change: '+12%'
    },
    {
      title: 'Approved Doctors',
      value: stats?.approvedDoctors || 0,
      icon: UserGroupIcon,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      change: '+3'
    },
    {
      title: 'Pending Requests',
      value: stats?.pendingRequests || 0,
      icon: ClockIcon,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      change: 'New'
    },
    {
      title: 'Total Doctors',
      value: stats?.totalDoctors || 0,
      icon: ShieldCheckIcon,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      change: '+5%'
    }
  ];

  if (loading) {
    return (
      <DashboardLayout role="patient">
        <LoadingScreen message="Loading your dashboard..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="patient">
      <Onboarding role="patient" />
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Welcome Back!</h1>
              <p className="text-gray-600 text-lg">Here's your health overview</p>
            </div>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <SparklesIcon className="h-12 w-12 text-blue-500" />
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="relative group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity`} />
              <div className="relative glass rounded-2xl p-6 border border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-xl shadow-lg`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center space-x-1">
                    <ArrowTrendingUpIcon className="h-3 w-3" />
                    <span>{stat.change}</span>
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Records */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass rounded-2xl border border-white/20 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/20 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Recent Medical Records</h2>
              <a
                href="/patient/records"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center space-x-1"
              >
                <span>View All</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
          <div className="p-6">
            {recentRecords.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No medical records yet</p>
                <p className="text-gray-400 text-sm mb-6">Start by uploading your first record</p>
                <a
                  href="/patient/records"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  <span>Upload Record</span>
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRecords.map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                    className="group"
                  >
                    <a
                      href="/patient/records"
                      className="flex items-center justify-between p-4 glass rounded-xl border border-white/20 hover:border-blue-200 transition"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                          <DocumentTextIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                            {record.title}
                          </h3>
                          <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                              {record.record_type}
                            </span>
                            <span>{new Date(record.record_date).toLocaleDateString()}</span>
                            {record.doctor_first_name && (
                              <span className="text-gray-500">
                                Dr. {record.doctor_first_name} {record.doctor_last_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <svg className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="grid md:grid-cols-3 gap-6 mt-8"
        >
          {[
            { title: 'View QR Code', href: '/patient/qr-code', icon: ShieldCheckIcon, color: 'from-blue-500 to-cyan-500' },
            { title: 'Access Requests', href: '/patient/access-requests', icon: UserGroupIcon, color: 'from-purple-500 to-pink-500' },
            { title: 'Access Logs', href: '/patient/access-logs', icon: ClockIcon, color: 'from-green-500 to-emerald-500' }
          ].map((action, index) => (
            <motion.a
              key={action.title}
              href={action.href}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity`} />
              <div className="relative glass rounded-2xl p-6 border border-white/20 text-center">
                <div className={`inline-flex p-4 bg-gradient-to-br ${action.color} rounded-xl shadow-lg mb-4`}>
                  <action.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:gradient-text transition">
                  {action.title}
                </h3>
              </div>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
