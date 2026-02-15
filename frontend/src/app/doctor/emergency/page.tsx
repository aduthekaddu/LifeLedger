'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { QrCodeIcon, ShieldExclamationIcon, CameraIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Html5Qrcode } from 'html5-qrcode';

export default function DoctorEmergency() {
  const [qrCode, setQrCode] = useState('');
  const [reason, setReason] = useState('');
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [scanMode, setScanMode] = useState<'manual' | 'camera' | 'file' | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup camera on unmount
      if (html5QrCodeRef.current && scanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [scanning]);

  const startCameraScanning = async () => {
    setCameraError('');
    setMessage('');
    
    try {
      // Check if camera is available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        setCameraError('No camera found on this device.');
        return;
      }

      setScanMode('camera');
      setScanning(true);

      // Small delay to ensure DOM is ready
      setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode('qr-reader');
          html5QrCodeRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              // QR code successfully scanned
              console.log('QR Code scanned:', decodedText);
              setQrCode(decodedText);
              stopCameraScanning();
              setScanMode('manual');
              setMessage('QR code scanned successfully!');
            },
            (errorMessage) => {
              // Scanning error (ignore, happens frequently during scanning)
            }
          );
        } catch (error: any) {
          console.error('Camera start error:', error);
          setCameraError(error.message || 'Failed to start camera. Please check permissions.');
          setScanning(false);
          setScanMode(null);
        }
      }, 100);
    } catch (error: any) {
      console.error('Camera permission error:', error);
      setCameraError('Camera permission denied. Please allow camera access and try again.');
      setScanMode(null);
    }
  };

  const stopCameraScanning = async () => {
    if (html5QrCodeRef.current && scanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (error) {
        console.error('Error stopping camera:', error);
      }
    }
    setScanning(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScanMode('file');
    setMessage('Scanning QR code from image...');

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-file');
      
      const decodedText = await html5QrCode.scanFile(file, true);
      setQrCode(decodedText);
      setMessage('QR code scanned successfully!');
      setScanMode('manual');
    } catch (error: any) {
      console.error('File scan error:', error);
      setMessage('Failed to scan QR code from image. Please try another image or enter manually.');
    }
  };

  const handleEmergencyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.post('/access/emergency', { qrCode, reason });
      setPatient(response.data.patient);
      setMessage('Emergency access granted successfully');
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to grant emergency access');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPatient(null);
    setQrCode('');
    setReason('');
    setMessage('');
    setScanMode(null);
    if (scanning) {
      stopCameraScanning();
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
          Emergency Access
        </motion.h1>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass border border-red-200 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-start">
            <ShieldExclamationIcon className="h-6 w-6 text-red-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Emergency Access Protocol</h3>
              <p className="text-sm text-red-800">
                This feature allows immediate access to patient records in emergency situations
                without prior approval. Use only in genuine medical emergencies. All access is logged and audited.
              </p>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl ${
                message.includes('success') || message.includes('successfully') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {!patient ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-8 border border-white/20"
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <QrCodeIcon className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Scan Patient QR Code</h2>
              <p className="text-gray-600">
                Choose a method to access the patient's emergency QR code
              </p>
            </div>

            {/* Scan Method Selection */}
            {!scanMode && (
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startCameraScanning}
                  className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <CameraIcon className="h-12 w-12 mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Scan with Camera</h3>
                  <p className="text-sm text-blue-100">Use device camera</p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <PhotoIcon className="h-12 w-12 mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Upload Image</h3>
                  <p className="text-sm text-purple-100">Select QR image</p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setScanMode('manual')}
                  className="p-6 bg-gradient-to-br from-gray-500 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <QrCodeIcon className="h-12 w-12 mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Manual Entry</h3>
                  <p className="text-sm text-gray-100">Type QR code</p>
                </motion.button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Hidden div for file scanning */}
            <div id="qr-reader-file" className="hidden"></div>

            {/* Camera Scanner */}
            {scanMode === 'camera' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6"
              >
                <div className="relative">
                  <div id="qr-reader" className="rounded-xl overflow-hidden border-4 border-blue-500"></div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      stopCameraScanning();
                      setScanMode(null);
                    }}
                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </motion.button>
                </div>
                {cameraError && (
                  <p className="text-red-600 text-sm mt-2 text-center">{cameraError}</p>
                )}
                <p className="text-gray-600 text-sm mt-4 text-center">
                  Position the QR code within the frame to scan
                </p>
              </motion.div>
            )}

            {/* Manual Entry Form */}
            {scanMode === 'manual' && (
              <motion.form 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleEmergencyAccess} 
                className="space-y-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Enter Details</h3>
                  <button
                    type="button"
                    onClick={() => setScanMode(null)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Back to scan options
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Patient QR Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white/50 backdrop-blur transition"
                    placeholder="Paste or enter QR code data"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The QR code is a unique identifier (UUID format)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Emergency Reason *
                  </label>
                  <textarea
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white/50 backdrop-blur transition"
                    rows={4}
                    placeholder="Describe the emergency situation (e.g., unconscious patient, cardiac arrest, severe trauma...)"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 transition-all disabled:opacity-50 font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Granting Access...
                    </span>
                  ) : (
                    'Grant Emergency Access'
                  )}
                </motion.button>
              </motion.form>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-8 border border-white/20"
          >
            <div className="text-center mb-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <ShieldExclamationIcon className="h-12 w-12 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold gradient-text mb-2">Access Granted</h2>
              <p className="text-gray-600">You now have emergency access to patient records</p>
            </div>

            <div className="glass rounded-xl p-6 mb-6 border border-white/20">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Patient Information
              </h3>
              <div className="space-y-2 text-gray-900">
                <p><span className="font-medium">Name:</span> {patient.firstName} {patient.lastName}</p>
                <p><span className="font-medium">Patient ID:</span> {patient.patientId || patient.id}</p>
                <p><span className="font-medium">Email:</span> {patient.email}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={`/doctor/patients?id=${patient.id}`}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all text-center font-semibold shadow-lg hover:shadow-xl"
              >
                View Records
              </motion.a>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetForm}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
              >
                New Emergency Access
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
