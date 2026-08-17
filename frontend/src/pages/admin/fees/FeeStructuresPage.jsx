import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, Save, X, Settings } from 'lucide-react';
import api from '../../../lib/api';

export default function FeeStructuresPage() {
  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: 'Monthly Tuition Fee',
    class_id: '',
    amount: '',
    frequency: 'monthly',
  });

  const fetchData = async () => {
    try {
      const [structRes, classRes] = await Promise.all([
        api.get('/fees/structures'),
        api.get('/classes'),
      ]);
      setStructures(structRes.data || []);
      setClasses(classRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: 'Monthly Tuition Fee', class_id: '', amount: '', frequency: 'monthly' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, class_id: s.class_id || '', amount: s.amount, frequency: s.frequency });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return setError('Amount must be greater than 0');
    setSubmitting(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/fees/structures/${editing.id}`, form);
      } else {
        await api.post('/fees/structures', form);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save fee structure');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this fee structure?')) return;
    try {
      await api.delete(`/fees/structures/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to deactivate');
    }
  };

  const frequencyLabel = (f) => ({ monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annual', one_time: 'One Time' }[f] || f);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-blue-500" size={24} /> Fee Structures
          </h1>
          <p className="text-slate-500 mt-1">Set and manage monthly fee for each class</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Fee
        </button>
      </div>

      <div className="card bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
        ) : structures.length === 0 ? (
          <div className="p-12 text-center">
            <Settings className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-lg">No fee structures set</p>
            <p className="text-slate-400 text-sm">Add a fee structure to start generating vouchers</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-sm font-semibold text-slate-600">Fee Name</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Class</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Frequency</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">Amount (PKR)</th>
                <th className="p-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {structures.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-800">{s.name}</td>
                  <td className="p-4 text-slate-600">{s.classes?.name || <span className="text-slate-400 italic">All Classes</span>}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{frequencyLabel(s.frequency)}</span>
                  </td>
                  <td className="p-4 text-right font-bold text-slate-900 text-lg">
                    {Number(s.amount).toLocaleString()}
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    <button onClick={() => openEdit(s)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit size={17} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{editing ? 'Edit Fee Structure' : 'Add Fee Structure'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fee Name</label>
                <input className="input w-full" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class <span className="text-slate-400">(Leave blank for all classes)</span></label>
                <select className="input w-full" value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (PKR) <span className="text-red-500">*</span></label>
                <input type="number" min="1" className="input w-full" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
                <select className="input w-full" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annual</option>
                  <option value="one_time">One Time</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 px-5 py-2.5">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Save size={17} /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
