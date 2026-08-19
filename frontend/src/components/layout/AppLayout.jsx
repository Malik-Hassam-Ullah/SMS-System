import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, LogOut, User, LayoutDashboard, Users, BookOpen, GraduationCap,
  CheckSquare, FileText, MessageSquare, Award, Shield, ChevronDown, ChevronRight,
  School, CreditCard, DollarSign, List, UserPlus, Upload,
  Library, Clock, BookMarked, Activity, Building2, UserCheck, Cog, IndianRupee, Receipt, Power
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useSettingsStore } from '../../store/settings.store';
import { getSidebarTheme, SIDEBAR_THEMES } from '../../config/sidebarThemes';
import api from '../../lib/api';
import { getInitials } from '../../utils/formatters';

const SidebarThemeContext = React.createContext(SIDEBAR_THEMES[0]);

const SidebarDivider = () => {
  const theme = React.useContext(SidebarThemeContext);
  return <div className={`pt-2 mt-2 border-t ${theme.divider || 'border-white/10'}`} />;
};

const NavItem = ({ icon: Icon, label, to, end = false, onClick }) => {
  const theme = React.useContext(SidebarThemeContext);
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
          isActive ? theme.navActive : theme.navDefault
        }`
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
};

const NavGroup = ({ icon: Icon, label, children, active }) => {
  const [isOpen, setIsOpen] = useState(active);
  const theme = React.useContext(SidebarThemeContext);

  useEffect(() => {
    if (active) setIsOpen(true);
  }, [active]);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
          active ? theme.groupActive : theme.groupDefault
        }`}
      >
        <div className="flex items-center gap-3 truncate">
          <Icon className="w-5 h-5 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        {isOpen ? (
          <ChevronDown className={`w-4 h-4 shrink-0 ${theme.groupChevron}`} />
        ) : (
          <ChevronRight className={`w-4 h-4 shrink-0 ${theme.groupChevron}`} />
        )}
      </button>
      {isOpen && (
        <div className={`ml-5 pl-2.5 mt-1 space-y-1 border-l ${theme.groupBorder || 'border-white/10'}`}>
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
  const sidebarTheme = useSettingsStore(s => s.sidebarTheme);
  const currentSidebarTheme = getSidebarTheme(sidebarTheme);

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
      <SidebarDivider />
      <NavItem to="/admin/settings" label="Settings" icon={Cog} onClick={closeSidebar} />
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
      <NavItem to="/accountant/expenses" label="Expenses" icon={Receipt} onClick={closeSidebar} />
      <SidebarDivider />
      <NavItem to="/accountant/settings" label="Settings" icon={Cog} onClick={closeSidebar} />
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
      <SidebarDivider />
      <NavItem to="/teacher/settings" label="Settings" icon={Cog} onClick={closeSidebar} />
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
      <NavItem to="/ceo/expenses" label="Expenses & Approvals" icon={Receipt} onClick={closeSidebar} />
      <SidebarDivider />
      <NavItem to="/ceo/settings" label="Settings" icon={Cog} onClick={closeSidebar} />
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
      <SidebarThemeContext.Provider value={currentSidebarTheme}>
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 ${currentSidebarTheme.asideBg} shadow-2xl transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className={`flex items-center justify-between h-20 px-6 backdrop-blur-xl ${currentSidebarTheme.headerBg}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg overflow-hidden p-1 border border-black/10">
                <img src="/tss-logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className={`text-lg font-black tracking-wide truncate ${currentSidebarTheme.titleText || 'text-white'}`}>
                  {schoolName || user?.school?.name || 'SMS Platform'}
                </h1>
                <p className={`text-xs font-medium tracking-wider uppercase ${currentSidebarTheme.subtitleText}`}>
                  {user?.branch?.name || 'Main Branch'}
                </p>
              </div>
            </div>
            <button className="p-2 rounded-lg opacity-75 hover:opacity-100 hover:bg-black/10 lg:hidden transition-colors" onClick={closeSidebar}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
            {user?.role === 'ceo' && renderCeoNav()}
            {user?.role === 'admin' && renderAdminNav()}
            {user?.role === 'accountant' && renderAccountantNav()}
            {user?.role === 'teacher' && renderTeacherNav()}
          </div>

          {/* Unique Executive Glass Profile & Power Logout Card */}
          <div className="p-3 m-3">
            <div className={`relative group overflow-hidden backdrop-blur-xl border rounded-2xl p-3.5 transition-all duration-300 ${currentSidebarTheme.profileCard}`}>
              {/* Top subtle light accent */}
              <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r ${currentSidebarTheme.profileTopAccent}`}></div>

              <div className="flex items-center justify-between gap-3">
                {/* Left: User Avatar with Live Online Pulse */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-indigo-500 to-accent-400 flex items-center justify-center text-white font-black text-sm shadow-md shadow-primary-500/20 border border-white/20">
                    {getInitials(user?.full_name)}
                  </div>
                  {/* Live Status Pulse */}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
                  </span>
                </div>

                {/* Center: User Details */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-black truncate tracking-wide ${currentSidebarTheme.profileName}`}>
                    {user?.full_name || 'Admin User'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${currentSidebarTheme.roleBadge}`}>
                      {user?.role === 'admin' ? 'Campus Officer' : user?.role === 'ceo' ? 'Executive CEO' : user?.role === 'accountant' ? 'Accountant' : 'Faculty'}
                    </span>
                    <span className={`text-[10px] font-mono truncate ${currentSidebarTheme.profileSub}`}>
                      {user?.branch?.code || '02-01-070'}
                    </span>
                  </div>
                </div>

                {/* Right: Futuristic Glowing Red Power Button */}
                <button
                  onClick={handleLogout}
                  title="Sign Out / Logout"
                  className={`relative shrink-0 w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 group/btn focus:outline-none focus:ring-2 focus:ring-rose-400/50 cursor-pointer ${currentSidebarTheme.powerButton}`}
                >
                  <Power className={`w-5 h-5 stroke-[2.5] ${currentSidebarTheme.powerIcon || 'text-white'} group-hover/btn:rotate-90 group-hover/btn:scale-110 transition-all duration-300`} />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </SidebarThemeContext.Provider>

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
