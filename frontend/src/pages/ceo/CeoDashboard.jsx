import React, { useState, useEffect } from 'react';
import { Building2, Users, IndianRupee, ShieldCheck, Loader2, ArrowUpRight, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboardStats, getBranches, getUsers } from '../../api';
import { useAuthStore } from '../../store/auth.store';

const COLORS = ['#6366f1', '#d946ef', '#10b981', '#f59e0b'];

export default function CeoDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalBranches: 0,
    totalAdmins: 0,
    totalStudents: 0,
    totalRevenue: 0
  });
  const [branchStats, setBranchStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCeoData = async () => {
      try {
        const [statsRes, branchesRes, usersRes] = await Promise.all([
          getDashboardStats(),
          getBranches(),
          getUsers()
        ]);

        const branches = branchesRes.data || [];
        const users = usersRes.data || [];
        const dashboardStats = statsRes.data || { totalStudents: 0, totalRevenue: 0, branchStats: [] };

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

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  const branchRevenueData = branchStats.map(b => ({
    name: b.name,
    revenue: b.revenue
  }));

  const studentDistribution = branchStats.map(b => ({
    name: b.name,
    value: b.studentCount
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            CEO Dashboard
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wider">Welcome back, {user?.full_name?.split(' ')[0] || 'Owner'}</p>
        </div>
      </div>

      {/* Vibrant Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card border-0 bg-gradient-to-br from-primary-600 to-indigo-800 text-white shadow-lg shadow-primary-500/30 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm font-bold uppercase tracking-wider mb-1">Total Branches</p>
              <h3 className="text-4xl font-black">{stats.totalBranches}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="card border-0 bg-gradient-to-br from-fuchsia-600 to-purple-800 text-white shadow-lg shadow-fuchsia-500/30 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-fuchsia-100 text-sm font-bold uppercase tracking-wider mb-1">System Admins</p>
              <h3 className="text-4xl font-black">{stats.totalAdmins}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="card border-0 bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-lg shadow-amber-500/30 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-bold uppercase tracking-wider mb-1">Total Students</p>
              <h3 className="text-4xl font-black">{stats.totalStudents.toLocaleString()}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-100 bg-white/10 w-fit px-2 py-1 rounded-full">
            System wide
          </div>
        </div>

        <div className="card border-0 bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/30 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-1">Month Revenue</p>
              <h3 className="text-4xl font-black">PKR {stats.totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              <IndianRupee className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-100 bg-white/10 w-fit px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" /> PKR YTD
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-0 overflow-hidden bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium">
          <div className="p-6 border-b border-slate-100/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <TrendingUp className="text-emerald-500 w-5 h-5" /> Branch Revenue Comparison
            </h3>
          </div>
          <div className="p-6 h-[350px] w-full">
            {branchRevenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchRevenueData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`PKR ${value.toLocaleString()}`, 'Revenue']}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} barSize={28}>
                    {branchRevenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 p-4 text-center">No branch data available.</p>
            )}
          </div>
        </div>

        <div className="card p-0 overflow-hidden bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium">
          <div className="p-6 border-b border-slate-100/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Users className="text-accent-500 w-5 h-5" /> Student Distribution
            </h3>
          </div>
          <div className="p-6 h-[350px] w-full flex items-center justify-center relative">
            {studentDistribution.length > 0 && studentDistribution.some(d => d.value > 0) ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={studentDistribution}
                      cx="40%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {studentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute flex flex-col gap-3 right-8">
                  {studentDistribution.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-sm font-medium text-slate-600">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 p-4 text-center">No student distribution data available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
