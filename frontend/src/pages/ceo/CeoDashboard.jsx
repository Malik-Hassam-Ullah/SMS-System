import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, IndianRupee, ShieldCheck, Loader2,
  ArrowUpRight, TrendingUp, Activity, Plus, UserPlus,
  Settings, Calendar, Search, CheckCircle2, ArrowRight,
  BarChart2, LineChart, PieChart as PieIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, AreaChart, Area
} from 'recharts';
import { getDashboardStats, getBranches, getUsers } from '../../api';
import { useAuthStore } from '../../store/auth.store';

const COLORS = ['#6366f1', '#d946ef', '#10b981', '#f59e0b', '#3b82f6'];

// Premium Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-2xl text-white text-xs space-y-2">
        <p className="font-bold text-slate-300 border-b border-slate-800 pb-1.5 mb-1.5">{label}</p>
        {payload.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.fill }}></div>
              <span className="text-slate-400 font-medium">{p.name}:</span>
            </div>
            <span className="font-mono font-bold text-white">
              {p.name === 'Revenue' ? `PKR ${p.value.toLocaleString()}` : `${p.value.toLocaleString()} Students`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function CeoDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBranches: 0,
    totalAdmins: 0,
    totalStudents: 0,
    totalRevenue: 0
  });
  const [branchStats, setBranchStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeChartTab, setActiveChartTab] = useState('combined'); // 'combined', 'revenue', 'students'

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchCeoData = async () => {
      try {
        const [statsRes, branchesRes, usersRes] = await Promise.all([
          getDashboardStats(),
          getBranches(),
          getUsers()
        ]);

        const branches = branchesRes || [];
        const users = usersRes || [];
        const dashboardStats = statsRes || { totalStudents: 0, totalRevenue: 0, branchStats: [] };

        setStats({
          totalBranches: branches.length,
          totalAdmins: users.filter(u => u.role === 'admin').length,
          totalStudents: dashboardStats.totalStudents,
          totalRevenue: dashboardStats.totalRevenue
        });
        setBranchStats(dashboardStats.branchStats || []);
      } catch (err) {
        console.error('Failed to fetch CEO dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCeoData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 font-medium">Loading CEO Intelligence Dashboard...</p>
      </div>
    );
  }

  const chartData = branchStats.map(b => ({
    name: b.name,
    Revenue: b.revenue,
    Students: b.studentCount
  }));

  const studentDistribution = branchStats.map(b => ({
    name: b.name,
    value: b.studentCount
  }));

  const filteredBranches = branchStats.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Dynamic greeting based on time
  const getGreeting = () => {
    const hrs = currentTime.getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Premium Glassmorphic Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-slate-800">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              All Systems Operational
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              {getGreeting()}, Chief Executive Officer
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl">
              Welcome back! Monitor your school network's real-time performance, operational health, and financial growth. Empowering leadership to make data-driven decisions for a brighter educational future.
            </p>
          </div>

          {/* Live Clock & Date */}
          <div className="flex flex-col items-end bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md min-w-[200px]">
            <div className="flex items-center gap-2 text-indigo-300 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">System Time</span>
            </div>
            <span className="text-2xl font-black tracking-widest font-mono text-white">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-xs text-slate-400 font-medium mt-1">
              {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Vibrant Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Card 1: Total Branches */}
        <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Branches</p>
              <h3 className="text-3xl font-black text-slate-900">{stats.totalBranches}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 w-fit px-2.5 py-1 rounded-full">
            <Activity className="w-3.5 h-3.5" /> Active Campuses
          </div>
        </div>

        {/* Card 2: System Admins */}
        <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">System Admins</p>
              <h3 className="text-3xl font-black text-slate-900">{stats.totalAdmins}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-fuchsia-600 bg-fuchsia-50 w-fit px-2.5 py-1 rounded-full">
            <Activity className="w-3.5 h-3.5" /> Branch Managers
          </div>
        </div>

        {/* Card 3: Total Students */}
        <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Students</p>
              <h3 className="text-3xl font-black text-slate-900">{stats.totalStudents.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 w-fit px-2.5 py-1 rounded-full">
            <Activity className="w-3.5 h-3.5" /> Active Enrollments
          </div>
        </div>

        {/* Card 4: Monthly Revenue */}
        <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Month Revenue</p>
              <h3 className="text-3xl font-black text-slate-900">PKR {stats.totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-full">
            <TrendingUp className="w-3.5 h-3.5" /> Collection YTD
          </div>
        </div>

      </div>

      {/* Redesigned Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Card: Financial & Student Analytics (Composed/Area/Bar Chart) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <TrendingUp className="text-indigo-600 w-5 h-5" /> Branch Performance Analytics
              </h3>
              <p className="text-xs text-slate-500">Compare financial collection and student strength across campuses</p>
            </div>

            {/* Interactive Chart Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start sm:self-auto">
              <button
                onClick={() => setActiveChartTab('combined')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeChartTab === 'combined'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Activity className="w-3.5 h-3.5" /> Combined
              </button>
              <button
                onClick={() => setActiveChartTab('revenue')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeChartTab === 'revenue'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <IndianRupee className="w-3.5 h-3.5" /> Revenue
              </button>
              <button
                onClick={() => setActiveChartTab('students')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeChartTab === 'students'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Users className="w-3.5 h-3.5" /> Students
              </button>
            </div>
          </div>

          <div className="p-6 h-[380px] w-full flex-grow">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === 'combined' ? (
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar yAxisId="left" dataKey="Revenue" fill="url(#colorRevenue)" name="Revenue" radius={[6, 6, 0, 0]} barSize={36} />
                    <Line yAxisId="right" type="monotone" dataKey="Students" stroke="#6366f1" strokeWidth={3} name="Students" dot={{ r: 5, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 7 }} />
                  </ComposedChart>
                ) : activeChartTab === 'revenue' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenueOnly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenueOnly)" name="Revenue" dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStudentsOnly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="Students" fill="url(#colorStudentsOnly)" name="Students" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Activity className="w-12 h-12 mb-2 stroke-1" />
                <p className="text-sm">No analytics data available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Modern Donut Chart with Center Text & Progress Legend */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <PieIcon className="text-indigo-600 w-5 h-5" /> Student Distribution
            </h3>
          </div>

          <div className="p-6 flex-grow flex flex-col items-center justify-center gap-6">
            {chartData.length > 0 && stats.totalStudents > 0 ? (
              <>
                {/* Donut Chart with Center Text */}
                <div className="relative w-full h-[200px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={studentDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {studentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalStudents.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Students</span>
                  </div>
                </div>

                {/* Progress Bar Legend */}
                <div className="w-full flex flex-col gap-3.5">
                  {studentDistribution.map((entry, index) => {
                    const percentage = stats.totalStudents > 0 ? Math.round((entry.value / stats.totalStudents) * 100) : 0;
                    return (
                      <div key={entry.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-slate-700">{entry.name}</span>
                          </div>
                          <span className="text-slate-900 font-bold">{entry.value} ({percentage}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                <Users className="w-12 h-12 mb-2 stroke-1" />
                <p className="text-sm">No student distribution data available.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">Quick Executive Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <button
            onClick={() => navigate('/ceo/branches')}
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">Add New Branch</h4>
              <p className="text-xs text-slate-500 mt-0.5">Setup a new school campus</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/ceo/create-admin')}
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-fuchsia-200 hover:bg-fuchsia-50/30 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center shrink-0 group-hover:bg-fuchsia-100 transition-colors">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm group-hover:text-fuchsia-600 transition-colors">Register Staff</h4>
              <p className="text-xs text-slate-500 mt-0.5">Create admins & accountants</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/ceo/teachers')}
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm group-hover:text-amber-600 transition-colors">View Teachers</h4>
              <p className="text-xs text-slate-500 mt-0.5">Manage teacher directories</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/ceo/branches')}
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">System Settings</h4>
              <p className="text-xs text-slate-500 mt-0.5">Configure branch details</p>
            </div>
          </button>

        </div>
      </div>

      {/* Branch Performance Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Branch Performance Directory</h3>
            <p className="text-slate-500 text-xs mt-0.5">Overview of students, revenue, and status for each campus</p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search branches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-xs transition-colors shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Branch Name</th>
                <th className="px-6 py-4">Students</th>
                <th className="px-6 py-4">Monthly Revenue</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBranches.length > 0 ? (
                filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{branch.name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {branch.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{branch.studentCount}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Enrolled</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-emerald-600">PKR {branch.revenue.toLocaleString()}</div>
                      <div className="text-xs text-slate-400 mt-0.5">This Month</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate('/ceo/branches')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        Manage <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400 font-medium">No branches found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
