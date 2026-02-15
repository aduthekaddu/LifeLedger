'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingScreen from '@/components/LoadingScreen';
import Onboarding from '@/components/Onboarding';
import { useToast } from '@/components/Toast';
import api from '@/lib/api';
import { UserGroupIcon, DocumentTextIcon, ClockIcon, UsersIcon, ShieldExclamationIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  // Easter egg: Konami code
  const [konamiKeys, setKonamiKeys] = useState<string[]>([]);
  const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  
  // Easter egg: Logo click counter
  const [logoClicks, setLogoClicks] = useState(0);

  useEffect(() => {
    fetchData();
    
    // Konami code listener
    const handleKeyDown = (e: KeyboardEvent) => {
      setKonamiKeys((prev) => {
        const newKeys = [...prev, e.key].slice(-10);
        if (newKeys.join(',') === KONAMI_CODE.join(',')) {
          showToast('success', '🎉 Konami Code Activated! You found the secret!');
          // Trigger special effect
          document.body.style.animation = 'rainbow 2s infinite';
          setTimeout(() => {
            document.body.style.animation = '';
          }, 5000);
          return [];
        }
        return newKeys;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Time-based easter egg
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour === 0) {
      showToast('info', '🌙 Burning the midnight oil? Take care of yourself!');
    } else if (hour >= 2 && hour <= 5) {
      showToast('warning', '😴 It\'s very late! Consider getting some rest.');
    } else if (hour >= 6 && hour <= 8) {
      showToast('success', '🌅 Good morning! Ready to manage some records?');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data.stats);
      setRecentActivity(response.data.recentActivity);
      showToast('success', 'Dashboard data loaded successfully!');
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogoClick = () => {
    setLogoClicks(prev => prev + 1);
    if (logoClicks === 9) {
      showToast('success', '🎊 Achievement Unlocked: Super Clicker! You clicked 10 times!');
      // Trigger confetti effect
      const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];
      for (let i = 0; i < 50; i++) {
        setTimeout(() => {
          const confetti = document.createElement('div');
          confetti.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            top: 0;
            left: ${Math.random() * 100}%;
            animation: confetti-fall 3s linear forwards;
            z-index: 9999;
          `;
          document.body.appendChild(confetti);
          setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
      }
      setLogoClicks(0);
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
      <DashboardLayout role="admin">
        <LoadingScreen message="Loading admin dashboard..." />
      </DashboardLayout>
    );
  }
  
  // Prepare data for charts
  const pieData = [
    { name: 'Patients', value: stats?.patients || 0, color: '#3B82F6' },
    { name: 'Doctors', value: stats?.doctors || 0, color: '#10B981' },
    { name: 'Records', value: stats?.records || 0, color: '#8B5CF6' },
  ];
  
  // Mock activity data for line chart (in real app, get from API)
  const activityData = [
    { day: 'Mon', accesses: 12 },
    { day: 'Tue', accesses: 19 },
    { day: 'Wed', accesses: 15 },
    { day: 'Thu', accesses: 25 },
    { day: 'Fri', accesses: 22 },
    { day: 'Sat', accesses: 8 },
    { day: 'Sun', accesses: 5 },
  ];

  return (
    <DashboardLayout role="admin">
      <Onboarding role="admin" />
      <div className="max-w-7xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleLogoClick}
          className="text-4xl font-bold gradient-text mb-8 cursor-pointer hover:scale-105 transition-transform"
        >
          Admin Dashboard
        </motion.h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass card-3d p-6 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl">
                <UsersIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 font-medium">Total Patients</p>
                <p className="text-3xl font-bold gradient-text">{stats?.patients || 0}</p>
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
              <div className="p-4 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 font-medium">Total Doctors</p>
                <p className="text-3xl font-bold gradient-text">{stats?.doctors || 0}</p>
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
              <div className="p-4 bg-gradient-to-br from-purple-400 to-pink-600 rounded-2xl">
                <DocumentTextIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 font-medium">Total Records</p>
                <p className="text-3xl font-bold gradient-text">{stats?.records || 0}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass card-3d p-6 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-2xl">
                <ClockIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600 font-medium">Pending Requests</p>
                <p className="text-3xl font-bold gradient-text">{stats?.pendingRequests || 0}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Data Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pie Chart */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass card-3d p-6"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">System Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Line Chart */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="glass card-3d p-6"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    border: 'none', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="accesses" 
                  stroke="url(#colorGradient)" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', r: 5 }}
                  activeDot={{ r: 8 }}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="50%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass card-3d"
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-2xl font-semibold text-gray-900">Recent System Activity</h2>
          </div>
          <div className="p-6">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="floating mx-auto w-fit mb-4">
                  <ClockIcon className="h-16 w-16 text-gray-400" />
                </div>
                <p className="text-gray-600">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log, index) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 glass rounded-xl border border-white/20 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg">
                          <UserGroupIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">
                              {log.user_first_name} {log.user_last_name}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium capitalize">
                              {log.role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {log.action} • Patient: {log.patient_first_name} {log.patient_last_name}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 ml-11">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold text-white flex items-center space-x-1 ${getAccessTypeBadge(log.access_type)}`}>
                      {getAccessTypeIcon(log.access_type)}
                      <span className="ml-1">{log.access_type.replace('_', ' ')}</span>
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
