import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, Loader2, AlertCircle, Download } from 'lucide-react';
import api from '../../lib/api';

export default function PublicVoucherPage() {
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

    useEffect(() => {
        const fetchVoucher = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/public/vouchers/${id}`);
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
                setError("Failed to load voucher details. Please verify the link.");
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchVoucher();
    }, [id]);

    useEffect(() => {
        if (voucher && new URLSearchParams(window.location.search).get('print') === 'true') {
            const timer = setTimeout(() => {
                window.print();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [voucher]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                <p className="text-slate-600 font-medium">Loading fee voucher...</p>
            </div>
        );
    }

    if (error || !voucher) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
                <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center border border-slate-100">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Voucher Not Found</h2>
                    <p className="text-slate-500 text-sm mb-6">{error || "The requested fee voucher could not be found."}</p>
                </div>
            </div>
        );
    }

    const schoolName = voucher.branches?.schools?.name || "THE SMART SCHOOL";
    const branchName = voucher.branches?.name || "KAHUTA CAMPUS";
    const logoUrl = voucher.branches?.schools?.logo_url || "/tss-logo.png";

    return (
        <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
            <div className="max-w-5xl mx-auto">
                {/* Top Bar */}
                <div className="flex justify-between items-center mb-6 print:hidden bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">Fee Challan</h1>
                        <p className="text-xs text-slate-500">Student: <span className="font-semibold">{voucher.students?.full_name}</span></p>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-colors text-sm"
                    >
                        <Printer size={16} /> Print / Save PDF
                    </button>
                </div>

                {/* 3-Part Challan */}
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 print:border-none print:shadow-none overflow-x-auto p-2 print:p-0">
                    <div className="min-w-[1000px] print:min-w-0 print:w-full">
                        <div className="grid grid-cols-3 divide-x-2 divide-dashed divide-slate-300 print:divide-black">
                            {['Bank Copy', 'School Copy', 'Student Copy'].map((copyType, index) => (
                                <div key={index} className="p-6 print:p-4 text-[11px] font-sans text-black">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-32">
                                            <img src={logoUrl} alt={schoolName} className="w-full object-contain" onError={(e) => { e.target.src = '/tss-logo.png'; }} />
                                        </div>
                                        <div className="text-right">
                                            <h3 className="font-bold text-sm">{copyType}</h3>
                                            <p className="text-[9px] mt-0.5">A Project of The City School</p>
                                            <div className="mt-3 flex items-center justify-end gap-2">
                                                <span className="font-bold text-[11px]">Challan #:</span>
                                                <span className={`border-b border-black w-24 text-center ${copyType === 'School Copy' ? 'bg-yellow-100 print:bg-transparent' : ''}`}>
                                                    {voucher.students?.voucher_number || voucher.voucher_number.split('-').pop()}
                                                </span>
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
                                            <span className="border-b border-black flex-1 text-center font-semibold">{voucher.students?.full_name}</span>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <span className="font-bold w-12">Roll#:</span>
                                            <span className="border-b border-black w-20 text-center">{voucher.students?.roll_number}</span>
                                            <span className="font-bold ml-2 w-10">Class:</span>
                                            <span className="border-b border-black flex-1 text-center">{voucher.students?.classes?.name}</span>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <span className="font-bold w-32">Fee for the Month of:</span>
                                            <span className={`border-b border-black flex-1 text-center font-bold ${copyType === 'School Copy' ? 'bg-yellow-200 print:bg-transparent' : ''}`}>{voucher.fee_month}</span>
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <span className="font-bold w-20">Issue Date:</span>
                                            <span className="border-b border-black flex-1 text-center">
                                                {new Date(voucher.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
                                            </span>
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
                                            <div className="flex justify-between text-green-700 print:text-black">
                                                <span>Discount</span>
                                                <span className="border-b border-black w-28 text-right font-bold">-{Number(voucher.discount || 0).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between font-bold mb-8">
                                        <span>Total Payment By Due Date</span>
                                        <span className="border-b border-black w-28 text-right font-bold">{Number(voucher.total_payable || 0).toLocaleString()}</span>
                                    </div>

                                    <div className="flex justify-between mb-1">
                                        <span>Late Fee Charges</span>
                                        <span className="border-b border-black w-28 text-right font-bold">200</span>
                                    </div>
                                    <div className="flex justify-between font-bold mb-12">
                                        <span>After Due Date</span>
                                        <span className="border-b-2 border-black w-28 text-right font-bold">{(Number(voucher.total_payable || 0) + 200).toLocaleString()}</span>
                                    </div>

                                    {/* Payment Terms */}
                                    <div>
                                        <h5 className="font-bold mb-3">Payment Terms:</h5>
                                        <div className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-1.5 mb-6">
                                            <span className="font-bold">Collection Account# :</span>
                                            <span className="font-bold">{paymentTerms.account_number}</span>

                                            <span className="font-bold">Branch:</span>
                                            <span>{paymentTerms.branch}</span>

                                            <span className="font-bold">Account Title:</span>
                                            <span>{paymentTerms.account_title}</span>

                                            <span className="font-bold mt-2">Bank Name:</span>
                                            <span className="font-bold mt-2">{paymentTerms.bank_name}</span>
                                        </div>

                                        <div className="flex justify-between items-end mt-6">
                                            <div className="flex items-end gap-1">
                                                <span className="font-bold">PV (Roll#):</span>
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <span className="font-bold">Due Date:</span>
                                                <span className={`text-center font-bold ${copyType === 'School Copy' ? 'bg-yellow-200 print:bg-transparent px-2' : ''}`}>
                                                    {new Date(voucher.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
                                                </span>
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
            </div>
        </div>
    );
}
