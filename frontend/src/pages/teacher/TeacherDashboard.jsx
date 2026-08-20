import React, { useState, useEffect } from 'react';
import { BookOpen, Users, CheckSquare, Award, Loader2, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/dashboard');
        if (response.data && response.data.success) {
          setDashboardData(response.data.data);
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

  const overview = dashboardData?.overview || {
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalVouchers: 0,
    todayCollection: 0,
    monthCollection: 0,
    totalOutstanding: 0
  };

  const teacherAssignments = dashboardData?.teacherAssignments || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Teacher Portal
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wider">Welcome back, {user?.full_name?.split(' ')[0] || 'Teacher'}</p>
        </div>
      </div>

      {/* Vibrant Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card border-0 bg-gradient-to-br from-primary-500 to-indigo-700 text-white shadow-lg shadow-primary-500/30 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm font-bold uppercase tracking-wider mb-1">My Classes</p>
              <h3 className="text-4xl font-black">{overview.totalClasses}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="card border-0 bg-gradient-to-br from-accent-500 to-fuchsia-700 text-white shadow-lg shadow-accent-500/30 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-accent-100 text-sm font-bold uppercase tracking-wider mb-1">Students</p>
              <h3 className="text-4xl font-black">{overview.totalStudents}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Assignments Section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="card bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="text-amber-500" /> My Assigned Classes & Subjects
          </h2>
          <div className="space-y-4">
            {teacherAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherAssignments.map((assignment) => (
                  <Link key={assignment.id} to={`/teacher/marks/${assignment.id}`} className="block">
                    <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-lg">
                          {assignment.sections?.classes?.name || 'Unknown Class'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                          Section: {assignment.sections?.name || 'N/A'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                        <BookOpen size={16} className="text-slate-400" />
                        Subject: <span className="font-medium text-slate-700">{assignment.subjects?.name || 'N/A'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 p-4 text-center">No assignments found. Please contact the administrator.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
