'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ShieldCheckIcon, UserGroupIcon, DocumentTextIcon, QrCodeIcon, SparklesIcon, LockClosedIcon, ChartBarIcon, BoltIcon, CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const router = useRouter();
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      router.push(`/${user.role}/dashboard`);
    }
  }, [router]);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:bg-[#0a0e27] overflow-hidden">
      {/* Theme Toggle */}
      <ThemeToggle />
      
      {/* Animated background with mouse tracking */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: mousePosition.x / 20,
            y: mousePosition.y / 20,
          }}
          transition={{ type: "spring", damping: 30 }}
          style={{ top: '10%', left: '10%' }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: -mousePosition.x / 30,
            y: -mousePosition.y / 30,
          }}
          transition={{ type: "spring", damping: 30 }}
          style={{ top: '40%', right: '10%' }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: mousePosition.x / 40,
            y: -mousePosition.y / 40,
          }}
          transition={{ type: "spring", damping: 30 }}
          style={{ bottom: '10%', left: '50%' }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 glass border-b border-white/20 sticky top-0"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          <motion.div
            className="flex items-center space-x-2 sm:space-x-3"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-50"
              />
              <ShieldCheckIcon className="relative h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text">LifeLedger</h1>
          </motion.div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/login" className="text-gray-700 hover:text-blue-600 font-medium px-2 sm:px-4 py-2 rounded-lg hover:bg-white/50 transition text-sm sm:text-base">
                Login
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/register" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 sm:px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition shimmer text-sm sm:text-base">
                Get Started
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20">
        <motion.div style={{ opacity, scale }} className="text-center mb-12 sm:mb-16 md:mb-20">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="mb-4 sm:mb-6"
          >
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-2xl opacity-30"
                />
                <SparklesIcon className="relative h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-blue-500 mx-auto" />
              </div>
            </motion.div>
          </motion.div>

          <motion.h2
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-extrabold mb-4 sm:mb-6 leading-tight px-2"
          >
            <span className="gradient-text">Your Health,</span>
            <br />
            <span className="text-gray-900">Secured Forever</span>
          </motion.h2>

          <motion.p
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 leading-relaxed px-4"
          >
            Enterprise-grade medical record management with{' '}
            <span className="font-semibold text-blue-600">blockchain security</span>,{' '}
            <span className="font-semibold text-purple-600">AI-powered insights</span>, and{' '}
            <span className="font-semibold text-pink-600">instant emergency access</span>.
          </motion.p>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4"
          >
            <motion.div whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
              <Link href="/register" className="group bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-bold shadow-2xl hover:shadow-3xl transition inline-flex items-center justify-center space-x-2 sm:space-x-3 shimmer w-full sm:w-auto">
                <span>Start Free Trial</span>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.div>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
              <Link href="/login" className="glass text-gray-900 px-8 sm:px-12 py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-bold border-2 border-white/50 hover:border-blue-300 transition inline-flex items-center justify-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                <span>Sign In</span>
                <BoltIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-500 px-4"
          >
            {['HIPAA Compliant', 'SOC 2 Certified', 'ISO 27001', 'GDPR Ready'].map((badge, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.1 }}
                className="flex items-center space-x-1 sm:space-x-2"
              >
                <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">{badge}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-16 sm:mb-24 md:mb-32"
        >
          {[
            { number: '10K+', label: 'Active Users', icon: UserGroupIcon },
            { number: '1M+', label: 'Records Secured', icon: DocumentTextIcon },
            { number: '99.9%', label: 'Uptime', icon: ChartBarIcon },
            { number: '<1s', label: 'Access Time', icon: BoltIcon }
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10, scale: 1.05 }}
              className="glass p-4 sm:p-6 rounded-xl sm:rounded-2xl text-center"
            >
              <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2 sm:mb-3" />
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text mb-1 sm:mb-2">{stat.number}</div>
              <div className="text-gray-600 font-medium text-xs sm:text-sm md:text-base">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="mb-16 sm:mb-24 md:mb-32"
        >
          <motion.h3
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-3 sm:mb-4 px-4"
          >
            <span className="gradient-text">Enterprise Features</span>
          </motion.h3>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-gray-600 text-base sm:text-lg md:text-xl mb-8 sm:mb-12 md:mb-16 px-4"
          >
            Everything you need to manage healthcare data securely
          </motion.p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
>
            {[
              {
                icon: ShieldCheckIcon,
                title: "Military-Grade Security",
                description: "AES-256 encryption with blockchain verification for unbreakable protection.",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: UserGroupIcon,
                title: "Smart Access Control",
                description: "AI-powered role management with granular permissions and audit trails.",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: DocumentTextIcon,
                title: "Complete History",
                description: "Immutable audit logs tracking every access and modification in real-time.",
                color: "from-green-500 to-emerald-500"
              },
              {
                icon: QrCodeIcon,
                title: "Emergency Access",
                description: "Instant QR code access for life-saving medical information when it matters most.",
                color: "from-orange-500 to-red-500"
              },
              {
                icon: CloudArrowUpIcon,
                title: "Cloud Storage",
                description: "Unlimited secure cloud storage with automatic backups and version control.",
                color: "from-indigo-500 to-blue-500"
              },
              {
                icon: ChartBarIcon,
                title: "Analytics Dashboard",
                description: "Real-time insights and reports with customizable data visualization.",
                color: "from-pink-500 to-rose-500"
              },
              {
                icon: BoltIcon,
                title: "Lightning Fast",
                description: "Sub-second response times with global CDN and edge computing.",
                color: "from-yellow-500 to-orange-500"
              },
              {
                icon: LockClosedIcon,
                title: "Compliance Ready",
                description: "HIPAA, GDPR, SOC 2 compliant with automated compliance reporting.",
                color: "from-teal-500 to-cyan-500"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="glass p-8 rounded-2xl shadow-xl hover:shadow-2xl transition card-3d group relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.2 }}
                  transition={{ duration: 0.6 }}
                  className={`h-14 w-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg relative z-10`}
                >
                  <feature.icon className="h-8 w-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:gradient-text transition relative z-10">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed relative z-10">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* User Types Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="mb-32"
        >
          <motion.h3
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-4"
          >
            <span className="gradient-text">Built for Everyone</span>
            <br />
            <span className="text-gray-900">in Healthcare</span>
          </motion.h3>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-gray-600 text-xl mb-16"
          >
            Tailored experiences for patients, doctors, and administrators
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Patients",
                color: "from-blue-500 to-cyan-500",
                icon: UserGroupIcon,
                features: [
                  "View complete medical history",
                  "Control access permissions",
                  "Upload documents securely",
                  "Emergency QR code",
                  "Real-time access logs",
                  "Share with family"
                ]
              },
              {
                title: "Doctors",
                color: "from-purple-500 to-pink-500",
                icon: ShieldCheckIcon,
                features: [
                  "Request patient access",
                  "Upload medical records",
                  "Emergency QR scanner",
                  "Advanced patient search",
                  "Collaboration tools",
                  "Prescription management"
                ]
              },
              {
                title: "Administrators",
                color: "from-green-500 to-emerald-500",
                icon: ChartBarIcon,
                features: [
                  "Manage healthcare providers",
                  "System-wide analytics",
                  "Compliance monitoring",
                  "User management",
                  "Audit trail reports",
                  "Security dashboard"
                ]
              }
            ].map((userType, index) => (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0, rotateY: -30 }}
                whileInView={{ y: 0, opacity: 1, rotateY: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                whileHover={{ y: -10, scale: 1.03 }}
                className="relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${userType.color} rounded-3xl blur-xl opacity-50 group-hover:opacity-70 transition`} />
                <div className="relative glass p-8 rounded-3xl shadow-2xl">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className={`h-16 w-16 bg-gradient-to-br ${userType.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
                  >
                    <userType.icon className="h-10 w-10 text-white" />
                  </motion.div>
                  <h4 className="text-3xl font-bold text-gray-900 mb-6">{userType.title}</h4>
                  <ul className="space-y-3">
                    {userType.features.map((feature, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ x: -20, opacity: 0 }}
                        whileInView={{ x: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.2 + idx * 0.1 }}
                        className="flex items-center space-x-3 text-gray-700"
                      >
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 360 }}
                          transition={{ duration: 0.3 }}
                          className={`h-6 w-6 bg-gradient-to-br ${userType.color} rounded-full flex items-center justify-center flex-shrink-0`}
                        >
                          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                        <span className="font-medium">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-20" />
          <div className="relative glass p-16 rounded-3xl text-center">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="inline-block mb-6"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-2xl opacity-50"
                />
                <LockClosedIcon className="relative h-20 w-20 text-blue-600" />
              </div>
            </motion.div>
            <h3 className="text-5xl font-bold mb-4 gradient-text">
              Ready to Secure Your Health Data?
            </h3>
            <p className="text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
              Join thousands of healthcare professionals and patients who trust LifeLedger
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/register" className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-16 py-5 rounded-2xl text-2xl font-bold shadow-2xl hover:shadow-3xl transition inline-flex items-center space-x-3 shimmer">
                <span>Get Started Free</span>
                <SparklesIcon className="h-8 w-8" />
              </Link>
            </motion.div>
            <p className="mt-6 text-gray-500">No credit card required • 14-day free trial • Cancel anytime</p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="relative z-10 glass border-t border-white/20 mt-32 py-12"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold gradient-text">LifeLedger</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-700 font-medium">&copy; 2025 LifeLedger. All rights reserved.</p>
              <p className="text-gray-500 mt-1">HIPAA-compliant • Blockchain-secured • AI-powered</p>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
