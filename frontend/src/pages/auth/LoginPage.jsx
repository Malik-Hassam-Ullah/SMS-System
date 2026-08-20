import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, Mail, Lock, Loader2, ArrowRight, Building, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import api from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  React.useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/auth/branches');
        if (res.data && res.data.length > 0) {
          setBranches(res.data);
          setBranch(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load branches', err);
      }
    };
    fetchBranches();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        branchId: branch,
        role
      });
      const { user, access_token } = res.data;
      login(user, access_token);
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left side - Branding with School Picture Background (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-slate-900">
        {/* School Campus Photo */}
        <img
          src="/login-bg.jpg"
          alt="The Smart School Campus"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transform hover:scale-100 transition-transform duration-1000 ease-out"
        />

        {/* Dynamic Dark Gradient & Tint Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-slate-900/75 to-blue-950/90 backdrop-brightness-90" />

        {/* Content Container */}
        <div className="relative z-10 px-12 text-white max-w-2xl text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/95 mb-8 border border-white/30 shadow-2xl overflow-hidden p-3 backdrop-blur-md">
            <img src="/tss-logo.png" alt="The Smart School Logo" className="w-full h-full object-contain" />
          </div>

          <h1 className="text-4xl xl:text-5xl font-black mb-5 tracking-tight text-white drop-shadow-lg">
            Smart Campus Management
          </h1>

          <p className="text-base xl:text-lg text-slate-100/95 mb-8 leading-relaxed font-medium drop-shadow-md max-w-xl mx-auto">
            Streamline your administrative tasks, enhance communication, and foster a better learning environment with our comprehensive School Management System.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs xl:text-sm font-bold text-white shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Attendance
            </span>
            <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs xl:text-sm font-bold text-white shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Finance & Fees
            </span>
            <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs xl:text-sm font-bold text-white shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Academics & Exams
            </span>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md space-y-6 relative z-10 py-10">
          <div className="text-center lg:text-left">
            <div className="lg:hidden inline-flex items-center justify-center w-16 h-16 rounded-xl bg-white mb-6 border border-slate-200 overflow-hidden p-2">
              <img src="/tss-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">Please select your branch and enter your credentials.</p>
          </div>

          <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100 sm:px-10 mt-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-3">
                  <div className="mt-0.5"><Lock className="w-4 h-4" /></div>
                  <p>{error}</p>
                </div>
              )}

              {/* Branch Selection */}
              {role !== 'ceo' && (
                <div>
                  <label htmlFor="branch" className="block text-sm font-semibold text-slate-700">
                    Select Branch
                  </label>
                  <div className="mt-2 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-slate-400" />
                    </div>
                    <select
                      id="branch"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-colors shadow-sm appearance-none bg-white cursor-pointer"
                    >
                      {branches.length === 0 && <option value="">Loading branches...</option>}
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label htmlFor="role" className="block text-sm font-semibold text-slate-700">
                  Select Role
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheck className="h-5 w-5 text-slate-400" />
                  </div>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-colors shadow-sm appearance-none bg-white cursor-pointer"
                  >
                    <option value="ceo">CEO / Owner</option>
                    <option value="admin">Administrator</option>
                    <option value="teacher">Teacher</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  Email address
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-colors shadow-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                </div>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-colors shadow-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center mt-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign in
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </div>

              {role === 'ceo' && (
                <div className="text-center mt-4">
                  <Link
                    to="/forgot-password"
                    className="inline-block text-sm font-medium text-primary-600 hover:text-primary-500 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const CheckCircle = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);
