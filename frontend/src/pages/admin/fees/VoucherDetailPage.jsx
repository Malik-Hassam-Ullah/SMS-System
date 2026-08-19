import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, CreditCard, Download, Loader2, AlertCircle } from 'lucide-react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

export default function VoucherDetailPage() {
  const { user } = useAuthStore();
  const isAccountant = user?.role === 'accountant';
  const { id } = useParams();
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentTerms, setPaymentTerms] = useState({
    account_number: 'PK26ALFH0201001006875700',
    branch: 'Kahuta Branch/O201',
    account_title: 'THE SMART SCHOOL KAHUTA',
    bank_name: 'BANK ALFALAH LTD'
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Edit Voucher State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    current_fee: 0,
    other_charges: 0,
    discount: 0,
    due_date: ''
  });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    const fetchVoucher = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/fees/vouchers/${id}`);
        setVoucher(res.data);
        if (res.data.notes) {
          try {
            const parsed = JSON.parse(res.data.notes);
            if (parsed.account_number) {
              setPaymentTerms(parsed);
            }
          } catch (e) {
            // Ignore if not JSON
          }
        }
      } catch (err) {
        console.error("Failed to fetch voucher details:", err);
        setError("Failed to load voucher details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchVoucher();
  }, [id]);

  // Set default amount when modal opens
  useEffect(() => {
    if (voucher) {
      setPaymentAmount(voucher.total_payable - voucher.amount_paid);
    }
  }, [voucher, showPaymentModal]);

  const handlePrint = () => {
    window.print();
  };

  const openEditModal = () => {
    setEditData({
      current_fee: voucher.current_fee || 0,
      other_charges: voucher.other_charges || 0,
      discount: voucher.discount || 0,
      due_date: voucher.due_date ? new Date(voucher.due_date).toISOString().split('T')[0] : ''
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditVoucher = async (e) => {
    e.preventDefault();
    setEditing(true);
    setEditError('');
    try {
      await api.put(`/fees/vouchers/${id}`, editData);

      // Refresh voucher details
      const res = await api.get(`/fees/vouchers/${id}`);
      setVoucher(res.data);
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
      setEditError(err.response?.data?.message || 'Failed to update voucher.');
    } finally {
      setEditing(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setPaymentError('');
    try {
      await api.post('/fees/payments', {
        voucher_id: voucher.id,
        amount: Number(paymentAmount),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        remarks: remarks
      });
      // Refresh voucher details
      const res = await api.get(`/fees/vouchers/${id}`);
      setVoucher(res.data);
      setShowPaymentModal(false);
      setReferenceNumber('');
      setRemarks('');
    } catch (err) {
      console.error(err);
      setPaymentError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-4" />
        <p className="text-slate-500">Loading voucher details...</p>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-6 h-6" />
          <p>{error || "Voucher not found"}</p>
        </div>
        <Link to="/admin/fees/vouchers" className="mt-4 inline-block text-primary-600 hover:underline">
          Back to Vouchers
        </Link>
      </div>
    );
  }

  const settings = voucher.branches?.settings || {};
  const schoolName = settings.schoolName || "THE SMART SCHOOL";
  const branchName = voucher.branches?.name || "KAHUTA";
  const lateFeeEnabled = settings.lateFeeEnabled !== false; // default true
  const lateFeeAmount = lateFeeEnabled ? Number(settings.lateFeeAmount || 200) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Link to={isAccountant ? "/accountant/fees/vouchers" : "/admin/fees/vouchers"} className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-full shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Voucher Details</h1>
        </div>
        <div className="flex gap-3">
          {voucher.status !== 'paid' && (
            <button className="btn-secondary flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 transition-colors" onClick={openEditModal}>
              Edit Voucher
            </button>
          )}
          <button className="btn-secondary flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 transition-colors" onClick={handlePrint}>
            <Printer size={18} /> Print
          </button>
          {voucher.status !== 'paid' && (
            <button
              className="btn-primary flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-primary-700 transition-colors"
              onClick={() => setShowPaymentModal(true)}
            >
              <CreditCard size={18} /> Record Payment
            </button>
          )}
        </div>
      </div>

      <div className="card bg-white rounded-xl shadow-sm border border-slate-200 print:bg-white print:text-black print:border-none print:shadow-none print:p-0 overflow-x-auto">
        <div className="min-w-[1000px] print:min-w-0 print:w-full">
          <div className="grid grid-cols-3 divide-x-2 divide-dashed divide-slate-300 print:divide-black">
            {['Bank Copy', 'School Copy', 'Student Copy'].map((copyType, index) => (
              <div key={index} className="p-6 print:p-4 text-[11px] font-sans text-black">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="w-32">
                    <img src="/tss-logo.png" alt="The Smart School" className="w-full object-contain" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-sm">{copyType}</h3>
                    <p className="text-[11px] mt-0.5">A Project of The City School</p>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <span className="font-bold text-[11px]">Challan #:</span>
                      <span className={`border-b border-black w-24 text-center ${copyType === 'School Copy' ? 'bg-yellow-200 print:bg-transparent' : ''}`}>{voucher.students?.voucher_number || voucher.voucher_number.split('-').pop()}</span>
                    </div>
                  </div>
                </div>

                {/* Student Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-end gap-2">
                    <span className="font-bold w-28">The Smart School:</span>
                    <span className="border-b border-black flex-1 text-center font-bold uppercase">{branchName}</span>
                    <span className="font-bold">Campus</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="font-bold w-28">Student Name:</span>
                    <span className="border-b border-black flex-1 text-center">{voucher.students?.full_name}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="font-bold w-12">Roll#:</span>
                    <span className="border-b border-black w-20 text-center">{voucher.students?.roll_number}</span>
                    <span className="font-bold ml-2 w-10">Class:</span>
                    <span className="border-b border-black flex-1 text-center">{voucher.students?.classes?.name}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="font-bold w-32">Fee for the Month of:</span>
                    <span className={`border-b border-black flex-1 text-center ${copyType === 'School Copy' ? 'bg-yellow-200 print:bg-transparent' : ''}`}>{voucher.fee_month}</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="font-bold w-20">Issue Date:</span>
                    <span className="border-b border-black flex-1 text-center">{new Date(voucher.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</span>
                  </div>
                </div>

                <h4 className="text-center font-bold mb-4 uppercase text-sm">Fee Challan</h4>

                {/* Fee Details */}
                <div className="flex justify-between font-bold mb-3">
                  <span>Description</span>
                  <span>Amount</span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between">
                    <span>Tuition Fee</span>
                    <span className="border-b border-black w-28 text-right font-bold">{Number(voucher.current_fee || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Arrears</span>
                    <span className="border-b border-black w-28 text-right font-bold">{Number(voucher.previous_balance || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Annual Charges</span>
                    <span className="border-b border-black w-28 text-right font-bold">{Number(voucher.other_charges || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Registration Charges</span>
                    <span className="border-b border-black w-28 text-right font-bold">0</span>
                  </div>
                  {Number(voucher.discount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span className="border-b border-black w-28 text-right font-bold">{Number(voucher.discount || 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between font-bold mb-8">
                  <span>Total Payment By Due Date</span>
                  <span className="border-b border-black w-28 text-right font-bold">{Number(voucher.total_payable || 0).toLocaleString()}</span>
                </div>

                <div className="flex justify-between mb-1">
                  <span>Late Fee Charges</span>
                  <span className="border-b border-black w-28 text-right font-bold">{lateFeeAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold mb-12">
                  <span>After Due Date</span>
                  <span className="border-b-2 border-black w-28 text-right font-bold">{(Number(voucher.total_payable || 0) + lateFeeAmount).toLocaleString()}</span>
                </div>

                {/* Payment Terms */}
                <div>
                  <h5 className="font-bold mb-3">Payment Terms:</h5>
                  <div className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-1.5 mb-6">
                    <span className="font-bold">Collection Account# :</span>
                    <span className="font-bold">PK26ALFH0201001006875700</span>

                    <span className="font-bold">Branch:</span>
                    <span>Kahuta Branch/O201</span>

                    <span className="font-bold">Account Title:</span>
                    <span>THE SMART SCHOOL KAHUTA</span>

                    <span className="font-bold mt-2">Bank Name:</span>
                    <span className="font-bold mt-2">BANK ALFALAH LTD</span>
                  </div>

                  <div className="flex justify-between items-end mt-6">
                    <div className="flex items-end gap-1">
                      <span className="font-bold">PV (Roll#):</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="font-bold">Due Date:</span>
                      <span className={`text-center ${copyType === 'School Copy' ? 'bg-yellow-200 print:bg-transparent px-2' : ''}`}>{new Date(voucher.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 mt-3">
                    <span className="font-bold">Buyer (Challan #):</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-md rounded-xl shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Record Fee Payment</h2>

            {paymentError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 mb-4">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid (PKR)</label>
                <input
                  type="number"
                  className="input w-full"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  required
                  max={voucher.total_payable - voucher.amount_paid}
                  min={1}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  className="input w-full"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference Number / Transaction ID</label>
                <input
                  type="text"
                  className="input w-full"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  placeholder="e.g. TXN123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  className="input w-full h-20"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Voucher Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-md rounded-xl shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-slate-900">Edit Voucher</h2>

            {editError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 mb-4">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditVoucher} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tuition Fee (PKR)</label>
                <input
                  type="number"
                  className="input w-full"
                  value={editData.current_fee}
                  onChange={e => setEditData({ ...editData, current_fee: e.target.value })}
                  required
                  min={0}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Annual Charges (PKR)</label>
                <input
                  type="number"
                  className="input w-full"
                  value={editData.other_charges}
                  onChange={e => setEditData({ ...editData, other_charges: e.target.value })}
                  min={0}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discount (PKR)</label>
                <input
                  type="number"
                  className="input w-full"
                  value={editData.discount}
                  onChange={e => setEditData({ ...editData, discount: e.target.value })}
                  min={0}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={editData.due_date}
                  onChange={e => setEditData({ ...editData, due_date: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                  onClick={() => setShowEditModal(false)}
                  disabled={editing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={editing}
                >
                  {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
