'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  UserGroupIcon, 
  ClockIcon, 
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  CloudArrowUpIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'patient' | 'doctor' | 'admin';
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== role) {
      router.push(`/${parsedUser.role}/dashboard`);
      return;
    }

    setUser(parsedUser);
  }, [role, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navigation = {
    patient: [
      { name: 'Dashboard', href: '/patient/dashboard', icon: HomeIcon, color: 'from-blue-500 to-cyan-500' },
      { name: 'My Records', href: '/patient/records', icon: DocumentTextIcon, color: 'from-purple-500 to-pink-500' },
      { name: 'Access Requests', href: '/patient/access-requests', icon: UserGroupIcon, color: 'from-green-500 to-emerald-500' },
      { name: 'Access Logs', href: '/patient/access-logs', icon: ClockIcon, color: 'from-orange-500 to-red-500' },
      { name: 'QR Code', href: '/patient/qr-code', icon: ShieldCheckIcon, color: 'from-indigo-500 to-purple-500' },
      { name: 'Profile', href: '/patient/profile', icon: UserCircleIcon, color: 'from-pink-500 to-rose-500' },
    ],
    doctor: [
      { name: 'Dashboard', href: '/doctor/dashboard', icon: HomeIcon, color: 'from-blue-500 to-cyan-500' },
      { name: 'My Patients', href: '/doctor/patients', icon: UserGroupIcon, color: 'from-purple-500 to-pink-500' },
      { name: 'Search Patients', href: '/doctor/search', icon: MagnifyingGlassIcon, color: 'from-green-500 to-emerald-500' },
      { name: 'Upload Record', href: '/doctor/upload-record', icon: CloudArrowUpIcon, color: 'from-orange-500 to-red-500' },
      { name: 'Access Requests', href: '/doctor/access-requests', icon: ClockIcon, color: 'from-indigo-500 to-purple-500' },
      { name: 'Emergency Access', href: '/doctor/emergency', icon: ShieldCheckIcon, color: 'from-red-500 to-pink-500' },
      { name: 'Profile', href: '/doctor/profile', icon: UserCircleIcon, color: 'from-teal-500 to-cyan-500' },
    ],
    admin: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon, color: 'from-blue-500 to-cyan-500' },
      { name: 'Manage Doctors', href: '/admin/doctors', icon: UserGroupIcon, color: 'from-purple-500 to-pink-500' },
      { name: 'Patients', href: '/admin/patients', icon: UserGroupIcon, color: 'from-green-500 to-emerald-500' },
      { name: 'Audit Logs', href: '/admin/audit-logs', icon: ClockIcon, color: 'from-orange-500 to-red-500' },
      { name: 'Profile', href: '/admin/profile', icon: UserCircleIcon, color: 'from-pink-500 to-rose-500' },
    ],
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:bg-[#0a0e27]">
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col w-72 glass border-r border-white/20 lg:hidden"
            >
              <div className="flex items-center justify-between h-16 px-6 border-b border-white/20">
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-50" />
                    <ShieldCheckIcon className="relative h-8 w-8 text-blue-600" />
                  </motion.div>
                  <span className="text-xl font-bold gradient-text">LifeLedger</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/50 transition"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-700" />
                </motion.button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navigation[role].map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      className="group flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-white/50 transition relative overflow-hidden"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                      <div className={`h-10 w-10 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center shadow-lg`}>
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="p-4 border-t border-white/20">
                <div className="flex items-center space-x-3 mb-4 p-3 glass rounded-xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate capitalize">{user.role}</p>
                  </div>
                </div>
                
                {/* Theme Toggle */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleTheme}
                  className="flex items-center justify-center space-x-2 w-full px-4 py-3 mb-3 text-sm font-medium glass rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition"
                >
                  {theme === 'dark' ? (
                    <>
                      <SunIcon className="h-5 w-5 text-yellow-400" />
                      <span className="dark:text-gray-200">Light Mode</span>
                    </>
                  ) : (
                    <>
                      <MoonIcon className="h-5 w-5 text-indigo-600" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="flex items-center justify-center space-x-2 w-full px-4 py-3 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Logout</span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-1 min-h-0 glass border-r border-white/20">
          <div className="flex items-center h-16 px-6 border-b border-white/20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-50" />
              <ShieldCheckIcon className="relative h-8 w-8 text-blue-600" />
            </motion.div>
            <span className="ml-3 text-xl font-bold gradient-text">LifeLedger</span>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation[role].map((item) => (
              <motion.div
                key={item.name}
                whileHover={{ x: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Link
                  href={item.href}
                  className="group flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-white/50 transition relative overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className={`h-10 w-10 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center shadow-lg relative z-10`}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium relative z-10">{item.name}</span>
                </Link>
              </motion.div>
            ))}
          </nav>
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center space-x-3 mb-4 p-3 glass rounded-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate capitalize">{user.role}</p>
              </div>
            </div>
            
            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={toggleTheme}
              className="flex items-center justify-center space-x-2 w-full px-4 py-3 mb-3 text-sm font-medium glass rounded-xl hover:bg-white/50 dark:hover:bg-white/10 transition"
            >
              {theme === 'dark' ? (
                <>
                  <SunIcon className="h-5 w-5 text-yellow-400" />
                  <span className="dark:text-gray-200">Light Mode</span>
                </>
              ) : (
                <>
                  <MoonIcon className="h-5 w-5 text-indigo-600" />
                  <span>Dark Mode</span>
                </>
              )}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="flex items-center justify-center space-x-2 w-full px-4 py-3 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>Logout</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar for mobile */}
        <div className="sticky top-0 z-30 flex h-16 glass border-b border-white/20 lg:hidden">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-gray-700 focus:outline-none"
          >
            <Bars3Icon className="h-6 w-6" />
          </motion.button>
          <div className="flex items-center flex-1 px-4">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold gradient-text">LifeLedger</span>
          </div>
        </div>

        {/* Page content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-8 px-4 sm:px-6 lg:px-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
