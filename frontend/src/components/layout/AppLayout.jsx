import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, LogOut, User, LayoutDashboard, Users, BookOpen, GraduationCap,
  CheckSquare, FileText, MessageSquare, Award, Shield, ChevronDown, ChevronRight,
  School, CreditCard, DollarSign, List, UserPlus, Upload,
  Library, Clock, BookMarked, Activity, Building2, UserCheck, Cog, IndianRupee
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useSettingsStore } from '../../store/settings.store';
import api from '../../lib/api';
import { getInitials } from '../../utils/formatters';

const NavItem = ({ icon: Icon, label, to, end = false, onClick }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${isActive
        ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-500/25 border border-white/10'
        : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`
    }
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </NavLink>
);

const NavGroup = ({ icon: Icon, label, children, active }) => {
  const [isOpen, setIsOpen] = useState(active);

  useEffect(() => {
    if (active) setIsOpen(true);
  }, [active]);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${active
          ? 'bg-white/10 text-white border border-white/5'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {isOpen && (
        <div className="ml-8 mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { schoolName } = useSettingsStore();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  const renderAdminNav = () => (
    <>
      <NavItem to="/admin/dashboard" label="Dashboard" icon={LayoutDashboard} onClick={closeSidebar} />

      <NavGroup
        icon={Users}
        label="Students"
        active={location.pathname.startsWith('/admin/students')}
      >
        <NavItem to="/admin/students" end label="List" icon={List} onClick={closeSidebar} />
        <NavItem to="/admin/students/new" label="Add New" icon={UserPlus} onClick={closeSidebar} />
        <NavItem to="/admin/students/import" label="Import" icon={Upload} onClick={closeSidebar} />
      </NavGroup>

      <NavItem to="/admin/teachers" label="Teachers" icon={GraduationCap} onClick={closeSidebar} />

      <NavGroup
        icon={BookOpen}
        label="Academic"
        active={location.pathname.startsWith('/admin/academic')}
      >
        <NavItem to="/admin/academic/classes" label="Classes" icon={School} onClick={closeSidebar} />
        <NavItem to="/admin/academic/exams" label="Exams" icon={BookMarked} onClick={closeSidebar} />
      </NavGroup>

      <NavItem to="/admin/marks" label="Marks" icon={Award} onClick={closeSidebar} />
      <NavGroup
        icon={CheckSquare}
        label="Attendance"
        active={location.pathname.startsWith('/admin/attendance') || location.pathname.startsWith('/admin/staff-attendance')}
      >
        <NavItem to="/admin/attendance" label="Student Attendance" icon={Users} onClick={closeSidebar} />
        <NavItem to="/admin/staff-attendance" label="Staff Attendance" icon={UserCheck} onClick={closeSidebar} />
      </NavGroup>

      <NavGroup
        icon={CreditCard}
        label="Fees"
        active={location.pathname.startsWith('/admin/fees')}
      >
        <NavItem to="/admin/fees/vouchers" label="Vouchers List" icon={FileText} onClick={closeSidebar} />
        <NavItem to="/admin/fees/vouchers/generate" label="Generate" icon={Cog} onClick={closeSidebar} />
        <NavItem to="/admin/fees/collect" label="Collect Fee" icon={DollarSign} onClick={closeSidebar} />
        <NavItem to="/admin/fees/payments" label="Payments" icon={DollarSign} onClick={closeSidebar} />
        <NavItem to="/admin/fees/outstanding" label="Outstanding" icon={Activity} onClick={closeSidebar} />
        <NavItem to="/admin/fees/structures" label="Fee Structures" icon={CreditCard} onClick={closeSidebar} />
        <NavItem to="/admin/fees/reports" label="Reports" icon={FileText} onClick={closeSidebar} />
      </NavGroup>

      <NavItem to="/admin/messages" label="Messages" icon={MessageSquare} onClick={closeSidebar} />
      <NavItem to="/admin/whatsapp-settings" label="WhatsApp Settings" icon={MessageSquare} onClick={closeSidebar} />
      <NavItem to="/admin/certificates" label="Certificates" icon={Award} onClick={closeSidebar} />
      <NavItem to="/admin/audit-logs" label="Audit Logs" icon={Shield} onClick={closeSidebar} />
      <div className="pt-2 mt-2 border-t border-white/10">
        <NavItem to="/admin/settings" label="Settings" icon={Cog} onClick={closeSidebar} />
      </div>
    </>
  );

  const renderAccountantNav = () => (
    <>
      <NavItem to="/accountant/dashboard" label="Dashboard" icon={LayoutDashboard} onClick={closeSidebar} />
      <NavItem to="/accountant/students" label="Students" icon={Users} onClick={closeSidebar} />
      <NavGroup
        icon={CreditCard}
        label="Fees"
        active={location.pathname.startsWith('/accountant/fees')}
      >
        <NavItem to="/accountant/fees/vouchers" label="Vouchers List" icon={FileText} onClick={closeSidebar} />
        <NavItem to="/accountant/fees/vouchers/generate" label="Generate" icon={Cog} onClick={closeSidebar} />
        <NavItem to="/accountant/fees/collect" label="Collect Fee" icon={DollarSign} onClick={closeSidebar} />
        <NavItem to="/accountant/fees/payments" label="Payments" icon={DollarSign} onClick={closeSidebar} />
        <NavItem to="/accountant/fees/outstanding" label="Outstanding" icon={Activity} onClick={closeSidebar} />
        <NavItem to="/accountant/fees/reports" label="Reports" icon={FileText} onClick={closeSidebar} />
      </NavGroup>
      <div className="pt-2 mt-2 border-t border-white/10">
        <NavItem to="/accountant/settings" label="Settings" icon={Cog} onClick={closeSidebar} />
      </div>
    </>
  );

  const renderTeacherNav = () => (
    <>
      <NavItem to="/teacher/dashboard" label="Dashboard" icon={LayoutDashboard} onClick={closeSidebar} />
      <NavGroup
        icon={Award}
        label="Marks"
        active={location.pathname.startsWith('/teacher/marks')}
      >
        <NavItem to="/teacher/marks/entry" label="Entry" icon={FileText} onClick={closeSidebar} />
        <NavItem to="/teacher/marks/report" label="Report" icon={Activity} onClick={closeSidebar} />
      </NavGroup>
      <NavItem to="/teacher/attendance" label="Attendance" icon={CheckSquare} onClick={closeSidebar} />
      <div className="pt-2 mt-2 border-t border-white/10">
        <NavItem to="/teacher/settings" label="Settings" icon={Cog} onClick={closeSidebar} />
      </div>
    </>
  );

  const renderCeoNav = () => (
    <>
      <NavItem to="/ceo/dashboard" label="Dashboard" icon={LayoutDashboard} onClick={closeSidebar} />
      <NavItem to="/ceo/branches" label="Branches" icon={Building2} onClick={closeSidebar} />
      <NavItem to="/ceo/create-admin" label="Create Admin" icon={UserPlus} onClick={closeSidebar} />
      <NavGroup
        icon={GraduationCap}
        label="Teachers"
        active={location.pathname.startsWith('/ceo/teachers') || location.pathname.startsWith('/ceo/payroll')}
      >
        <NavItem to="/ceo/teachers" end label="List" icon={List} onClick={closeSidebar} />
        <NavItem to="/ceo/payroll" label="Payroll & Salary" icon={IndianRupee} onClick={closeSidebar} />
      </NavGroup>
      <div className="pt-2 mt-2 border-t border-white/10">
        <NavItem to="/ceo/settings" label="Settings" icon={Cog} onClick={closeSidebar} />
      </div>
    </>
  );

  return (
    <div className="layout-root flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-white/5 shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg overflow-hidden p-1">
              <img src="/tss-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wide text-white">
                {schoolName || user?.school?.name || 'SMS Platform'}
              </h1>
              <p className="text-xs text-primary-200 font-medium tracking-wider uppercase">{user?.branch?.name || 'Main Branch'}</p>
            </div>
          </div>
          <button className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white lg:hidden transition-colors" onClick={closeSidebar}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
          {user?.role === 'ceo' && renderCeoNav()}
          {user?.role === 'admin' && renderAdminNav()}
          {user?.role === 'accountant' && renderAccountantNav()}
          {user?.role === 'teacher' && renderTeacherNav()}
        </div>

        <div className="p-4 m-4 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white font-bold shadow-inner">
              {getInitials(user?.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.full_name || 'Admin User'}</p>
              <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-primary-500/20 text-primary-200 uppercase tracking-widest border border-primary-500/30">
                {user?.role || 'Admin'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/95 backdrop-blur-md z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              className="p-2 -ml-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="page-header m-0 p-0 border-none bg-transparent">
              {/* Contextual title handled in pages */}
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            <button
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {getInitials(user?.full_name)}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                <div className="absolute right-0 top-12 mt-2 w-56 rounded-xl shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ring-1 ring-black ring-opacity-5 py-1 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.full_name || 'Admin User'}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email || 'admin@school.com'}</p>
                  </div>
                  <div className="py-1">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                      onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                    >
                      <User className="w-4 h-4 text-slate-400" /> Profile
                    </button>
                  </div>
                  <div className="py-1 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4 text-red-500" /> Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Main Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative bg-slate-50/50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
