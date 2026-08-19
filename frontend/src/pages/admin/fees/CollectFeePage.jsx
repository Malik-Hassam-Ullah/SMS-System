import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Loader2, Check, AlertCircle, CreditCard, User, Calendar, ArrowRight } from 'lucide-react';
import api from '../../../lib/api';

export default function CollectFeePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [vouchers, setVouchers] = useState([]);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState('');

    // Payment form states
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // Fetch recent unpaid vouchers on mount for real-time data
        fetchRecentVouchers();
    }, []);

    const fetchRecentVouchers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/fees/vouchers', {
                params: { status: 'unpaid', limit: 50 }
            });
            const results = res.data || [];
            setVouchers(results);
            setSearched(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError('');
        setSuccessMessage('');
        setSelectedVoucher(null);
        try {
            const res = await api.get('/fees/vouchers', {
                params: { search: searchQuery, limit: 50 }
            });
            // api interceptor auto-unwraps {success, data} → data (the vouchers array)
            const results = res.data || [];
            setVouchers(results);
            setSearched(true);
        } catch (err) {
            console.error(err);
            setError('Failed to search vouchers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVoucher = (voucher) => {
        const totalPayable = Number(voucher.current_fee || 0) + Number(voucher.previous_balance || 0) + Number(voucher.other_charges || 0) - Number(voucher.discount || 0);
        const amountPaid = Number(voucher.amount_paid || 0);

        setSelectedVoucher(voucher);
        setPaymentAmount(totalPayable - amountPaid);
        setPaymentMethod('cash');
        setReferenceNumber('');
        setRemarks('');
        setSuccessMessage('');
        setError('');
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!selectedVoucher) return;

        const totalPayable = Number(selectedVoucher.current_fee || 0) + Number(selectedVoucher.previous_balance || 0) + Number(selectedVoucher.other_charges || 0) - Number(selectedVoucher.discount || 0);
        const amountPaid = Number(selectedVoucher.amount_paid || 0);
        const remaining = totalPayable - amountPaid;

        if (Number(paymentAmount) <= 0) {
            setError('Payment amount must be greater than 0.');
            return;
        }
        if (Number(paymentAmount) > remaining) {
            setError(`Payment amount cannot exceed the remaining balance of PKR ${remaining.toLocaleString()}.`);
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await api.post('/fees/payments', {
                voucher_id: selectedVoucher.id,
                amount: Number(paymentAmount),
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: paymentMethod,
                reference_number: referenceNumber,
                remarks: remarks
            });

            setSuccessMessage(`Payment of PKR ${Number(paymentAmount).toLocaleString()} successfully recorded for Voucher ${selectedVoucher.voucher_number}!`);
            setSelectedVoucher(null);
            // Refresh search results
            if (searchQuery) {
                handleSearch();
            } else {
                fetchRecentVouchers();
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to record payment.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Collect Fee</h1>
                <p className="text-slate-500 mt-1">Search student vouchers by Name, Registration Number, Roll Number, or Voucher Number to collect payments.</p>
            </div>

            {/* Search Card */}
            <div className="card p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-3.5 text-slate-400" size={20} />
                        <input
                            type="text"
                            className="input pl-11 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-base"
                            placeholder="Enter Student Name, Reg No, Roll No, or Voucher Number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                    </button>
                </form>
            </div>

            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                        <Check size={18} />
                    </div>
                    <p className="font-semibold">{successMessage}</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={24} />
                    <p className="font-semibold">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Search Results */}
                <div className="lg:col-span-2 space-y-4">
                    {searched && (
                        <h2 className="font-bold text-slate-800 text-lg">
                            Search Results ({vouchers.length})
                        </h2>
                    )}

                    {loading ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
                            <p className="text-slate-500">Searching vouchers...</p>
                        </div>
                    ) : searched && vouchers.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
                            <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                            <p className="font-medium">No matching vouchers found.</p>
                        </div>
                    ) : (
                        vouchers.map((v) => {
                            const totalPayable = Number(v.current_fee || 0) + Number(v.previous_balance || 0) + Number(v.other_charges || 0) - Number(v.discount || 0);
                            const amountPaid = Number(v.amount_paid || 0);
                            const remaining = totalPayable - amountPaid;
                            const isSelected = selectedVoucher?.id === v.id;
                            return (
                                <div
                                    key={v.id}
                                    className={`card p-5 bg-white rounded-xl border transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                                                {v.voucher_number}
                                            </span>
                                            <h3 className="font-bold text-slate-800 text-lg mt-2">
                                                {v.students?.full_name}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-0.5">
                                                Father: <span className="font-medium text-slate-700">{v.students?.father_name || 'N/A'}</span>
                                            </p>
                                            <p className="text-sm text-slate-500 mt-0.5">
                                                Reg No: {v.students?.registration_number || 'N/A'} • Roll No: {v.students?.roll_number || 'N/A'}
                                            </p>
                                            <p className="text-sm text-slate-500 mt-0.5">
                                                Class: {v.students?.classes?.name || 'N/A'} - Section: {v.students?.sections?.name || 'N/A'}
                                            </p>
                                        </div>
                                        <span
                                            className={`badge px-2.5 py-1 rounded-full text-xs font-bold uppercase ${v.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                                v.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                                                    'bg-rose-100 text-rose-800'
                                                }`}
                                        >
                                            {v.status || 'unpaid'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-slate-100 my-3 text-sm">
                                        <div>
                                            <p className="text-slate-500">Total Payable</p>
                                            <p className="font-bold text-slate-800">PKR {totalPayable.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500">Paid Amount</p>
                                            <p className="font-bold text-emerald-600">PKR {amountPaid.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500">Remaining</p>
                                            <p className={`font-bold ${remaining > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                                PKR {remaining.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mt-3">
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            <Calendar size={14} /> Fee Month: <span className="font-semibold text-slate-600">{v.fee_month}</span>
                                        </p>
                                        {v.status !== 'paid' ? (
                                            <button
                                                onClick={() => handleSelectVoucher(v)}
                                                className="btn-primary px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
                                            >
                                                Collect Payment <ArrowRight size={14} />
                                            </button>
                                        ) : (
                                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                                <Check size={14} /> Fully Paid
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Payment Form */}
                <div className="lg:col-span-1">
                    {selectedVoucher ? (
                        <div className="card p-6 bg-white rounded-xl border border-slate-200 shadow-sm sticky top-6 space-y-4 max-h-[calc(100vh-48px)] overflow-y-auto">
                            <div className="border-b border-slate-100 pb-3">
                                <h2 className="font-bold text-slate-800 text-lg">Record Payment</h2>
                                <p className="text-xs text-slate-500 mt-0.5">For Voucher: {selectedVoucher.voucher_number}</p>
                            </div>

                            <div className="space-y-1 text-sm bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                                <p className="font-semibold text-slate-800">{selectedVoucher.students?.full_name}</p>
                                <div className="flex justify-between text-slate-600 text-xs pt-1.5">
                                    <span>Total Payable:</span>
                                    <span>PKR {(Number(selectedVoucher.current_fee || 0) + Number(selectedVoucher.previous_balance || 0) + Number(selectedVoucher.other_charges || 0) - Number(selectedVoucher.discount || 0)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 text-xs">
                                    <span>Already Paid:</span>
                                    <span className="text-emerald-600">PKR {Number(selectedVoucher.amount_paid || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-800 text-sm border-t border-slate-200 pt-1.5 mt-1.5">
                                    <span>Remaining:</span>
                                    <span className="text-rose-600">PKR {((Number(selectedVoucher.current_fee || 0) + Number(selectedVoucher.previous_balance || 0) + Number(selectedVoucher.other_charges || 0) - Number(selectedVoucher.discount || 0)) - Number(selectedVoucher.amount_paid || 0)).toLocaleString()}</span>
                                </div>
                            </div>

                            <form onSubmit={handleRecordPayment} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount to Pay (PKR)</label>
                                    <input
                                        type="number"
                                        className="input w-full p-2.5 border border-slate-200 rounded-lg"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        required
                                        max={(Number(selectedVoucher.current_fee || 0) + Number(selectedVoucher.previous_balance || 0) + Number(selectedVoucher.other_charges || 0) - Number(selectedVoucher.discount || 0)) - Number(selectedVoucher.amount_paid || 0)}
                                        min={1}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                                    <select
                                        className="input w-full p-2.5 border border-slate-200 rounded-lg"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Reference / Transaction ID</label>
                                    <input
                                        type="text"
                                        className="input w-full p-2.5 border border-slate-200 rounded-lg"
                                        value={referenceNumber}
                                        onChange={(e) => setReferenceNumber(e.target.value)}
                                        placeholder="e.g. TXN123456789"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                                    <textarea
                                        className="input w-full p-2.5 border border-slate-200 rounded-lg h-20"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Add notes..."
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedVoucher(null)}
                                        className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center justify-center gap-1"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pay Now'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="card p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 py-12">
                            <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                            <p className="font-medium text-sm">Select a voucher from search results to collect payment.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
