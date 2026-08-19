import React, { useState, useEffect } from 'react';
import { Search, FileText, Users, Loader2, Check, AlertCircle, Send, MessageCircle, Mail, ChevronDown, ChevronUp, Download } from 'lucide-react';
import api from '../../../lib/api';

export default function GenerateVoucherPage() {
  const [mode, setMode] = useState('bulk'); // 'bulk' | 'single'

  // Common
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Bulk mode
  const [bulkForm, setBulkForm] = useState({
    class_id: '', section_id: '', session_id: '',
    fee_month: new Date().toISOString().slice(0, 7),
    due_date: '', current_fee: '0', other_charges: '0', discount: '0',
  });
  const [sections, setSections] = useState([]);
  const [preview, setPreview] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Single mode
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [singleForm, setSingleForm] = useState({
    session_id: '', fee_month: new Date().toISOString().slice(0, 7),
    due_date: '', current_fee: '', other_charges: '0', discount: '0',
  });
  const [outstanding, setOutstanding] = useState(0);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [clsRes, sessRes, feeRes] = await Promise.all([
          api.get('/classes'),
          api.get('/sessions'),
          api.get('/fees/structures'),
        ]);
        setClasses(clsRes.data || []);
        setSessions(sessRes.data || []);
        setFeeStructures(feeRes.data || []);
        // Default session
        const active = (sessRes.data || []).find(s => s.is_current || s.status === 'active');
        if (active) {
          setBulkForm(f => ({ ...f, session_id: active.id }));
          setSingleForm(f => ({ ...f, session_id: active.id }));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchInit();
  }, []);

  // When class changes in bulk mode, load sections
  useEffect(() => {
    if (!bulkForm.class_id) {
      setSections([]);
      setBulkForm(f => ({ ...f, section_id: '', current_fee: '0' }));
      return;
    }
    const cls = classes.find(c => c.id === bulkForm.class_id);
    setSections(cls?.sections || []);
    // Auto-fill fee from structure
    const struct = feeStructures.find(s => s.class_id === bulkForm.class_id && s.frequency === 'monthly');
    if (struct) setBulkForm(f => ({ ...f, current_fee: String(struct.amount), section_id: '' }));
    else setBulkForm(f => ({ ...f, section_id: '', current_fee: '0' }));
  }, [bulkForm.class_id]);

  // Load preview when filters change
  useEffect(() => {
    if (!bulkForm.fee_month) { setPreview([]); return; }
    const load = async () => {
      setLoadingPreview(true);
      try {
        const params = { limit: 1000 };
        if (bulkForm.class_id) params.class_id = bulkForm.class_id;
        if (bulkForm.section_id) params.section_id = bulkForm.section_id;

        const res = await api.get('/students', { params });
        const students = res.data || [];

        const vParams = { month: bulkForm.fee_month, limit: 1000 };
        if (bulkForm.section_id) vParams.section_id = bulkForm.section_id;
        const vRes = await api.get('/fees/vouchers', { params: vParams });
        const existing = new Set((vRes.data || []).map(v => v.student_id));

        setPreview(students.map(s => ({
          ...s,
          has_voucher: existing.has(s.id),
          previous_balance: s.outstanding_balance || 0,
        })));
      } catch (e) { console.error(e); }
      finally { setLoadingPreview(false); }
    };
    load();
  }, [bulkForm.class_id, bulkForm.section_id, bulkForm.fee_month]);

  // Student search for single mode
  useEffect(() => {
    if (studentSearch.length < 1) { setStudentResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/students', { params: { search: studentSearch, limit: 10 } });
        setStudentResults(res.data || []);
      } catch (e) { console.error(e); }
    }, 400);
    return () => clearTimeout(t);
  }, [studentSearch]);

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setStudentResults([]);
    setStudentSearch(student.full_name);
    // Get outstanding
    try {
      const res = await api.get(`/fees/outstanding/${student.id}`);
      setOutstanding(res.data?.total_outstanding || 0);
      // Auto-fill fee from class structure
      const struct = feeStructures.find(s => s.class_id === student.current_class_id && s.frequency === 'monthly');
      if (struct) setSingleForm(f => ({ ...f, current_fee: String(struct.amount) }));
    } catch (e) { console.error(e); }
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    if (!bulkForm.due_date) return setError('Please enter a due date');
    setGenerating(true); setError(''); setResult(null);
    try {
      const res = await api.post('/fees/vouchers/bulk', {
        class_id: bulkForm.class_id || undefined,
        section_id: bulkForm.section_id || undefined,
        session_id: bulkForm.session_id || undefined,
        fee_month: bulkForm.fee_month,
        due_date: bulkForm.due_date,
        current_fee: Number(bulkForm.current_fee || 0),
        other_charges: Number(bulkForm.other_charges || 0),
        discount: Number(bulkForm.discount || 0),
      });
      // interceptor unwraps {success, data, summary} → data array, so we reconstruct result
      setResult({ summary: { created: Array.isArray(res.data) ? res.data.length : 0 }, data: Array.isArray(res.data) ? res.data : [] });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to generate vouchers';
      setError(typeof msg === 'string' ? msg : 'Failed to generate vouchers');
    } finally { setGenerating(false); }
  };

  const handleSingleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return setError('Please select a student');
    if (!singleForm.current_fee || Number(singleForm.current_fee) <= 0) return setError('Enter a valid fee amount');
    if (!singleForm.due_date) return setError('Enter a due date');
    setGenerating(true); setError(''); setResult(null);
    try {
      const res = await api.post('/fees/vouchers', {
        student_id: selectedStudent.id,
        session_id: singleForm.session_id || undefined,
        fee_month: singleForm.fee_month,
        due_date: singleForm.due_date,
        current_fee: Number(singleForm.current_fee),
        other_charges: Number(singleForm.other_charges || 0),
        discount: Number(singleForm.discount || 0),
      });
      // interceptor unwraps response, res.data is the voucher object
      setResult({ summary: { created: 1 }, data: [res.data] });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to generate voucher';
      setError(typeof msg === 'string' ? msg : 'Failed to generate voucher');
    } finally { setGenerating(false); }
  };

  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const handleDownloadMonthlyExcel = async (targetMonth) => {
    const month = targetMonth || bulkForm.fee_month || new Date().toISOString().slice(0, 7);
    setDownloadingExcel(true);
    try {
      const response = await api.get('/fees/export-monthly-excel', {
        params: { month },
        responseType: 'blob'
      });

      // If server returned error JSON wrapped in blob
      if (response.data?.type === 'application/json') {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.message || 'Export error');
      }

      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fee Challan with data file ${month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      alert(err.message || 'Failed to download Monthly Fee Excel file');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const totalPayable = (fee, prev, charges, disc) =>
    Math.max(0, Number(fee || 0) + Number(prev || 0) + Number(charges || 0) - Number(disc || 0));

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Generate Fee Vouchers</h1>
          <p className="text-slate-500 mt-1">Create fee vouchers for students. Previous balance is auto-included.</p>
        </div>
        <button
          type="button"
          onClick={() => handleDownloadMonthlyExcel(bulkForm.fee_month)}
          disabled={downloadingExcel}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {downloadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloadingExcel ? 'Exporting...' : '📊 Export Monthly Fee File (.xlsx)'}
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-3">
        <button
          onClick={() => { setMode('bulk'); setResult(null); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 font-semibold transition-all ${mode === 'bulk' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
        >
          <Users size={20} /> Bulk — All Students / By Class
        </button>
        <button
          onClick={() => { setMode('single'); setResult(null); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 font-semibold transition-all ${mode === 'single' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
        >
          <FileText size={20} /> Single Student
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* BULK MODE */}
      {mode === 'bulk' && (
        <form onSubmit={handleBulkGenerate} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-4">Voucher Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class (Optional)</label>
                <select className="input w-full" value={bulkForm.class_id} onChange={e => setBulkForm(f => ({ ...f, class_id: e.target.value }))}>
                  <option value="">All Classes (Entire School)</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Section (Optional)</label>
                <select className="input w-full" value={bulkForm.section_id} onChange={e => setBulkForm(f => ({ ...f, section_id: e.target.value }))} disabled={!bulkForm.class_id}>
                  <option value="">All Sections</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Session <span className="text-red-500">*</span></label>
                <select className="input w-full" value={bulkForm.session_id} onChange={e => setBulkForm(f => ({ ...f, session_id: e.target.value }))} required>
                  <option value="">Select Session</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fee Month <span className="text-red-500">*</span></label>
                <input type="month" className="input w-full" value={bulkForm.fee_month} onChange={e => setBulkForm(f => ({ ...f, fee_month: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date <span className="text-red-500">*</span></label>
                <input type="date" className="input w-full" value={bulkForm.due_date} onChange={e => setBulkForm(f => ({ ...f, due_date: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Override Fee (PKR)
                </label>
                <input type="number" min="0" className="input w-full" value={bulkForm.current_fee} onChange={e => setBulkForm(f => ({ ...f, current_fee: e.target.value }))} placeholder="Leave 0 to use class fee structure" />
                <span className="text-xs text-slate-400 mt-1 block">Leave 0 to automatically use each student's class fee structure.</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Other Charges (PKR)</label>
                <input type="number" min="0" className="input w-full" value={bulkForm.other_charges} onChange={e => setBulkForm(f => ({ ...f, other_charges: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discount (PKR)</label>
                <input type="number" min="0" className="input w-full" value={bulkForm.discount} onChange={e => setBulkForm(f => ({ ...f, discount: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Preview */}
          {bulkForm.fee_month && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-bold text-slate-800">Student Preview</h2>
                {loadingPreview && <Loader2 className="animate-spin text-blue-500 w-5 h-5" />}
                <span className="text-sm text-slate-500">{preview.filter(s => !s.has_voucher).length} students will get new vouchers</span>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-3 font-semibold text-slate-600">Roll No</th>
                      <th className="p-3 font-semibold text-slate-600">Student Name</th>
                      <th className="p-3 font-semibold text-slate-600">Class</th>
                      <th className="p-3 font-semibold text-slate-600 text-right">Previous Balance</th>
                      <th className="p-3 font-semibold text-slate-600 text-right">Current Fee</th>
                      <th className="p-3 font-semibold text-slate-600 text-right">Total Payable</th>
                      <th className="p-3 font-semibold text-slate-600 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map(s => {
                      const classStruct = feeStructures.find(f => f.class_id === s.current_class_id && f.frequency === 'monthly');
                      const resolvedFee = Number(bulkForm.current_fee) > 0 ? Number(bulkForm.current_fee) : (classStruct?.amount || 0);
                      return (
                        <tr key={s.id} className={s.has_voucher ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50'}>
                          <td className="p-3 text-slate-500">{s.roll_number || '-'}</td>
                          <td className="p-3 font-semibold text-slate-800">{s.full_name}</td>
                          <td className="p-3 text-slate-600">{s.classes?.name || 'N/A'}</td>
                          <td className="p-3 text-right font-medium text-rose-600">
                            {s.previous_balance > 0 ? `PKR ${Number(s.previous_balance).toLocaleString()}` : '-'}
                          </td>
                          <td className="p-3 text-right text-slate-600">PKR {resolvedFee.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            PKR {totalPayable(resolvedFee, s.previous_balance, bulkForm.other_charges, bulkForm.discount).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            {s.has_voucher
                              ? <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">Already Generated</span>
                              : <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">New</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={generating || !bulkForm.fee_month || !bulkForm.due_date} className="btn-primary flex items-center gap-2 px-8 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed">
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText size={20} />}
              {generating ? 'Generating...' : `Generate Vouchers (${preview.filter(s => !s.has_voucher).length} students)`}
            </button>
          </div>
        </form>
      )}

      {/* SINGLE MODE */}
      {mode === 'single' && (
        <form onSubmit={handleSingleGenerate} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-4">Student</h2>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                className="input w-full pl-10"
                placeholder="Search student by name or registration number..."
                value={studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); }}
              />
              {studentResults.length > 0 && (
                <div className="absolute z-10 bg-white border border-slate-200 rounded-xl shadow-lg w-full mt-1 max-h-64 overflow-y-auto">
                  {studentResults.map(s => (
                    <button key={s.id} type="button" onClick={() => selectStudent(s)} className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between transition-colors">
                      <div>
                        <p className="font-semibold text-slate-800">{s.full_name}</p>
                        <p className="text-sm text-slate-500">{s.registration_number} — {s.classes?.name} {s.sections?.name}</p>
                      </div>
                      <ChevronDown size={16} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-blue-800">{selectedStudent.full_name}</p>
                  <p className="text-sm text-blue-600">{selectedStudent.registration_number} • {selectedStudent.classes?.name} - {selectedStudent.sections?.name}</p>
                </div>
                {outstanding > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-rose-500 font-semibold">Previous Balance</p>
                    <p className="text-xl font-bold text-rose-600">PKR {Number(outstanding).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedStudent && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 mb-4">Voucher Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Session</label>
                  <select className="input w-full" value={singleForm.session_id} onChange={e => setSingleForm(f => ({ ...f, session_id: e.target.value }))}>
                    <option value="">Select Session</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fee Month <span className="text-red-500">*</span></label>
                  <input type="month" className="input w-full" value={singleForm.fee_month} onChange={e => setSingleForm(f => ({ ...f, fee_month: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date <span className="text-red-500">*</span></label>
                  <input type="date" className="input w-full" value={singleForm.due_date} onChange={e => setSingleForm(f => ({ ...f, due_date: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Fee (PKR) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" className="input w-full" value={singleForm.current_fee} onChange={e => setSingleForm(f => ({ ...f, current_fee: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Other Charges</label>
                  <input type="number" min="0" className="input w-full" value={singleForm.other_charges} onChange={e => setSingleForm(f => ({ ...f, other_charges: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Discount</label>
                  <input type="number" min="0" className="input w-full" value={singleForm.discount} onChange={e => setSingleForm(f => ({ ...f, discount: e.target.value }))} />
                </div>
              </div>

              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Payable</span>
                <span className="text-2xl font-bold text-slate-900">
                  PKR {totalPayable(singleForm.current_fee, outstanding, singleForm.other_charges, singleForm.discount).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={generating || !selectedStudent} className="btn-primary flex items-center gap-2 px-8 py-3 text-base disabled:opacity-50">
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText size={20} />}
              {generating ? 'Generating...' : 'Generate Voucher'}
            </button>
          </div>
        </form>
      )}

      {/* Result */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                <Check className="text-white" size={22} />
              </div>
              <div>
                <p className="font-bold text-emerald-800 text-lg">Vouchers Generated Successfully!</p>
                <p className="text-emerald-600 text-sm">
                  {result.summary?.created} voucher(s) created
                  {result.summary?.skipped > 0 && `, ${result.summary.skipped} skipped (already existed)`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadMonthlyExcel(mode === 'bulk' ? bulkForm.fee_month : singleForm.fee_month)}
              disabled={downloadingExcel}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-700/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {downloadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloadingExcel ? 'Generating File...' : '📥 Download Monthly Fee File Excel (.xlsx)'}
            </button>
          </div>
          {result.data && result.data.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-emerald-200 bg-white max-h-90 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-emerald-50/50 border-b border-emerald-200 sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold text-emerald-800">Voucher #</th>
                    <th className="p-3 font-semibold text-emerald-800">Student</th>
                    <th className="p-3 font-semibold text-emerald-800 text-right">Total Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100">
                  {result.data.map(v => (
                    <tr key={v.id}>
                      <td className="p-3 font-bold text-slate-700">{v.voucher_number}</td>
                      <td className="p-3 text-slate-600">{v.students?.full_name || '-'}</td>
                      <td className="p-3 text-right font-bold text-slate-900">PKR {Number(v.total_payable || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
