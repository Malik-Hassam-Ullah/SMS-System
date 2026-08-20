import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, BookOpen, Clock, Activity, Loader2, TrendingUp, Trophy, 
  ArrowUpRight, ArrowRight, Receipt, DollarSign, Wallet, CheckCircle2, 
  AlertCircle, Calendar, PlusCircle, CreditCard, ChevronRight, Sparkles 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import RealtimeCalendar from '../../components/common/RealtimeCalendar';

// Custom sleek Glassmorphism Tooltips
const CustomRevenueTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/60 text-xs">
        <p className="font-bold text-slate-300 mb-1 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" /> {label}
        </p>
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
          <span className="text-slate-400 font-medium">Revenue:</span>
          <span className="font-black text-emerald-400 text-sm">PKR {Number(payload[0].value).toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/60 text-xs">
        <p className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></span>
          {label} Vouchers
        </p>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
          <span className="text-slate-400 font-medium">Total Count:</span>
          <span className="font-black text-white text-sm">{payload[0].value} vouchers</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('admin_dashboard_cache');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!dashboardData);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.getCached('/dashboard');
        if (response.data) {
          setDashboardData(response.data);
          try {
            sessionStorage.setItem('admin_dashboard_cache', JSON.stringify(response.data));
          } catch {}
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Generate continuous 6-month timeline for fluid visual representation
  const revenueData = useMemo(() => {
    const dataMap = {};
    if (dashboardData?.monthlyChart && Array.isArray(dashboardData.monthlyChart)) {
      dashboardData.monthlyChart.forEach(item => {
        dataMap[item.month] = item.amount;
      });
    }

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleString('en-US', { month: 'short' });
      months.push({
        name,
        monthKey: key,
        amount: dataMap[key] || 0
      });
    }
    return months;
  }, [dashboardData]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  const branchInfo = dashboardData?.branchInfo || {
    name: 'The Smart School Kahuta Campus',
    code: '02-01-070',
    email: 'nr01070@thesmartschools.edu.pk',
    phone: '051-3311517',
    address: '387/A Near PTCL Exchange Main Tehsil Road Kahuta'
  };

  const overview = dashboardData?.overview || {
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalVouchers: 0,
    todayCollection: 0,
    monthCollection: 0,
    totalOutstanding: 0,
    assignedStudents: 0,
    unassignedStudents: 0,
    droppedStudents: 0,
    pendingRegistrations: 0,
    siblings: 0,
    absentStudents: 0,
    transferStudents: 0
  };

  const feeStats = dashboardData?.feeStats || {
    paid: 0,
    unpaid: 0,
    partial: 0,
    overdue: 0
  };

  const recentPayments = dashboardData?.recentPayments || [];

  // Format fee status breakdown data with vibrant palette
  const totalVouchersCount = (feeStats.paid + feeStats.unpaid + feeStats.partial + feeStats.overdue) || overview.totalVouchers || 1;
  const collectionRate = Math.min(100, Math.round(((feeStats.paid + (feeStats.partial * 0.5)) / totalVouchersCount) * 100));

  const feeBreakdownData = [
    { name: 'Paid', count: feeStats.paid, color: '#10b981', bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'Unpaid', count: feeStats.unpaid, color: '#6366f1', bgClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { name: 'Partial', count: feeStats.partial, color: '#f59e0b', bgClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    { name: 'Overdue', count: feeStats.overdue, color: '#ef4444', bgClass: 'bg-rose-50 text-rose-700 border-rose-200' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium p-6 rounded-2xl">
        <div className="flex items-center gap-2 text-slate-600 mb-2">
          <BookOpen className="w-5 h-5" />
          <span className="font-semibold">{branchInfo.name} : {branchInfo.code}</span>
        </div>
        <h1 className="text-3xl font-black text-red-600 tracking-tight mb-4">
          Welcome to TSS Portal, {branchInfo.name} 0!
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 text-slate-600 text-sm font-medium">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            {branchInfo.email}
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
            {branchInfo.phone}
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            {branchInfo.address}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Campus Statistics */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Campus Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

            {/* Enrolled Students */}
            <div className="card border-0 bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30 overflow-hidden relative p-4">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-primary-100 text-xs font-bold uppercase tracking-wider mb-1">Enrolled Students</p>
                  <h3 className="text-3xl font-black">{overview.totalStudents}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Assigned Students */}
            <div className="card border-0 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 overflow-hidden relative p-4">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Assigned Students</p>
                  <h3 className="text-3xl font-black">{overview.assignedStudents}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Un-assigned Students */}
            <div className="card border-0 bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-lg shadow-slate-500/30 overflow-hidden relative p-4">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-slate-100 text-xs font-bold uppercase tracking-wider mb-1">Un-assigned Students</p>
                  <h3 className="text-3xl font-black">{overview.unassignedStudents}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Pending Registrations */}
            <div className="card border-0 bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/30 overflow-hidden relative p-4">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-xs font-bold uppercase tracking-wider mb-1">Pending Reg.</p>
                  <h3 className="text-3xl font-black">{overview.pendingRegistrations}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Dropped Students */}
            <div className="card border-0 bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-500/30 overflow-hidden relative p-4">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">Dropped Students</p>
                  <h3 className="text-3xl font-black">{overview.droppedStudents}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Sibling */}
            <div className="card border-0 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/30 overflow-hidden relative p-4">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Sibling</p>
                  <h3 className="text-3xl font-black">{overview.siblings}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Absent Student */}
            <div className="card border-0 bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-500/30 overflow-hidden relative p-4">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-rose-100 text-xs font-bold uppercase tracking-wider mb-1">Absent Student</p>
                  <h3 className="text-3xl font-black">{overview.absentStudents}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Transfer Student */}
            <div className="card border-0 bg-gradient-to-br from-cyan-500 to-cyan-700 text-white shadow-lg shadow-cyan-500/30 overflow-hidden relative p-4">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-xs font-bold uppercase tracking-wider mb-1">Transfer Student</p>
                  <h3 className="text-3xl font-black">{overview.transferStudents}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <ArrowUpRight className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Teaching Staff */}
            <div className="card border-0 bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 text-white shadow-lg shadow-fuchsia-500/30 overflow-hidden relative p-4">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-fuchsia-100 text-xs font-bold uppercase tracking-wider mb-1">Teaching Staff</p>
                  <h3 className="text-3xl font-black">{overview.totalTeachers}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Calendar */}
        <div>
          {/* Real-time Calendar */}
          <RealtimeCalendar />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Overview Card */}
        <div className="card p-0 overflow-hidden bg-white/85 backdrop-blur-xl border border-white/80 shadow-premium hover:shadow-xl transition-all duration-300 rounded-3xl">
          <div className="p-6 border-b border-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg tracking-tight">Revenue Overview</h3>
                <p className="text-xs text-slate-400 font-medium">6-month fee collection trend</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                This Month: <span className="font-black">PKR {overview.monthCollection.toLocaleString()}</span>
              </span>
            </div>
          </div>
          
          <div className="p-6 pt-4 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 15, right: 15, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenueGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="60%" stopColor="#10b981" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  width={45}
                />
                <RechartsTooltip content={<CustomRevenueTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={3.5} 
                  fillOpacity={1} 
                  fill="url(#colorRevenueGlow)" 
                  activeDot={{ r: 7, fill: '#10b981', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Voucher Status Breakdown Card */}
        <div className="card p-0 overflow-hidden bg-white/85 backdrop-blur-xl border border-white/80 shadow-premium hover:shadow-xl transition-all duration-300 rounded-3xl">
          <div className="p-6 border-b border-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg tracking-tight">Voucher Status</h3>
                <p className="text-xs text-slate-400 font-medium">Distribution by payment state</p>
              </div>
            </div>
            <span className="bg-slate-100 text-slate-700 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold">
              {overview.totalVouchers || totalVouchersCount} Total Vouchers
            </span>
          </div>

          {/* Quick status pill counters */}
          <div className="px-6 pt-4 grid grid-cols-4 gap-2">
            {feeBreakdownData.map((item) => (
              <div key={item.name} className={`p-2 rounded-xl text-center border text-xs font-semibold ${item.bgClass}`}>
                <p className="opacity-75 text-[10px] uppercase font-bold">{item.name}</p>
                <p className="text-base font-black mt-0.5">{item.count}</p>
              </div>
            ))}
          </div>

          <div className="p-6 pt-2 h-[225px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeBreakdownData} margin={{ top: 15, right: 15, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                  dy={8} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                  width={40}
                />
                <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={36}>
                  {feeBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Recent Payments & Action / Health Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Payments (7 cols) */}
        <div className="lg:col-span-7 card p-0 overflow-hidden bg-white/85 backdrop-blur-xl border border-white/80 shadow-premium hover:shadow-xl transition-all duration-300 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-100/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/25">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">Recent Payments</h2>
                  <p className="text-xs text-slate-400 font-medium">Real-time fee transaction log</p>
                </div>
              </div>
              <Link 
                to="/admin/fees/payments" 
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95"
              >
                View All <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>

            <div className="p-6 space-y-3">
              {recentPayments.length > 0 ? (
                recentPayments.slice(0, 4).map((payment) => {
                  const method = (payment.payment_method || 'Cash').toLowerCase();
                  const isCash = method.includes('cash');
                  const isBank = method.includes('bank');

                  return (
                    <div 
                      key={payment.id} 
                      className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 hover:bg-white hover:shadow-md hover:border-slate-200/80 border border-slate-100/80 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          isCash ? 'bg-emerald-100/80 text-emerald-600' : isBank ? 'bg-blue-100/80 text-blue-600' : 'bg-purple-100/80 text-purple-600'
                        }`}>
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate group-hover:text-primary-600 transition-colors">
                            {payment.students?.full_name || 'Student'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                              {payment.students?.registration_number || 'N/A'}
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              isCash ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {payment.payment_method || 'Cash'}
                            </span>
                            {payment.fee_vouchers?.fee_month && (
                              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                                ({payment.fee_vouchers.fee_month})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <div className="font-black text-emerald-600 text-base">
                          + PKR {payment.amount.toLocaleString()}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(payment.payment_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10">
                  <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-500">No recent payments recorded yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Payments collected will instantly appear here.</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100/60 text-center">
            <Link 
              to="/admin/fees/collect"
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Collect New Payment
            </Link>
          </div>
        </div>

        {/* Financial Summary & Quick Actions (5 cols) */}
        <div className="lg:col-span-5 card p-0 overflow-hidden bg-white/85 backdrop-blur-xl border border-white/80 shadow-premium hover:shadow-xl transition-all duration-300 rounded-3xl flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-500/25">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg tracking-tight">Collection Summary</h3>
                <p className="text-xs text-slate-400 font-medium">Billing & cashflow health</p>
              </div>
            </div>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
              {collectionRate}% Collected
            </span>
          </div>

          <div className="p-6 space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                <span>Fee Recovery Progress</span>
                <span className="text-emerald-600 font-black">{collectionRate}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, collectionRate)}%` }}
                ></div>
              </div>
            </div>

            {/* 3 Metric Mini Cards */}
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-emerald-500/30">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Today's Collection</p>
                    <p className="text-[11px] text-emerald-600 font-medium">Recorded today</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-700">
                    PKR {overview.todayCollection.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-indigo-500/30">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-800">This Month's Total</p>
                    <p className="text-[11px] text-indigo-600 font-medium">Current billing cycle</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-indigo-700">
                    PKR {overview.monthCollection.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-rose-500/30">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-rose-800">Total Outstanding Dues</p>
                    <p className="text-[11px] text-rose-600 font-medium">Pending balance</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-rose-700">
                    PKR {overview.totalOutstanding.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="p-6 pt-0 flex gap-3">
            <Link 
              to="/admin/fees/collect" 
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold text-sm shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <CreditCard className="w-4 h-4" /> Collect Fee Now
            </Link>
            <Link 
              to="/admin/fees/vouchers" 
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition-all active:scale-98"
            >
              Vouchers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
