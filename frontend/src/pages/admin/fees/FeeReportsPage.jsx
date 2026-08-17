import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Download, Loader2, Receipt, Search, DollarSign, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import api from '../../../lib/api';

export default function FeeReportsPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchReport = async (selectedDate) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/fees/reports/daily', { params: { date: selectedDate } });
      setReport(res.data?.data || { payments: [], totalCollection: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(date);
  }, [date]);

  const payments = report?.payments || [];
  const filteredPayments = payments.filter(p => 
    p.students?.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    p.fee_vouchers?.voucher_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.received_by?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="text-emerald-500" /> Daily Fee Collection Report
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Monitor daily fee collections processed by accountants</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="date" 
              className="input pl-10 pr-4 py-2 bg-white border-slate-200"
              value={date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button className="btn-outline bg-white shadow-sm disabled:opacity-50" disabled={payments.length === 0}>
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <DollarSign className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Collected</p>
            {loading ? <div className="h-8 w-24 bg-slate-100 rounded animate-pulse"></div> : (
              <h3 className="text-3xl font-bold text-slate-900">PKR {Number(report?.totalCollection || 0).toLocaleString()}</h3>
            )}
          </div>
        </div>

        <div className="card bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Receipt className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Transactions</p>
            {loading ? <div className="h-8 w-16 bg-slate-100 rounded animate-pulse"></div> : (
              <h3 className="text-3xl font-bold text-slate-900">{payments.length}</h3>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="font-bold text-slate-800 text-lg">Transaction Log</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search student, voucher, accountant..." 
              className="input w-full pl-9 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600 whitespace-nowrap">Time</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Student</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Voucher No.</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Method</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Received By</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading transactions...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-base font-medium text-slate-900">No collections found</p>
                    <p className="mt-1 text-sm text-slate-500">No fees were collected on this date.</p>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No transactions match your search.</td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(p.payment_date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{p.students?.full_name}</p>
                      <p className="text-xs text-slate-500">{p.students?.registration_number}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{p.fee_vouchers?.voucher_number}</td>
                    <td className="px-6 py-4">
                      <span className="capitalize px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                        {p.payment_method?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {p.received_by?.full_name || 'Admin'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-700">
                      {Number(p.amount).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filteredPayments.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/50">
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">Total Collection</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-700 text-lg">
                    PKR {Number(report?.totalCollection || 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
