import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import api from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState(() => localStorage.getItem('sms_remember_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [branch, setBranch] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [fetchingBranches, setFetchingBranches] = useState(true);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
      setFetchingBranches(true);
      try {
        const res = await api.get('/auth/branches');
        if (isMounted && res.data && res.data.length > 0) {
          setBranches(res.data);
          setBranch(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load branches', err);
      } finally {
        if (isMounted) setFetchingBranches(false);
      }
    };
    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        branchId: role === 'ceo' ? undefined : branch,
        role,
      });

      const { user, access_token } = res.data;
      login(user, access_token);
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email, password, or role. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-white">
      
      {/* ════════════════════ LEFT HERO PANEL (50%) ════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#00875a] flex-col items-center justify-center p-12 xl:p-16 overflow-hidden select-none">
        
        {/* Subtle Geometric Hex / Diamond Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='98' viewBox='0 0 56 98'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M28 18.5l26 15v30l-26 15L2 63.5v-30l26-15zm0 3.46L4 35.46v27.08L28 76.04l24-13.5V35.46L28 21.96zM28 0l26 15v3.46L28 3.46 2 18.46V15L28 0zm0 98L2 83v-3.46l26 15 26-15V83L28 98z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '56px 98px',
          }}
        />

        {/* Soft Radial Ambient Lighting */}
        <div className="absolute inset-0 bg-radial-at-c from-emerald-600/30 via-transparent to-emerald-950/25 pointer-events-none" />

        {/* Center Branding Content */}
        <div className="relative z-10 max-w-lg text-center flex flex-col items-center">
          
          {/* White Rounded Square Logo Container */}
          <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center p-3 mb-8 transform hover:scale-105 transition-transform duration-300">
            <img
              src="/tss-logo.png"
              alt="The Smart School Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.src = '/smart-school-logo.png';
              }}
            />
          </div>

          {/* Heading */}
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Smart Campus<br />Management
          </h1>

          {/* Description */}
          <p className="text-emerald-50/90 text-base leading-relaxed max-w-md mx-auto mb-10 font-normal">
            Streamline your administrative tasks, enhance communication, and foster a better learning environment with our comprehensive School Management System.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm font-semibold text-white">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-[#00875a] text-[10px] font-black">
                ✓
              </span>
              <span>Attendance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-[#00875a] text-[10px] font-black">
                ✓
              </span>
              <span>Finance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-[#00875a] text-[10px] font-black">
                ✓
              </span>
              <span>Academics</span>
            </div>
          </div>

        </div>
      </div>

      {/* ════════════════════ RIGHT LOGIN FORM PANEL (50%) ════════════════════ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-16 bg-white min-h-screen">
        <div className="w-full max-w-[460px] my-auto py-4">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-md p-2.5 mb-2.5 border border-slate-100">
              <img
                src="/tss-logo.png"
                alt="The Smart School"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.src = '/smart-school-logo.png';
                }}
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">The Smart School</h2>
            <p className="text-xs text-slate-500 mt-0.5">Smart Campus Management</p>
          </div>

          {/* Header */}
          <div className="mb-6 sm:mb-8 text-center sm:text-left">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-500 font-normal">
              Please select your branch and enter your credentials.
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-100/70 p-5 sm:p-8">
            
            {/* Error Notification */}
            {error && (
              <div className="mb-4 sm:mb-5 bg-rose-50 border border-rose-200 text-rose-700 p-3 sm:p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{error}</div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-rose-400 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              
              {/* 1. Branch Selector */}
              {role !== 'ceo' && (
                <div>
                  <label htmlFor="branch" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                    Select Branch
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                    </div>
                    <select
                      id="branch"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      disabled={fetchingBranches || branches.length === 0}
                      className="block w-full pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00875a]/20 focus:border-[#00875a] transition-all appearance-none cursor-pointer hover:border-slate-300 disabled:opacity-60"
                    >
                      {fetchingBranches && <option value="">Loading branches...</option>}
                      {!fetchingBranches && branches.length === 0 && <option value="">No branches available</option>}
                      {branches.map((b) => (
                        <option key={b.id} value={b.id} className="text-slate-800 py-1">
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Role Selector */}
              <div>
                <label htmlFor="role" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Select Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  </div>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00875a]/20 focus:border-[#00875a] transition-all appearance-none cursor-pointer hover:border-slate-300"
                  >
                    <option value="admin">Administrator</option>
                    <option value="accountant">Accountant</option>
                    <option value="teacher">Teacher</option>
                    <option value="ceo">CEO / Owner</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* 3. Email Input */}
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="block w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00875a]/20 focus:border-[#00875a] transition-all hover:border-slate-300"
                  />
                </div>
              </div>

              {/* 4. Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <label htmlFor="password" className="block text-xs sm:text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  {role === 'ceo' && (
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-[#00875a] hover:underline transition-colors"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 sm:pl-11 pr-11 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00875a]/20 focus:border-[#00875a] transition-all hover:border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 5. Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 sm:mt-3 py-3 sm:py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#00875a] hover:bg-[#00704a] active:scale-[0.99] shadow-lg shadow-emerald-900/10 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

            </form>
          </div>

        </div>
      </div>

    </div>
  );
}

