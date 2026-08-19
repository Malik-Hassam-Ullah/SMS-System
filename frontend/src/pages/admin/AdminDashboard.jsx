import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Clock, Activity, Loader2, IndianRupee, TrendingUp, Trophy, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

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

  // Format monthly chart data
  const revenueData = dashboardData?.monthlyChart && dashboardData.monthlyChart.length > 0
    ? dashboardData.monthlyChart.map(item => {
      let name = item.month;
      try {
        const [year, month] = item.month.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        name = date.toLocaleString('default', { month: 'short' });
      } catch (e) { }
      return { name, amount: item.amount };
    })
    : [
      { name: 'No Data', amount: 0 }
    ];

  // Format fee status breakdown data
  const feeBreakdownData = [
    { name: 'Paid', count: feeStats.paid },
    { name: 'Unpaid', count: feeStats.unpaid },
    { name: 'Partial', count: feeStats.partial },
    { name: 'Overdue', count: feeStats.overdue }
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

        {/* Right Column: Calendar & Discount */}
        <div className="space-y-6">
          {/* Calendar Placeholder */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <button className="p-2 rounded-full hover:bg-slate-100"><svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg></button>
              <span className="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-semibold">August 2026</span>
              <button className="p-2 rounded-full hover:bg-slate-100"><svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2 font-semibold text-slate-600">
              <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm text-slate-500">
              <div className="text-slate-300">26</div><div className="text-slate-300">27</div><div className="text-slate-300">28</div><div className="text-slate-300">29</div><div className="text-slate-300">30</div><div className="text-slate-300">31</div><div>1</div>
              <div>2</div><div>3</div><div>4</div><div>5</div><div>6</div><div>7</div><div>8</div>
              <div className="bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto">9</div><div>10</div><div>11</div><div>12</div><div>13</div><div>14</div><div>15</div>
              <div>16</div><div>17</div><div>18</div><div>19</div><div>20</div><div>21</div><div>22</div>
              <div>23</div><div>24</div><div>25</div><div>26</div><div>27</div><div>28</div><div>29</div>
              <div>30</div><div>31</div><div className="text-slate-300">1</div><div className="text-slate-300">2</div><div className="text-slate-300">3</div><div className="text-slate-300">4</div><div className="text-slate-300">5</div>
            </div>
          </div>

          {/* Discount Table */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium p-6 rounded-2xl">
            <h3 className="font-bold text-slate-800 mb-4">Discount</h3>
            <div className="bg-slate-100 rounded-lg p-4 flex justify-between text-center text-sm font-medium text-slate-700">
              <div>
                <p className="mb-2">Staff-100-<br />Percent</p>
                <p className="text-blue-600 font-bold">0</p>
              </div>
              <div>
                <p className="mb-2">Staff-50-<br />Percent</p>
                <p className="text-blue-600 font-bold">0</p>
              </div>
              <div>
                <p className="mb-2">Insure<br />d_Stu<br />dent</p>
                <p className="text-blue-600 font-bold">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-0 overflow-hidden bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium">
          <div className="p-6 border-b border-slate-100/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <TrendingUp className="text-primary-500 w-5 h-5" /> Revenue Overview
            </h3>
          </div>
          <div className="p-6 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`PKR ${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-0 overflow-hidden bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium">
          <div className="p-6 border-b border-slate-100/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Users className="text-accent-500 w-5 h-5" /> Voucher Status Breakdown
            </h3>
          </div>
          <div className="p-6 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" name="Vouchers" fill="url(#colorStudents)" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Trophy className="text-amber-500" /> Recent Payments
          </h2>
          <div className="space-y-4">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment) => (
                <div key={payment.id} className="flex gap-4 items-start p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Fee Collected - {payment.students?.full_name || 'Unknown Student'}</p>
                    <p className="text-sm text-slate-500">
                      PKR {payment.amount.toLocaleString()} via {payment.payment_method || 'N/A'} (Month: {payment.fee_vouchers?.fee_month || 'N/A'})
                    </p>
                  </div>
                  <span className="ml-auto text-xs font-semibold text-slate-400">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 p-4 text-center">No recent payments found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
