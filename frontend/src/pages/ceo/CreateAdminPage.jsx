import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Building, Mail, Phone, Lock, Edit, Trash2, 
  Search, Shield, Key, Loader2, X, Check, AlertCircle, Eye, EyeOff 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBranches, getUsers, createUser, updateUser, deleteUser } from '../../api/ceo.api';

export default function CreateAdminPage() {
  const navigate = useNavigate();

  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    branchId: '',
    role: 'admin',
    password: '',
    employeeCode: '',
    qualification: '',
    joiningDate: ''
  });

  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    branchId: '',
    employeeCode: '',
    isActive: true,
    qualification: '',
    joiningDate: ''
  });

  const [newPassword, setNewPassword] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [branchesData, staffData] = await Promise.all([
        getBranches(),
        getUsers()
      ]);
      setBranches(branchesData);
      setStaff(staffData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load user directory and branches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await createUser({
        email: formData.email,
        password: formData.password,
        role: formData.role,
        full_name: formData.fullName,
        branch_id: formData.branchId,
        phone: formData.phone,
        employee_code: formData.employeeCode,
        qualification: formData.qualification,
        joining_date: formData.joiningDate
      });
      setSuccess('User created successfully!');
      setIsCreateModalOpen(false);
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        branchId: '',
        role: 'admin',
        password: '',
        employeeCode: '',
        qualification: '',
        joiningDate: ''
      });
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create user. Ensure email is unique.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await updateUser(selectedUser.id, {
        email: editFormData.email,
        full_name: editFormData.fullName,
        branch_id: editFormData.branchId,
        phone: editFormData.phone,
        employee_code: editFormData.employeeCode,
        is_active: editFormData.isActive,
        qualification: editFormData.qualification,
        joining_date: editFormData.joiningDate
      });
      setSuccess('User profile updated successfully!');
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await updateUser(selectedUser.id, {
        password: newPassword
      });
      setSuccess(`Password for ${selectedUser.full_name} updated successfully!`);
      setIsPasswordModalOpen(false);
      setNewPassword('');
    } catch (err) {
      console.error(err);
      setError('Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.full_name}? This will permanently delete their account and profile.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await deleteUser(user.id);
      setSuccess('User deleted successfully.');
      loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to delete user.');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.full_name,
      email: user.email,
      phone: user.phone || '',
      branchId: user.branch_id,
      employeeCode: user.employee_code || '',
      isActive: user.is_active,
      qualification: user.qualification || '',
      joiningDate: user.joining_date || ''
    });
    setIsEditModalOpen(true);
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setIsPasswordModalOpen(true);
  };

  // Filter staff
  const filteredStaff = staff.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.employee_code && user.employee_code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesBranch = !branchFilter || user.branch_id === branchFilter;
    
    return matchesSearch && matchesRole && matchesBranch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
          <p className="text-sm text-slate-500 font-medium">Loading user directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff & Admin Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage school admins, accountants, and teachers across all branches.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 border border-transparent rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-semibold border border-emerald-100 flex items-center gap-2">
          <Check className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or employee code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm transition-colors shadow-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input bg-white cursor-pointer"
        >
          <option value="">All Roles</option>
          <option value="admin">Administrator</option>
          <option value="accountant">Accountant</option>
          <option value="teacher">Teacher</option>
        </select>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="input bg-white cursor-pointer"
        >
          <option value="">All Branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Assigned Branch</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{user.full_name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        user.role === 'accountant' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-teal-50 text-teal-700 border border-teal-100'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {user.branches?.name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{user.phone || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        user.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {user.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => openPasswordModal(user)}
                        title="Change Password"
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors inline-flex"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        title="Edit User"
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors inline-flex"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        title="Delete User"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400 font-medium">No staff members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE STAFF MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-600" />
                Add New Staff Member
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="max-h-[80vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" required className="input" placeholder="e.g. Sarah Jenkins"
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input"
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="admin">Administrator</option>
                      <option value="accountant">Accountant</option>
                      <option value="teacher">Teacher</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Assign Branch <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="input"
                      value={formData.branchId}
                      onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Email / Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email" required className="input font-mono" placeholder="sarah@school.edu"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="input"
                        placeholder="Min 8 characters"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel" className="input" placeholder="e.g. 0300-1234567"
                      pattern="[0-9\-+\s]+"
                      title="Only numbers, dashes, plus, and spaces are allowed"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Employee Code</label>
                    <input
                      type="text" className="input font-mono" placeholder="e.g. EMP-104"
                      value={formData.employeeCode}
                      onChange={e => setFormData({ ...formData, employeeCode: e.target.value })}
                    />
                  </div>
                </div>

                {formData.role === 'teacher' && (
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800">Teacher Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Qualification</label>
                        <input
                          type="text" className="input" placeholder="e.g. M.Sc Mathematics"
                          value={formData.qualification}
                          onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Joining Date</label>
                        <input
                          type="date" className="input"
                          value={formData.joiningDate}
                          onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-75 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary-600" />
                Edit Staff Member
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" required className="input"
                    value={editFormData.fullName}
                    onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Email / Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email" required className="input font-mono"
                    value={editFormData.email}
                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Assign Branch <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="input"
                      value={editFormData.branchId}
                      onChange={e => setEditFormData({ ...editFormData, branchId: e.target.value })}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel" className="input font-mono"
                      pattern="[0-9\-+\s]+"
                      title="Only numbers, dashes, plus, and spaces are allowed"
                      value={editFormData.phone}
                      onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editFormData.isActive}
                    onChange={e => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <label htmlFor="editIsActive" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    Account Status Active (uncheck to suspend user)
                  </label>
                </div>
                {selectedUser?.role === 'teacher' && (
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800">Teacher Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Qualification</label>
                        <input
                          type="text" className="input" placeholder="e.g. M.Sc Mathematics"
                          value={editFormData.qualification}
                          onChange={e => setEditFormData({ ...editFormData, qualification: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Joining Date</label>
                        <input
                          type="date" className="input"
                          value={editFormData.joiningDate}
                          onChange={e => setEditFormData({ ...editFormData, joiningDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-75 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary-600" />
                Change Password
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500">
                  Update password for <span className="font-semibold text-slate-800">{selectedUser?.full_name}</span>.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    className="input"
                    placeholder="Enter new password (min 8 chars)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
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
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-75 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
