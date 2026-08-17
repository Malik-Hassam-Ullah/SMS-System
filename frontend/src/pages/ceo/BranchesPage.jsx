import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, Plus, Search, MapPin, Phone, Mail, Trash2, Edit2, Loader2, X, ShieldAlert, Timer, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { getBranches, createBranch, updateBranch, deleteBranch, verifyPassword } from '../../api/ceo.api';

const UNLOCK_DURATION_MS = 3 * 60 * 1000; // 3 minutes

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Add/Edit Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null); // null means adding new
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // --- Security State ---
  const [unlockedUntil, setUnlockedUntil] = useState(null); // timestamp when lock re-engages
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef(null);

  // --- Password Verification Modal ---
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingDeleteBranch, setPendingDeleteBranch] = useState(null); 
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // --- Delete Confirmation Modal ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // --- Timer countdown ---
  useEffect(() => {
    if (!unlockedUntil) {
      setSecondsLeft(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.floor((unlockedUntil - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setUnlockedUntil(null);
        clearInterval(timerRef.current);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => clearInterval(timerRef.current);
  }, [unlockedUntil]);

  const isUnlocked = unlockedUntil && Date.now() < unlockedUntil;

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBranches();
      setBranches(data);
    } catch (err) {
      setError('Failed to load branches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  // --- Edit handlers ---
  const handleOpenAddModal = () => {
    setEditingBranch(null);
    setName(''); setCode(''); setAddress(''); setPhone(''); setEmail('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (branch) => {
    setEditingBranch(branch);
    setName(branch.name || '');
    setCode(branch.code || '');
    setAddress(branch.address || '');
    setPhone(branch.phone || '');
    setEmail(branch.email || '');
    setError('');
    setIsModalOpen(true);
  };

  // --- Delete flow handlers ---
  const handleDeleteClick = (branch) => {
    if (!isUnlocked) {
      setPendingDeleteBranch(branch);
      setPasswordInput('');
      setPasswordError('');
      setIsPasswordModalOpen(true);
    } else {
      setBranchToDelete(branch);
      setConfirmText('');
      setIsDeleteModalOpen(true);
    }
  };

  const handlePasswordVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setPasswordError('');
    try {
      await verifyPassword(passwordInput);
      setUnlockedUntil(Date.now() + UNLOCK_DURATION_MS);
      setIsPasswordModalOpen(false);
      if (pendingDeleteBranch) {
        setBranchToDelete(pendingDeleteBranch);
        setConfirmText('');
        setIsDeleteModalOpen(true);
        setPendingDeleteBranch(null);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Incorrect password. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (confirmText.trim().toLowerCase() !== branchToDelete.name.toLowerCase()) {
      return;
    }
    setIsDeleting(true);
    setError('');
    try {
      await deleteBranch(branchToDelete.id);
      setIsDeleteModalOpen(false);
      setBranchToDelete(null);
      setConfirmText('');
      fetchBranches();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete branch.');
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, { name, code, address, phone, email });
      } else {
        await createBranch({ name, code, address, phone, email });
      }
      setIsModalOpen(false);
      fetchBranches();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editingBranch ? 'update' : 'create'} branch.`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredBranches = branches.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
          <p className="text-sm text-slate-500 font-medium">Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branch Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage all school branches and campuses</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Security Status Badge */}
          {isUnlocked ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-semibold">
              <Timer className="w-4 h-4 animate-pulse" />
              <span>Delete Active: {formatTimer(secondsLeft)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm font-medium">
              <Lock className="w-4 h-4" />
              <span>Delete Locked</span>
            </div>
          )}
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 border border-transparent rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4 items-center">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search branches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm transition-colors shadow-sm"
          />
        </div>
      </div>

      {/* Branches Grid */}
      {filteredBranches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{branch.name}</h3>
                    <span className="text-xs font-mono font-medium text-slate-500">{branch.code}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 flex-grow space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <span>{branch.address || 'No Address'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{branch.phone || 'No Phone'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{branch.email || 'No Email'}</span>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => handleOpenEditModal(branch)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-all border border-transparent"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(branch)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isUnlocked
                      ? 'text-red-600 hover:bg-red-50 border border-red-200'
                      : 'text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent'
                  }`}
                  title={isUnlocked ? 'Delete Branch' : 'Enter password to enable delete'}
                >
                  {isUnlocked ? (
                    <><Trash2 className="w-4 h-4" /> Delete</>
                  ) : (
                    <><Lock className="w-4 h-4" /> Delete</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
          No branches found.
        </div>
      )}

      {/* ─── PASSWORD VERIFICATION MODAL ─── */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-amber-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Security Verification</h3>
                  <p className="text-xs text-slate-500">Verify your identity to enable branch deletion</p>
                </div>
              </div>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordVerify}>
              <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">⚠️ High-Risk Action</p>
                  <p>Deleting a branch permanently removes all its users, records, and data. Enter your CEO password to unlock delete mode for <strong>3 minutes</strong>.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Your CEO Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      className="input pr-10"
                      placeholder="Enter your password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-2 text-sm font-medium text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> {passwordError}
                    </p>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !passwordInput}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-75 flex items-center gap-2"
                >
                  {isVerifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <><ShieldAlert className="w-4 h-4" /> Unlock Delete Mode</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      {isDeleteModalOpen && branchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-red-200">
            <div className="px-6 py-5 border-b border-red-100 flex justify-between items-center bg-red-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Delete Branch</h3>
                  <p className="text-xs text-red-600 font-medium">This action is permanent and cannot be undone</p>
                </div>
              </div>
              <button onClick={() => setIsDeleteModalOpen(false)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmDelete}>
              <div className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 space-y-2">
                  <p className="font-semibold">You are about to permanently delete:</p>
                  <div className="flex items-center gap-2 bg-white border border-red-200 rounded-lg px-3 py-2 font-mono font-semibold text-slate-800">
                    <Building2 className="w-4 h-4 text-red-500" />
                    {branchToDelete.name} <span className="text-slate-400 text-xs">({branchToDelete.code})</span>
                  </div>
                  <p className="text-xs">All users, students, classes, and records under this branch will be <strong>permanently deleted</strong>.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Type <span className="font-mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200">{branchToDelete.name}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    className="input"
                    placeholder={`Type: ${branchToDelete.name}`}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                  {confirmText && confirmText.trim().toLowerCase() !== branchToDelete.name.toLowerCase() && (
                    <p className="mt-1 text-xs text-red-500 font-medium">Name doesn't match exactly.</p>
                  )}
                </div>
                {/* Timer reminder */}
                {isUnlocked && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
                    <Timer className="w-4 h-4" />
                    Delete mode expires in {formatTimer(secondsLeft)}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || confirmText.trim().toLowerCase() !== branchToDelete.name.toLowerCase()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete Permanently</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD / EDIT BRANCH MODAL ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBranch}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Branch Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" required className="input" placeholder="e.g. West Campus" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Branch Code <span className="text-red-500">*</span>
                  </label>
                  <input type="text" required className="input font-mono" placeholder="e.g. WEST-01" value={code} onChange={e => setCode(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input type="email" className="input" placeholder="e.g. west@school.edu" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    className="input" 
                    placeholder="e.g. 0300-1234567" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    pattern="[0-9\-+\s]+"
                    title="Only numbers, dashes, plus, and spaces are allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                  <textarea className="input min-h-[60px]" placeholder="Physical location" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-75">
                  {isSaving ? 'Saving...' : (editingBranch ? 'Save Changes' : 'Save Branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
