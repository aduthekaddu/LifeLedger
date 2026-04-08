
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { ClockIcon, ShieldExclamationIcon, QrCodeIcon, UserIcon } from '@heroicons/react/24/outline';

export default function PatientAccessLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/access/logs');
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccessTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return <ShieldExclamationIcon className="h-5 w-5 text-white" />;
      case 'qr_code':
        return <QrCodeIcon className="h-5 w-5 text-white" />;
      default:
        return <ClockIcon className="h-5 w-5 text-white" />;
    }
  };

  const getAccessTypeBadge = (type: string) => {
    const styles = {
      emergency: 'bg-gradient-to-r from-red-500 to-pink-500',
      qr_code: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      normal: 'bg-gradient-to-r from-blue-500 to-purple-500',
    };
    return styles[type as keyof typeof styles] || styles.normal;
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

  return (
    <DashboardLayout role="patient">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold gradient-text mb-8"
        >
          Access Logs
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass card-3d overflow-hidden"
        >
          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="floating">
                <ClockIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No access logs</h3>
              <p className="text-gray-600">No one has accessed your records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Access Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date & Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {logs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-white/5 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg mr-3">
                            <UserIcon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {log.first_name} {log.last_name}
                            </div>
                            <div className="text-sm text-gray-600">{log.email}</div>
                            <div className="text-xs text-gray-500 capitalize">{log.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{log.action}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const accessType = typeof log.access_type === 'string' && log.access_type.trim().length > 0
                            ? log.access_type
                            : 'normal';

                          return (
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1.5 text-xs font-semibold rounded-full text-white flex items-center space-x-1 ${getAccessTypeBadge(accessType)}`}>
                            {getAccessTypeIcon(accessType)}
                            <span className="ml-1">{accessType.replace('_', ' ')}</span>
                          </span>
                        </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 glass p-6 rounded-xl border border-blue-500/20"
          >
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <div className="p-1.5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg mr-2">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              Understanding Access Types
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span><strong>Normal:</strong> Regular access after your approval</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                <span><strong>Emergency:</strong> Emergency access granted by doctor</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                <span><strong>QR Code:</strong> Access via your emergency QR code</span>
              </li>
            </ul>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
