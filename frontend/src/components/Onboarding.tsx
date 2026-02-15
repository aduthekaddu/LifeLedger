'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  target?: string;
}

interface OnboardingProps {
  role: 'patient' | 'doctor' | 'admin';
}

const onboardingSteps = {
  patient: [
    {
      title: 'Welcome to LifeLedger! 🎉',
      description: 'Your secure medical record management system. Let\'s take a quick tour!',
      icon: '👋',
    },
    {
      title: 'Your Dashboard',
      description: 'View your medical records, access requests, and important notifications here.',
      icon: '📊',
    },
    {
      title: 'Emergency QR Code',
      description: 'Generate and download your emergency QR code for instant medical access.',
      icon: '📱',
    },
    {
      title: 'Manage Access',
      description: 'Control which doctors can access your medical records. You\'re in charge!',
      icon: '🔐',
    },
    {
      title: 'Upload Records',
      description: 'Keep all your medical documents in one secure place.',
      icon: '📄',
    },
  ],
  doctor: [
    {
      title: 'Welcome, Doctor! 👨‍⚕️',
      description: 'Manage your patients and access medical records securely.',
      icon: '🏥',
    },
    {
      title: 'Search Patients',
      description: 'Find patients by name, email, or Patient ID to request access.',
      icon: '🔍',
    },
    {
      title: 'Request Access',
      description: 'Send access requests to patients with a reason for access.',
      icon: '📝',
    },
    {
      title: 'Emergency Access',
      description: 'Use QR codes for immediate access in emergency situations.',
      icon: '🚨',
    },
    {
      title: 'Upload Records',
      description: 'Add medical records for your patients after receiving access.',
      icon: '📤',
    },
  ],
  admin: [
    {
      title: 'Admin Dashboard 👑',
      description: 'Monitor system activity and manage users.',
      icon: '⚙️',
    },
    {
      title: 'Manage Doctors',
      description: 'Add, edit, or deactivate doctor accounts.',
      icon: '👥',
    },
    {
      title: 'View Patients',
      description: 'Monitor all registered patients in the system.',
      icon: '📋',
    },
    {
      title: 'Audit Logs',
      description: 'Track all system activity and access logs for compliance.',
      icon: '📊',
    },
  ],
};

export default function Onboarding({ role }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);
  const steps = onboardingSteps[role];

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(`onboarding_${role}`);
    if (!hasSeenOnboarding) {
      setTimeout(() => setShow(true), 1000);
    }
  }, [role]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    localStorage.setItem(`onboarding_${role}`, 'true');
    setShow(false);
  };

  const handleSkip = () => {
    localStorage.setItem(`onboarding_${role}`, 'true');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={handleSkip}
          />

          {/* Onboarding Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-lg mx-4"
          >
            <div className="glass card-3d p-8 relative">
              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>

              {/* Icon */}
              <motion.div
                key={currentStep}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="text-6xl mb-6 text-center"
              >
                {steps[currentStep].icon}
              </motion.div>

              {/* Content */}
              <motion.div
                key={`content-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-2xl font-bold gradient-text mb-4 text-center">
                  {steps[currentStep].title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
                  {steps[currentStep].description}
                </p>
              </motion.div>

              {/* Progress dots */}
              <div className="flex justify-center space-x-2 mb-6">
                {steps.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-600'
                        : 'w-2 bg-gray-300 dark:bg-gray-600'
                    }`}
                    animate={{
                      scale: index === currentStep ? 1.2 : 1,
                    }}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  <span>Back</span>
                </button>

                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Skip Tour
                </button>

                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2 font-medium"
                >
                  <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
                  <ArrowRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
