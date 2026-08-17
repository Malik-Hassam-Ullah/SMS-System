import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Eye, Printer, Download, Loader2, FileText, Settings, MessageSquare } from 'lucide-react';
import api from '../../../lib/api';
import * as XLSX from 'xlsx';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Bulk WhatsApp State
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);
  const [sendingBulkWhatsApp, setSendingBulkWhatsApp] = useState(false);
  const [bulkWhatsAppForm, setBulkWhatsAppForm] = useState({
    fee_month: new Date().toISOString().slice(0, 7),
    class_id: ''
  });

  // Bulk Update State
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [updatingBulk, setUpdatingBulk] = useState(false);
  const [bulkUpdateForm, setBulkUpdateForm] = useState({
    fee_month: new Date().toISOString().slice(0, 7),
    class_id: '',
    due_date: '',
    update_payment_terms: false,
    paymentTerms: {
      account_number: 'PK26ALFH0201001006875700',
      branch: 'Kahuta Branch/O201',
      account_title: 'THE SMART SCHOOL KAHUTA',
      bank_name: 'BANK ALFALAH LTD'
    }
  });

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/classes');
        setClasses(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchClasses();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/fees/vouchers', { params: { search, page, limit } });
      setVouchers(res.data || []);
      if (res.pagination) {
        setTotalPages(Math.ceil(res.pagination.total / limit));
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to fetch vouchers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    if (!bulkUpdateForm.fee_month) return alert('Fee month is required');

    setUpdatingBulk(true);
    try {
      const payload = {
        fee_month: bulkUpdateForm.fee_month,
        class_id: bulkUpdateForm.class_id,
        due_date: bulkUpdateForm.due_date || undefined
      };

      if (bulkUpdateForm.update_payment_terms) {
        payload.notes = JSON.stringify(bulkUpdateForm.paymentTerms);
      }

      const res = await api.put('/fees/vouchers/bulk/update', payload);
      alert(res.data.message || `Successfully updated ${res.data.updatedCount} vouchers`);
      setShowBulkUpdateModal(false);
      fetchVouchers(); // Refresh list
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update vouchers');
    } finally {
      setUpdatingBulk(false);
    }
  };

  const handleBulkWhatsApp = async (e) => {
    e.preventDefault();
    if (!bulkWhatsAppForm.fee_month) return alert('Fee month is required');

    setSendingBulkWhatsApp(true);
    try {
      const res = await api.post('/fees/vouchers/bulk/send-whatsapp', {
        fee_month: bulkWhatsAppForm.fee_month,
        class_id: bulkWhatsAppForm.class_id || undefined
      });
      alert(res.message || `Successfully queued ${res.sentCount} vouchers for WhatsApp dispatch.`);
      setShowBulkWhatsAppModal(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to send bulk WhatsApp vouchers.');
    } finally {
      setSendingBulkWhatsApp(false);
    }
  };

  const handleSendSingleWhatsApp = async (voucher) => {
    const parentPhone = voucher.students?.contact_number;
    if (!parentPhone) {
      alert('Parent contact number is missing for this student.');
      return;
    }

    const studentName = voucher.students?.full_name || 'Student';
    const rollNumber = voucher.students?.roll_number || 'N/A';
    const currentFee = Number(voucher.current_fee || 0);
    const balance = Number(voucher.previous_balance || 0);
    const total = Number(voucher.current_fee || 0) + Number(voucher.previous_balance || 0) + Number(voucher.other_charges || 0) - Number(voucher.discount || 0);
    const dueDate = new Date(voucher.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const publicLink = `${window.location.origin}/public/vouchers/${voucher.id}`;

    const messageText = `Dear Parent,
The fee voucher for *${studentName}* (Roll No: ${rollNumber}) for *${voucher.fee_month}* has been generated.

*Current Fee:* Rs. ${currentFee.toLocaleString()}
*Previous Balance:* Rs. ${balance.toLocaleString()}
*Total Payable:* Rs. ${total.toLocaleString()}
*Due Date:* ${dueDate}

Please view/download the 3-part fee challan here:
${publicLink}`;

    try {
      const statusRes = await api.get('/whatsapp/status');
      if (statusRes.data?.status === 'connected') {
        await api.post('/whatsapp/test', { phone: parentPhone, message: messageText });
        alert('Voucher sent successfully via WhatsApp!');
        return;
      }
    } catch (err) {
      console.error('Failed to send via gateway, falling back to manual link:', err);
    }

    // Fallback: Open manual WhatsApp Web link
    let formattedPhone = parentPhone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '92' + formattedPhone.substring(1);
    }
    const encodedText = encodeURIComponent(messageText);
    window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, '_blank');
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setPage(1); // Reset to page 1 on new search
      fetchVouchers();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!search) {
      fetchVouchers();
    }
  }, [page]);

  const exportToExcel = async () => {
    try {
      // Fetch all vouchers for export
      const res = await api.get('/fees/vouchers', { params: { limit: 10000 } });
      let allVouchers = res.data || [];

      // Group by Class and Section
      const grouped = {};
      allVouchers.forEach(v => {
        const className = v.students?.classes?.name || 'Unknown Class';
        const sectionName = v.students?.sections?.name || 'Unknown Section';
        const groupKey = `${className}/${sectionName}`;
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(v);
      });

      // Sort groups alphabetically
      const sortedGroupKeys = Object.keys(grouped).sort();

      const aoa = [];
      const monthName = new Date().toLocaleString('default', { month: 'long' });
      const year = new Date().getFullYear();

      // Top Headers
      aoa.push([null, "                                                                                                        The Smart School Kahuta Campus"]);
      aoa.push([null, null, null, `                                                           Fee Detail for the Month of ${monthName} , ${year}`]);

      const headers = [
        'Sr.', 'V.no', 'Roll.No', 'Name', '', 'New Fee', 'Annual Charges', 'Reg; Charges',
        'Previous Balance', 'Total Fee', 'Cash Deposit', 'Bank Deposit',
        'Deposit Date', 'Current Balance', 'Sibling Detail', 'Current Balance', 'Discount Detail'
      ];

      sortedGroupKeys.forEach((key, index) => {
        if (index > 0) {
          aoa.push([]); // Empty row
          aoa.push([]); // Empty row
        }

        // Group Header
        aoa.push([null, `                                   Grade:   ${key}`]);
        aoa.push(headers);

        let totals = {
          newFee: 0, annual: 0, reg: 0, prev: 0, totalFee: 0,
          cash: 0, bank: 0, currentBal1: 0, currentBal2: 0, discount: 0
        };

        // Sort students within group by Roll Number
        const students = grouped[key].sort((a, b) => {
          const rollA = a.students?.roll_number || '';
          const rollB = b.students?.roll_number || '';
          return rollA.localeCompare(rollB, undefined, { numeric: true });
        });

        students.forEach((v, i) => {
          const currentFee = Number(v.current_fee || 0);
          const otherCharges = Number(v.other_charges || 0);
          const previousBalance = Number(v.previous_balance || 0);
          const discount = Number(v.discount || 0);
          const totalPayable = currentFee + previousBalance + otherCharges - discount;

          totals.newFee += currentFee;
          totals.annual += otherCharges;
          totals.prev += previousBalance;
          totals.totalFee += totalPayable;
          totals.discount += discount;

          aoa.push([
            i + 1,
            v.voucher_number,
            v.students?.roll_number || '-',
            v.students?.full_name || 'N/A',
            null, // Empty column
            currentFee,
            otherCharges || null,
            null, // Reg Charge
            previousBalance,
            totalPayable,
            null, // Cash Deposit
            null, // Bank Deposit
            null, // Deposit Date
            null, // Current Balance 1
            null, // Sibling Detail
            null, // Current Balance 2
            discount || null
          ]);
        });

        // Totals Row
        aoa.push([
          students.length, null, null, "     Total", null,
          totals.newFee, totals.annual, totals.reg, totals.prev, totals.totalFee,
          null, null, null, null, null, null, totals.discount || null
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Auto-size columns slightly to match layout
      const colWidths = [
        { wch: 5 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 2 },
        { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Monthly Fee File ${monthName.substring(0, 3)} ,${year}`);
      XLSX.writeFile(wb, `Monthly Fee File ${monthName} ,${year}.xlsx`);
    } catch (err) {
      console.error("Failed to export vouchers:", err);
      alert("Failed to export vouchers. Please try again.");
    }
  };

  return (
    <div className="p-6">
      <div className="page-header flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold ">Fee Vouchers</h1>
        <div className="flex gap-3">
          <button onClick={() => setShowBulkWhatsAppModal(true)} className="btn-secondary flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-4 py-2 rounded-lg font-medium transition-colors">
            <MessageSquare size={18} /> Send WhatsApp
          </button>
          <button onClick={() => setShowBulkUpdateModal(true)} className="btn-secondary flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium transition-colors">
            <Settings size={18} /> Bulk Update
          </button>
          <button onClick={exportToExcel} className="btn-secondary flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors">
            <Download size={18} /> Export Excel
          </button>
          <Link to="/admin/fees/generate" className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Generate Voucher
          </Link>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-slate-500" size={18} />
            <input
              type="text"
              className="input pl-10 w-full"
              placeholder="Search by student or voucher ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-secondary flex items-center gap-2 bg-slate-50 p-2 rounded hover:bg-slate-100">
            <Filter size={18} /> Filters
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
              <th className="p-4">Voucher ID</th>
              <th className="p-4">Student</th>
              <th className="p-4">Class</th>
              <th className="p-4">Total Fee</th>
              <th className="p-4">Paid</th>
              <th className="p-4">Arrears</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="text-center p-8 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                  Loading vouchers...
                </td>
              </tr>
            ) : vouchers.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center p-8 text-slate-500">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No fee vouchers found.
                </td>
              </tr>
            ) : (
              vouchers.map(v => {
                const totalPayable = Number(v.total_payable || 0) || (Number(v.current_fee || 0) + Number(v.previous_balance || 0) + Number(v.other_charges || 0) - Number(v.discount || 0));
                const amountPaid = Number(v.amount_paid || 0);
                const arrears = Math.max(0, totalPayable - amountPaid);
                return (
                  <tr key={v.id} className="border-b border-slate-200 hover:bg-white transition-colors">
                    <td className="p-4 font-medium">{v.voucher_number}</td>
                    <td className="p-4 text-slate-600 font-medium">{v.students?.full_name || 'N/A'}</td>
                    <td className="p-4 text-slate-600">{v.students?.classes?.name}{v.students?.sections?.name ? ` - ${v.students?.sections?.name}` : ''}</td>
                    <td className="p-4 text-slate-900 font-bold">PKR {totalPayable.toLocaleString()}</td>
                    <td className="p-4 font-semibold text-emerald-700">
                      {amountPaid > 0 ? `PKR ${amountPaid.toLocaleString()}` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="p-4 font-bold">
                      {arrears > 0
                        ? <span className="text-rose-600">PKR {arrears.toLocaleString()}</span>
                        : <span className="text-emerald-600">Cleared</span>
                      }
                    </td>
                    <td className="p-4 text-slate-600">{new Date(v.due_date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`badge px-2.5 py-1 rounded-full text-xs font-semibold ${v.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                          v.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                            v.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                              'bg-slate-100 text-slate-800'
                        }`}>
                        {v.status === 'partial' ? 'PARTIAL PAID' : (v.status || 'unpaid').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <button onClick={() => handleSendSingleWhatsApp(v)} className="text-green-600 hover:text-green-700 p-1 bg-green-50 rounded" title="Send via WhatsApp">
                        <MessageSquare size={18} />
                      </button>
                      <Link to={`/admin/fees/vouchers/${v.id}`} className="text-blue-500 hover:text-blue-600 p-1 bg-blue-50 rounded">
                        <Eye size={18} />
                      </Link>
                      <button
                        onClick={() => window.open(`/public/vouchers/${v.id}?print=true`, '_blank')}
                        className="text-slate-500 hover:text-slate-700 p-1 bg-slate-50 rounded"
                        title="Print Voucher"
                      >
                        <Printer size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">
            Showing page <span className="font-medium text-slate-900">{page}</span> of <span className="font-medium text-slate-900">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-md rounded-xl shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Bulk Update Vouchers</h2>
            <p className="text-sm text-slate-500 mb-6">Update the due date for all unpaid vouchers in a specific month.</p>

            <form onSubmit={handleBulkUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fee Month <span className="text-red-500">*</span></label>
                <input
                  type="month"
                  className="input w-full"
                  value={bulkUpdateForm.fee_month}
                  onChange={e => setBulkUpdateForm({ ...bulkUpdateForm, fee_month: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class (Optional)</label>
                <select
                  className="input w-full"
                  value={bulkUpdateForm.class_id}
                  onChange={e => setBulkUpdateForm({ ...bulkUpdateForm, class_id: e.target.value })}
                >
                  <option value="">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-400 mt-1 block">Leave empty to update all classes.</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Due Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={bulkUpdateForm.due_date}
                  onChange={e => setBulkUpdateForm({ ...bulkUpdateForm, due_date: e.target.value })}
                />
                <span className="text-xs text-slate-400 mt-1 block">Leave empty if you don't want to change the due date.</span>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                    checked={bulkUpdateForm.update_payment_terms}
                    onChange={e => setBulkUpdateForm({ ...bulkUpdateForm, update_payment_terms: e.target.checked })}
                  />
                  <span className="font-bold text-sm text-slate-900">Update Payment Terms</span>
                </label>

                {bulkUpdateForm.update_payment_terms && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Collection Account #</label>
                      <input
                        type="text"
                        className="input w-full text-sm"
                        value={bulkUpdateForm.paymentTerms.account_number}
                        onChange={e => setBulkUpdateForm({ ...bulkUpdateForm, paymentTerms: { ...bulkUpdateForm.paymentTerms, account_number: e.target.value } })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
                      <input
                        type="text"
                        className="input w-full text-sm"
                        value={bulkUpdateForm.paymentTerms.branch}
                        onChange={e => setBulkUpdateForm({ ...bulkUpdateForm, paymentTerms: { ...bulkUpdateForm.paymentTerms, branch: e.target.value } })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Account Title</label>
                      <input
                        type="text"
                        className="input w-full text-sm"
                        value={bulkUpdateForm.paymentTerms.account_title}
                        onChange={e => setBulkUpdateForm({ ...bulkUpdateForm, paymentTerms: { ...bulkUpdateForm.paymentTerms, account_title: e.target.value } })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        className="input w-full text-sm"
                        value={bulkUpdateForm.paymentTerms.bank_name}
                        onChange={e => setBulkUpdateForm({ ...bulkUpdateForm, paymentTerms: { ...bulkUpdateForm.paymentTerms, bank_name: e.target.value } })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                  onClick={() => setShowBulkUpdateModal(false)}
                  disabled={updatingBulk}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={updatingBulk}
                >
                  {updatingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Vouchers'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk WhatsApp Modal */}
      {showBulkWhatsAppModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-md rounded-xl shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold mb-2 text-slate-900 flex items-center gap-2">
              <MessageSquare className="text-green-600" /> Send Vouchers via WhatsApp
            </h2>
            <p className="text-sm text-slate-500 mb-6">Send fee vouchers to parents via WhatsApp in the background with a safe delay.</p>

            <form onSubmit={handleBulkWhatsApp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fee Month <span className="text-red-500">*</span></label>
                <input
                  type="month"
                  className="input w-full"
                  value={bulkWhatsAppForm.fee_month}
                  onChange={e => setBulkWhatsAppForm({ ...bulkWhatsAppForm, fee_month: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class (Optional)</label>
                <select
                  className="input w-full"
                  value={bulkWhatsAppForm.class_id}
                  onChange={e => setBulkWhatsAppForm({ ...bulkWhatsAppForm, class_id: e.target.value })}
                >
                  <option value="">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-400 mt-1 block">Leave empty to send to all classes.</span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                  onClick={() => setShowBulkWhatsAppModal(false)}
                  disabled={sendingBulkWhatsApp}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700 border-green-600"
                  disabled={sendingBulkWhatsApp}
                >
                  {sendingBulkWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Vouchers'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
