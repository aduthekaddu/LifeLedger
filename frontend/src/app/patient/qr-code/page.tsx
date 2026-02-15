
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { QRCodeSVG } from 'qrcode.react';
import { QrCodeIcon, ArrowPathIcon, ArrowDownTrayIcon, PrinterIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function PatientQRCode() {
  const [qrCode, setQrCode] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadUserData = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      const qrData = parsedUser.qrCode || '';
      if (qrData && qrData.length < 100) {
        setQrCode(qrData);
      }
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleRefreshProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch profile');

      const data = await response.json();
      localStorage.setItem('user', JSON.stringify(data.user));
      loadUserData();
      setError('Profile refreshed successfully!');
    } catch (err) {
      console.error('Refresh error:', err);
      setError('Failed to refresh profile. Please try logging out and back in.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewQR = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/generate-qr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to generate QR code');

      const data = await response.json();

      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        user.qrCode = data.qrCode;
        localStorage.setItem('user', JSON.stringify(user));
        loadUserData();
      }

      setError('New QR code generated successfully!');
    } catch (err) {
      console.error('Generate QR error:', err);
      setError('Failed to generate new QR code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const svg = document.querySelector('#qr-svg') as any;
    if (svg) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const data = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'emergency-qr-code.png';
        link.href = pngUrl;
        link.click();
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout role="patient">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold gradient-text mb-8"
        >
          Emergency QR Code
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass card-3d p-8"
        >
          <div className="text-center mb-8">
            <div className="floating mx-auto w-fit mb-4">
              <div className="p-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl">
                <QrCodeIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <p className="text-gray-700 mb-4 text-lg">
              This QR code allows doctors to access your medical records in emergency situations without prior approval.
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl">
              <ShieldCheckIcon className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-700 font-semibold">
                Keep this QR code secure and only share it in emergencies
              </p>
            </div>
          </div>

          {qrCode ? (
            <div className="flex flex-col items-center space-y-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-8 glass border-4 border-white/30 rounded-2xl card-3d"
              >
                <QRCodeSVG
                  id="qr-svg"
                  value={qrCode}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center glass p-6 rounded-xl border border-white/20 w-full"
              >
                <p className="text-sm text-gray-600 mb-2 font-medium">Patient Information</p>
                <p className="font-semibold text-gray-900 text-xl">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-3 justify-center w-full"
              >
                <button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2 font-medium"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  <span>Download QR Code</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2 font-medium"
                >
                  <PrinterIcon className="h-5 w-5" />
                  <span>Print QR Code</span>
                </button>
                <button
                  onClick={handleGenerateNewQR}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2 font-medium disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Generating...' : 'Generate New'}</span>
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 glass p-6 rounded-xl border border-blue-500/20 w-full"
              >
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center text-lg">
                  <div className="p-1.5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg mr-2">
                    <ShieldCheckIcon className="h-5 w-5 text-white" />
                  </div>
                  How to use
                </h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Print this QR code and keep it in your wallet or phone case</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 mr-2">•</span>
                    <span>In an emergency, show this to medical staff</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-600 mr-2">•</span>
                    <span>Doctors can scan it to instantly access your medical records</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    <span>You'll be notified when your QR code is used</span>
                  </li>
                </ul>
              </motion.div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="floating mx-auto w-fit mb-4">
                <QrCodeIcon className="h-20 w-20 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4 text-lg font-medium">No QR code available.</p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mb-6 p-4 rounded-xl glass ${
                    error.includes('success') ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'
                  }`}
                >
                  <p className={error.includes('success') ? 'text-green-700' : 'text-red-700'}>
                    {error}
                  </p>
                </motion.div>
              )}

              <p className="text-sm text-gray-600 mb-6">
                Try refreshing your profile data, or log out and log back in.
              </p>

              <div className="flex flex-col items-center space-y-3">
                <button
                  onClick={handleRefreshProfile}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2 font-medium"
                >
                  <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Refreshing...' : 'Refresh Profile'}</span>
                </button>

                <button
                  onClick={handleGenerateNewQR}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2 font-medium"
                >
                  <QrCodeIcon className="h-5 w-5" />
                  <span>{loading ? 'Generating...' : 'Generate New QR Code'}</span>
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
                >
                  Logout and Re-login
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
