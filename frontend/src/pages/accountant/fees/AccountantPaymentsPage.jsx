import React, { useState, useEffect } from 'react';
import { Search, Loader2, CreditCard, X, CheckCircle2, AlertCircle, ChevronDown, Clock, Receipt } from 'lucide-react';
import api from '../../../lib/api';

export default function AccountantPaymentsPage() {
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  // Payment Modal
  const [payModal, setPayModal] = useState(null); // voucher object
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', reference_number: '', remarks: '', payment_date: new Date().toISOString().split('T')[0] });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  // Today's collections
  const [todayPayments, setTodayPayments] = useState([]);
  const [loadingToday, setLoadingToday] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    api.get('/fees/payments', { params: { from_date: today, to_date: today, limit: 50 } })
      .then(res => setTodayPayments(res.data || []))
      .catch(e => console.error(e))
      .finally(() => setLoadingToday(false));
  }, []);

  useEffect(() => {
    if (studentSearch.length < 2) { setStudentResults([]); return; }
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
    setLoadingVouchers(true);
    try {
      const res = await api.get('/fees/vouchers', { params: { search: student.registration_number, limit: 50 } });
      // Only show unpaid/partial/overdue
      const unpaid = (res.data || []).filter(v => ['unpaid', 'partial', 'overdue'].includes(v.status));
      setVouchers(unpaid);
    } catch (e) { console.error(e); }
    finally { setLoadingVouchers(false); }
  };

  const openPayModal = (voucher) => {
    setPayModal(voucher);
    setPayForm({
      amount: String(voucher.total_payable || 0),
      payment_method: 'cash',
      reference_number: '',
      remarks: '',
      payment_date: new Date().toISOString().split('T')[0],
    });
    setPayError('');
    setPaySuccess('');
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!payForm.amount || Number(payForm.amount) <= 0) return setPayError('Please enter a valid amount');
    setPaying(true); setPayError('');
    try {
      await api.post('/fees/payments', {
        voucher_id: payModal.id,
        amount: Number(payForm.amount),
        payment_date: payForm.payment_date,
        payment_method: payForm.payment_method,
        reference_number: payForm.reference_number,
        remarks: payForm.remarks,
      });
      setPaySuccess(`Payment of PKR ${Number(payForm.amount).toLocaleString()} recorded successfully!`);
      // Refresh vouchers
      const res = await api.get('/fees/vouchers', { params: { search: selectedStudent?.registration_number, limit: 50 } });
      setVouchers((res.data || []).filter(v => ['unpaid', 'partial', 'overdue'].includes(v.status)));
      // Refresh today
      const today = new Date().toISOString().split('T')[0];
      api.get('/fees/payments', { params: { from_date: today, to_date: today, limit: 50 } })
        .then(res2 => setTodayPayments(res2.data || []));
      setTimeout(() => setPayModal(null), 2000);
    } catch (err) {
      setPayError(err.response?.data?.message || 'Failed to record payment');
    } finally { setPaying(false); }
  };

  const statusBadge = (status) => {
    const map = {
      unpaid: 'bg-slate-100 text-slate-700',
      partial: 'bg-amber-100 text-amber-800',
      overdue: 'bg-rose-100 text-rose-800',
      paid: 'bg-emerald-100 text-emerald-800',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const todayTotal = todayPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Collect Fee Payment</h1>
        <p className="text-slate-500 mt-1">Search a student to view their outstanding vouchers and record payment</p>
      </div>

      {/* Today Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 mb-1">Today's Collection</p>
          <p className="text-3xl font-bold text-emerald-600">PKR {todayTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 mb-1">Payments Today</p>
          <p className="text-3xl font-bold text-slate-800">{todayPayments.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Date</p>
            <p className="font-bold text-slate-800">{new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
      </div>

      {/* Student Search */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <h2 className="font-bold text-slate-800 mb-4">Search Student</h2>
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            className="input w-full pl-10"
            placeholder="Type student name or registration number..."
            value={studentSearch}
            onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(null); setVouchers([]); }}
          />
          {studentResults.length > 0 && (
            <div className="absolute z-10 bg-white border border-slate-200 rounded-xl shadow-lg w-full mt-1 max-h-60 overflow-y-auto">
              {studentResults.map(s => (
                <button key={s.id} type="button" onClick={() => selectStudent(s)} className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0">
                  <p className="font-semibold text-slate-800">{s.full_name}</p>
                  <p className="text-sm text-slate-500">{s.registration_number} • {s.classes?.name} - {s.sections?.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-bold text-blue-900 text-lg">{selectedStudent.full_name}</p>
              <p className="text-blue-600 text-sm">{selectedStudent.registration_number} • {selectedStudent.classes?.name} - {selectedStudent.sections?.name} • Father: {selectedStudent.father_name}</p>
            </div>
            <button onClick={() => { setSelectedStudent(null); setVouchers([]); setStudentSearch(''); }} className="p-2 text-blue-400 hover:text-blue-700 hover:bg-blue-100 rounded-full">
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Vouchers */}
      {selectedStudent && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-800">Outstanding Vouchers</h2>
            {loadingVouchers && <Loader2 className="animate-spin text-blue-500 w-5 h-5" />}
          </div>
          {!loadingVouchers && vouchers.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-700 text-lg">All Clear!</p>
              <p className="text-slate-500 text-sm">This student has no outstanding fee vouchers.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-semibold text-slate-600">Voucher #</th>
                    <th className="p-4 font-semibold text-slate-600">Month</th>
                    <th className="p-4 font-semibold text-slate-600 text-right">Current Fee</th>
                    <th className="p-4 font-semibold text-slate-600 text-right">Prev. Balance</th>
                    <th className="p-4 font-semibold text-slate-600 text-right">Total Payable</th>
                    <th className="p-4 font-semibold text-slate-600 text-right">Paid</th>
                    <th className="p-4 font-semibold text-slate-600 text-right">Remaining</th>
                    <th className="p-4 font-semibold text-slate-600">Status</th>
                    <th className="p-4 font-semibold text-slate-600 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vouchers.map(v => {
                    const remaining = Number(v.total_payable || 0) - Number(v.amount_paid || 0);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-700">{v.voucher_number}</td>
                        <td className="p-4 text-slate-600">{v.fee_month}</td>
                        <td className="p-4 text-right text-slate-600">PKR {Number(v.current_fee || 0).toLocaleString()}</td>
                        <td className="p-4 text-right font-medium text-rose-600">
                          {Number(v.previous_balance || 0) > 0 ? `PKR ${Number(v.previous_balance).toLocaleString()}` : '-'}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-900">PKR {Number(v.total_payable || 0).toLocaleString()}</td>
                        <td className="p-4 text-right text-emerald-600 font-medium">PKR {Number(v.amount_paid || 0).toLocaleString()}</td>
                        <td className="p-4 text-right font-bold text-rose-700">PKR {remaining.toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusBadge(v.status)}`}>
                            {(v.status || 'unpaid').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => openPayModal(v)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors mx-auto"
                          >
                            <CreditCard size={14} /> Collect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Today's Payments Log */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Receipt size={18} className="text-slate-500" />
          <h2 className="font-bold text-slate-800">Today's Payment Log</h2>
          {loadingToday && <Loader2 className="animate-spin text-slate-400 w-4 h-4 ml-auto" />}
        </div>
        {!loadingToday && todayPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No payments collected today yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-semibold text-slate-600">Time</th>
                  <th className="p-3 font-semibold text-slate-600">Student</th>
                  <th className="p-3 font-semibold text-slate-600">Voucher</th>
                  <th className="p-3 font-semibold text-slate-600">Method</th>
                  <th className="p-3 font-semibold text-slate-600 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500">{new Date(p.payment_date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3 font-semibold text-slate-800">{p.students?.full_name}</td>
                    <td className="p-3 text-slate-500">{p.fee_vouchers?.voucher_number}</td>
                    <td className="p-3 capitalize text-slate-600">{p.payment_method}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">PKR {Number(p.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-emerald-50">
                <tr>
                  <td colSpan={4} className="p-3 font-bold text-slate-700">Total Collected</td>
                  <td className="p-3 text-right font-bold text-emerald-700 text-lg">PKR {todayTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Collect Payment</h2>
              <button onClick={() => setPayModal(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Voucher Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Voucher</span>
                  <span className="font-bold text-slate-700">{payModal.voucher_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Month</span>
                  <span className="font-semibold text-slate-700">{payModal.fee_month}</span>
                </div>
                {Number(payModal.previous_balance || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-rose-500 font-semibold">Previous Balance</span>
                    <span className="font-bold text-rose-600">PKR {Number(payModal.previous_balance).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Current Fee</span>
                  <span className="font-semibold">PKR {Number(payModal.current_fee || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
                  <span className="font-bold text-slate-800">Total Payable</span>
                  <span className="font-bold text-slate-900 text-lg">PKR {Number(payModal.total_payable || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600 text-sm font-semibold">Already Paid</span>
                  <span className="text-emerald-600 font-bold text-sm">PKR {Number(payModal.amount_paid || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-rose-700">Remaining</span>
                  <span className="font-bold text-rose-700 text-xl">PKR {(Number(payModal.total_payable || 0) - Number(payModal.amount_paid || 0)).toLocaleString()}</span>
                </div>
              </div>

              {payError && <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-3 text-sm mb-4 flex gap-2"><AlertCircle size={16} /> {payError}</div>}
              {paySuccess && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm mb-4 flex gap-2"><CheckCircle2 size={16} /> {paySuccess}</div>}

              <form onSubmit={handlePay} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount Received (PKR) <span className="text-red-500">*</span></label>
                  <input type="number" min="1" className="input w-full text-lg font-bold" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
                  <input type="date" className="input w-full" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                  <select className="input w-full" value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                {payForm.payment_method !== 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reference / Cheque No.</label>
                    <input type="text" className="input w-full" placeholder="Optional" value={payForm.reference_number} onChange={e => setPayForm(f => ({ ...f, reference_number: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                  <input type="text" className="input w-full" placeholder="Optional" value={payForm.remarks} onChange={e => setPayForm(f => ({ ...f, remarks: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setPayModal(null)} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200">Cancel</button>
                  <button type="submit" disabled={paying} className="btn-primary flex items-center gap-2 px-6 py-2.5">
                    {paying && <Loader2 className="w-4 h-4 animate-spin" />}
                    <CreditCard size={17} /> Confirm Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
