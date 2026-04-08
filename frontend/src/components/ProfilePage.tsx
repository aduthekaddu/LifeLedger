'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { UserCircleIcon, KeyIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ProfilePageProps {
  role: 'patient' | 'doctor' | 'admin';
}

export default function ProfilePage({ role }: ProfilePageProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoadError('');
      const response = await api.get('/auth/profile');
      setUser(response.data.user);
      setFormData({
        firstName: response.data.user.firstName || response.data.user.first_name || '',
        lastName: response.data.user.lastName || response.data.user.last_name || '',
        phoneNumber: response.data.user.phoneNumber || response.data.user.phone_number || '',
        dateOfBirth: response.data.user.dateOfBirth || response.data.user.date_of_birth || '',
        address: response.data.user.address || '',
        emergencyContact: response.data.user.emergencyContact || response.data.user.emergency_contact || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoadError('Unable to load profile. Please make sure the backend is running and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      await api.put('/auth/profile', formData);
      setMessage('Profile updated successfully');
      setEditing(false);
      fetchProfile();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage('Password must be at least 8 characters');
      return;
    }

    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setMessage('Password changed successfully');
      setChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to change password');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Profile unavailable</h2>
          <p className="text-red-700">{loadError || 'Could not load your profile right now.'}</p>
          <button
            type="button"
            onClick={fetchProfile}
            className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const patientId = user.patientId || user.patient_id;

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold gradient-text mb-2">Profile Settings</h1>
        <p className="text-gray-600 mb-8">Manage your account information</p>
      </motion.div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-xl ${
              message.includes('success') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl border border-white/20 mb-6 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-white/20 bg-gradient-to-r from-blue-50 to-purple-50 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg mr-3">
              <UserCircleIcon className="h-6 w-6 text-white" />
            </div>
            Profile Information
          </h2>
          {!editing && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
            >
              <PencilIcon className="h-4 w-4" />
              <span>Edit Profile</span>
            </motion.button>
          )}
        </div>
        <div className="p-6">
          {!editing ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { label: 'Name', value: `${user.firstName || user.first_name} ${user.lastName || user.last_name}` },
                { label: 'Email', value: user.email },
                ...(user.role === 'patient' && patientId ? [{ label: 'Patient ID', value: <span className="font-mono font-bold text-lg gradient-text">{patientId}</span> }] : []),
                { label: 'Role', value: <span className="capitalize px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">{user.role}</span> },
                { label: 'Phone', value: user.phoneNumber || user.phone_number || 'Not provided' },
                { label: 'Date of Birth', value: user.dateOfBirth || user.date_of_birth ? new Date(user.dateOfBirth || user.date_of_birth).toLocaleDateString() : 'Not provided' },
                { label: 'Address', value: user.address || 'Not provided' },
                { label: 'Emergency Contact', value: user.emergencyContact || user.emergency_contact || 'Not provided' },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass p-4 rounded-xl border border-white/20"
                >
                  <p className="text-sm text-gray-600 mb-1">{item.label}</p>
                  <p className="text-gray-900 font-medium">{item.value}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white/50 backdrop-blur transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white/50 backdrop-blur transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white/50 backdrop-blur transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white/50 backdrop-blur transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white/50 backdrop-blur transition"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white/50 backdrop-blur transition"
                />
              </div>
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
                >
                  <CheckIcon className="h-5 w-5" />
                  <span>Save Changes</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                  <span>Cancel</span>
                </motion.button>
              </div>
            </form>
          )}
        </div>
      </motion.div>

      {/* Change Password */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl border border-white/20 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-white/20 bg-gradient-to-r from-orange-50 to-red-50 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg mr-3">
              <KeyIcon className="h-6 w-6 text-white" />
            </div>
            Change Password
          </h2>
          {!changingPassword && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setChangingPassword(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
            >
              <KeyIcon className="h-4 w-4" />
              <span>Change Password</span>
            </motion.button>
          )}
        </div>
        {changingPassword && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6"
          >
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white/50 backdrop-blur transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white/50 backdrop-blur transition"
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white/50 backdrop-blur transition"
                />
              </div>
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
                >
                  <CheckIcon className="h-5 w-5" />
                  <span>Change Password</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setChangingPassword(false)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                  <span>Cancel</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
