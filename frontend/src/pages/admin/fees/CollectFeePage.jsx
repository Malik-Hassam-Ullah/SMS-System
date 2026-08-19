import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Loader2, CreditCard, X, CheckCircle2, AlertCircle, Clock, 
    Receipt, DollarSign, Calendar, User, ArrowRight, TrendingUp, Printer, 
    RefreshCw, FileText, Check, ChevronRight, Sparkles, Smartphone, Building
} from 'lucide-react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

export default function CollectFeePage() {
    const { user } = useAuthStore();
    const [studentSearch, setStudentSearch] = useState('');
    const [studentResults, setStudentResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [vouchers, setVouchers] = useState([]);
    const [loadingVouchers, setLoadingVouchers] = useState(false);

    // Payment Modal
    const [payModal, setPayModal] = useState(null); // voucher object
    const [payForm, setPayForm] = useState({
        amount: '',
        payment_method: 'cash',
        reference_number: '',
        remarks: '',
        payment_date: new Date().toISOString().split('T')[0]
    });
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState('');
    const [paySuccess, setPaySuccess] = useState(null); // object with payment details

    // Today's collections
    const [todayPayments, setTodayPayments] = useState([]);
    const [loadingToday, setLoadingToday] = useState(true);
    const [searchLogQuery, setSearchLogQuery] = useState('');

    useEffect(() => {
        fetchTodayPayments();
    }, []);

    const fetchTodayPayments = () => {
        setLoadingToday(true);
        const today = new Date().toISOString().split('T')[0];
        api.get('/fees/payments', { params: { from_date: today, to_date: today, limit: 100 } })
            .then(res => setTodayPayments(res.data?.data || res.data || []))
            .catch(e => console.error(e))
            .finally(() => setLoadingToday(false));
    };

    // Debounced student search
    useEffect(() => {
        const query = studentSearch.trim();
        if (!query) {
            setStudentResults([]);
            setIsSearching(false);
            return;
        }

        // Don't search if the search text matches the selected student's name
        if (selectedStudent && (query === selectedStudent.full_name || query === selectedStudent.registration_number)) {
            return;
        }

        setIsSearching(true);
        const t = setTimeout(async () => {
            try {
                const res = await api.get('/students', { params: { search: query, limit: 12 } });
                const raw = res?.data?.data ?? res?.data ?? res;
                const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
                setStudentResults(list);
            } catch (e) {
                console.error("Search error:", e);
                setStudentResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 250);

        return () => clearTimeout(t);
    }, [studentSearch, selectedStudent]);

    // Instant search handler on Enter key
    const handleSearchSubmit = async (e) => {
        if (e) e.preventDefault();
        const query = studentSearch.trim();
        if (!query) return;

        setIsSearching(true);
        try {
            const res = await api.get('/students', { params: { search: query, limit: 12 } });
            const raw = res?.data?.data ?? res?.data ?? res;
            const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
            setStudentResults(list);
            if (list.length === 1) {
                selectStudent(list[0]);
            }
        } catch (e) {
            console.error("Search submit error:", e);
        } finally {
            setIsSearching(false);
        }
    };

    const selectStudent = async (student) => {
        setSelectedStudent(student);
        setStudentResults([]);
        setStudentSearch(student.full_name);
        setLoadingVouchers(true);
        try {
            const res = await api.get('/fees/vouchers', { params: { student_id: student.id, limit: 50 } });
            const raw = res?.data?.data ?? res?.data ?? res;
            const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
            // Filter to show unpaid/partial/overdue vouchers first
            const unpaid = list.filter(v => ['unpaid', 'partial', 'overdue'].includes(v.status));
            setVouchers(unpaid.length > 0 ? unpaid : list);
        } catch (e) {
            console.error("Fetch vouchers error:", e);
            setVouchers([]);
        } finally {
            setLoadingVouchers(false);
        }
    };

    const clearSelectedStudent = () => {
        setSelectedStudent(null);
        setVouchers([]);
        setStudentSearch('');
        setStudentResults([]);
    };

    const openPayModal = (voucher) => {
        const remaining = Number(voucher.total_payable || 0) - Number(voucher.amount_paid || 0);
        setPayModal(voucher);
        setPayForm({
            amount: String(remaining > 0 ? remaining : ''),
            payment_method: 'cash',
            reference_number: '',
            remarks: '',
            payment_date: new Date().toISOString().split('T')[0],
        });
        setPayError('');
        setPaySuccess(null);
    };

    const handlePay = async (e) => {
        e.preventDefault();
        if (!payModal) return;

        const remaining = Number(payModal.total_payable || 0) - Number(payModal.amount_paid || 0);
        const enteredAmount = Number(payForm.amount);

        if (!payForm.amount || enteredAmount <= 0) {
            return setPayError('Please enter a valid payment amount');
        }
        if (enteredAmount > remaining) {
            return setPayError(`Amount cannot exceed remaining balance of PKR ${remaining.toLocaleString()}`);
        }

        setPaying(true);
        setPayError('');
        try {
            const res = await api.post('/fees/payments', {
                voucher_id: payModal.id,
                amount: enteredAmount,
                payment_date: payForm.payment_date,
                payment_method: payForm.payment_method,
                reference_number: payForm.reference_number,
                remarks: payForm.remarks,
            });

            const newPayment = res.data?.data || {
                amount: enteredAmount,
                payment_method: payForm.payment_method,
                payment_date: payForm.payment_date,
                reference_number: payForm.reference_number
            };

            setPaySuccess({
                message: `Payment of PKR ${enteredAmount.toLocaleString()} recorded successfully!`,
                amount: enteredAmount,
                voucherNumber: payModal.voucher_number,
                feeMonth: payModal.fee_month,
                studentName: selectedStudent?.full_name || payModal.students?.full_name,
                registrationNumber: selectedStudent?.registration_number || payModal.students?.registration_number,
                className: `${selectedStudent?.classes?.name || ''} ${selectedStudent?.sections?.name || ''}`.trim(),
                remainingBalance: remaining - enteredAmount,
                paymentMethod: payForm.payment_method,
                paymentDate: payForm.payment_date,
                paymentId: newPayment.id
            });

            // Refresh vouchers for this student
            if (selectedStudent) {
                const vRes = await api.get('/fees/vouchers', { params: { student_id: selectedStudent.id, limit: 50 } });
                const list = vRes.data?.data || vRes.data || [];
                setVouchers(list.filter(v => ['unpaid', 'partial', 'overdue'].includes(v.status)));
            }

            // Refresh today's collection log
            fetchTodayPayments();
        } catch (err) {
            setPayError(err.response?.data?.message || 'Failed to record payment');
        } finally {
            setPaying(false);
        }
    };

    // Print Receipt Helper
    const printReceipt = (paymentInfo) => {
        const schoolName = user?.school?.name || "School Management System";
        const branchName = user?.branch?.name || "Main Campus";
        const dateStr = new Date(paymentInfo.paymentDate || new Date()).toLocaleDateString('en-PK', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
        const timeStr = new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fee Receipt - ${paymentInfo.voucherNumber || 'Receipt'}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; max-width: 400px; margin: auto; }
    .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 12px; margin-bottom: 12px; }
    .school-title { font-size: 18px; font-weight: bold; color: #0f172a; text-transform: uppercase; margin: 0; }
    .branch-subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
    .receipt-badge { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: bold; margin-top: 6px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
    .info-table td { padding: 4px 0; vertical-align: top; }
    .info-table td.label { color: #64748b; width: 40%; }
    .info-table td.val { font-weight: 600; color: #0f172a; text-align: right; }
    .amount-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin: 12px 0; text-align: center; }
    .amount-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .amount-val { font-size: 22px; font-weight: bold; color: #059669; font-family: monospace; }
    .divider { border-top: 1px dashed #cbd5e1; margin: 12px 0; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px; }
    .signature { display: flex; justify-content: space-between; margin-top: 24px; font-size: 11px; color: #64748b; }
    .sign-line { border-top: 1px solid #94a3b8; width: 100px; margin-top: 24px; }
    @media print {
      body { padding: 0; }
      @page { margin: 10mm; size: auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-title">${schoolName}</div>
    <div class="branch-subtitle">${branchName}</div>
    <div class="receipt-badge">FEE PAYMENT RECEIPT</div>
  </div>

  <table class="info-table">
    <tr><td class="label">Date & Time:</td><td class="val">${dateStr} ${timeStr}</td></tr>
    <tr><td class="label">Voucher #:</td><td class="val">${paymentInfo.voucherNumber || '-'}</td></tr>
    <tr><td class="label">Fee Month:</td><td class="val">${paymentInfo.feeMonth || '-'}</td></tr>
    <tr><td class="label">Student Name:</td><td class="val">${paymentInfo.studentName || '-'}</td></tr>
    <tr><td class="label">Reg / Roll No:</td><td class="val">${paymentInfo.registrationNumber || '-'}</td></tr>
    ${paymentInfo.className ? `<tr><td class="label">Class:</td><td class="val">${paymentInfo.className}</td></tr>` : ''}
    <tr><td class="label">Payment Mode:</td><td class="val" style="text-transform: capitalize;">${paymentInfo.paymentMethod || 'Cash'}</td></tr>
  </table>

  <div class="amount-box">
    <div class="amount-label">Amount Paid</div>
    <div class="amount-val">PKR ${Number(paymentInfo.amount || 0).toLocaleString()}</div>
  </div>

  <table class="info-table">
    <tr>
      <td class="label">Remaining Balance:</td>
      <td class="val" style="color: ${Number(paymentInfo.remainingBalance || 0) > 0 ? '#b91c1c' : '#059669'};">
        PKR ${Number(paymentInfo.remainingBalance || 0).toLocaleString()}
      </td>
    </tr>
  </table>

  <div class="signature">
    <div>
      <div class="sign-line"></div>
      <div>Received By</div>
    </div>
    <div>
      <div class="sign-line"></div>
      <div>Depositor Sign</div>
    </div>
  </div>

  <div class="footer">
    Thank you for your payment.<br>
    This is a computer-generated receipt.
  </div>

  <script>
    window.onload = () => {
      window.print();
    };
  </script>
</body>
</html>`;

        const printWindow = window.open('', '_blank', 'width=450,height=600');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
        } else {
            alert('Popup was blocked. Please allow popups to print the fee receipt.');
        }
    };

    const statusBadge = (status) => {
        const map = {
            unpaid: 'bg-rose-50 text-rose-700 border border-rose-200/80',
            partial: 'bg-amber-50 text-amber-700 border border-amber-200/80',
            overdue: 'bg-red-50 text-red-700 border border-red-200/80',
            paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
        };
        return map[status] || 'bg-slate-50 text-slate-600 border border-slate-200';
    };

    const todayTotal = useMemo(() => {
        return todayPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    }, [todayPayments]);

    // Filter today's payments list
    const filteredTodayPayments = useMemo(() => {
        if (!searchLogQuery.trim()) return todayPayments;
        const q = searchLogQuery.toLowerCase();
        return todayPayments.filter(p => 
            p.students?.full_name?.toLowerCase().includes(q) ||
            p.students?.registration_number?.toLowerCase().includes(q) ||
            p.fee_vouchers?.voucher_number?.toLowerCase().includes(q) ||
            p.payment_method?.toLowerCase().includes(q)
        );
    }, [todayPayments, searchLogQuery]);

    // Format current date nicely like screenshot (e.g., "Wednesday, 19 August")
    const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    const pendingTotal = useMemo(() => {
        return vouchers.reduce((acc, v) => acc + (Number(v.total_payable || 0) - Number(v.amount_paid || 0)), 0);
    }, [vouchers]);

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Collect Fee Payment</h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Search a student to view their outstanding vouchers and record payment
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchTodayPayments}
                        title="Refresh statistics"
                        className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-sm"
                    >
                        <RefreshCw size={17} className={loadingToday ? 'animate-spin text-blue-600' : ''} />
                    </button>
                </div>
            </div>

            {/* Stats Cards - Exactly aligned with screenshot */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Today's Collection */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow transition-all flex flex-col justify-center">
                    <p className="text-sm font-semibold text-slate-500 mb-2">Today's Collection</p>
                    <p className="text-3xl font-bold text-emerald-600 font-mono tracking-tight">
                        PKR {todayTotal.toLocaleString()}
                    </p>
                </div>

                {/* Card 2: Payments Today */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow transition-all flex flex-col justify-center">
                    <p className="text-sm font-semibold text-slate-500 mb-2">Payments Today</p>
                    <p className="text-3xl font-bold text-slate-800 font-mono tracking-tight">
                        {todayPayments.length}
                    </p>
                </div>

                {/* Card 3: Date */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow transition-all flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <Clock size={24} className="text-blue-500" />
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-slate-500">Date</p>
                        <p className="text-lg font-bold text-slate-800 tracking-tight">
                            {formattedDate}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search Student Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 space-y-4 relative z-30">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-slate-800 text-lg tracking-tight">Search Student</h2>
                        <p className="text-xs text-slate-500">Search by student name, roll number, registration number, or father's name</p>
                    </div>
                    {selectedStudent && (
                        <button
                            onClick={clearSelectedStudent}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                            Change Student <X size={14} />
                        </button>
                    )}
                </div>

                <div className="relative">
                    <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                        <Search className="absolute left-4 text-slate-400 pointer-events-none" size={20} />
                        <input
                            type="text"
                            className="w-full pl-12 pr-10 py-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="Type student name or registration number..."
                            value={studentSearch}
                            onChange={e => {
                                setStudentSearch(e.target.value);
                                if (selectedStudent && e.target.value !== selectedStudent.full_name) {
                                    setSelectedStudent(null);
                                    setVouchers([]);
                                }
                            }}
                            autoFocus
                        />
                        {isSearching ? (
                            <div className="absolute right-3.5">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                            </div>
                        ) : studentSearch ? (
                            <button
                                type="button"
                                onClick={clearSelectedStudent}
                                className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        ) : null}
                    </form>

                    {/* Autocomplete Dropdown */}
                    {studentResults.length > 0 && !selectedStudent && (
                        <div className="absolute z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl w-full mt-2 max-h-80 overflow-y-auto divide-y divide-slate-100 animate-in fade-in-50 duration-150">
                            <div className="px-4 py-2.5 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex justify-between items-center">
                                <span>{studentResults.length} Student{studentResults.length > 1 ? 's' : ''} Found</span>
                                <span className="text-[10px] text-slate-400 font-normal">Click to select</span>
                            </div>
                            {studentResults.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => selectStudent(s)}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50/70 transition-colors flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                            {s.full_name?.charAt(0) || 'S'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors text-sm">
                                                {s.full_name}
                                            </p>
                                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">Reg: {s.registration_number || 'N/A'}</span>
                                                {s.roll_number && <span className="font-mono text-slate-600">Roll: {s.roll_number}</span>}
                                                <span>• {s.classes?.name || 'Class'} {s.sections?.name ? `(${s.sections.name})` : ''}</span>
                                                {s.father_name && <span className="text-slate-400">• S/D/O: {s.father_name}</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                        <span className="text-xs font-bold">Select</span>
                                        <ChevronRight size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* No results message */}
                    {!isSearching && studentSearch.trim().length > 0 && studentResults.length === 0 && !selectedStudent && (
                        <div className="absolute z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-full mt-2 p-5 text-center text-sm text-slate-500 animate-in fade-in-50 duration-150">
                            <p className="font-semibold text-slate-700">No student found</p>
                            <p className="text-xs text-slate-400 mt-1">No matching student found for "{studentSearch}". Try typing a name or registration number.</p>
                        </div>
                    )}
                </div>

                {/* Selected Student Banner */}
                {selectedStudent && (
                    <div className="p-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white border border-blue-100 rounded-2xl flex items-center justify-between flex-wrap gap-4 shadow-sm animate-in fade-in duration-200">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-md">
                                {selectedStudent.full_name?.charAt(0) || 'S'}
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h3 className="font-bold text-slate-900 text-lg">{selectedStudent.full_name}</h3>
                                    <span className="px-2.5 py-0.5 bg-blue-100/80 text-blue-800 rounded-full text-xs font-bold font-mono">
                                        {selectedStudent.registration_number}
                                    </span>
                                </div>
                                <p className="text-slate-600 text-sm flex items-center gap-2 flex-wrap">
                                    <span>Class: <strong className="text-slate-800">{selectedStudent.classes?.name || 'N/A'} {selectedStudent.sections?.name ? `(${selectedStudent.sections.name})` : ''}</strong></span>
                                    {selectedStudent.father_name && (
                                        <>
                                            <span className="text-slate-300">•</span>
                                            <span>Father: <strong className="text-slate-800">{selectedStudent.father_name}</strong></span>
                                        </>
                                    )}
                                    {selectedStudent.phone && (
                                        <>
                                            <span className="text-slate-300">•</span>
                                            <span>Phone: <strong className="text-slate-800">{selectedStudent.phone}</strong></span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Balance</p>
                                <p className={`text-xl font-bold font-mono ${pendingTotal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    PKR {pendingTotal.toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={clearSelectedStudent}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-sm"
                                title="Clear selection"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Vouchers Table */}
            {selectedStudent && (
                <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Receipt size={20} className="text-blue-600" />
                            <h2 className="font-bold text-slate-800 text-lg">Fee Vouchers</h2>
                            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200/70 text-slate-700">
                                {vouchers.length}
                            </span>
                        </div>
                        {loadingVouchers && (
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                <Loader2 className="animate-spin text-blue-500 w-4 h-4" />
                                Fetching vouchers...
                            </div>
                        )}
                    </div>

                    {!loadingVouchers && vouchers.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">All Clear!</h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                                This student has no pending or overdue fee vouchers. All dues are cleared.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                                    <tr>
                                        <th className="p-4 font-semibold">Voucher #</th>
                                        <th className="p-4 font-semibold">Fee Month</th>
                                        <th className="p-4 font-semibold text-right">Current Fee</th>
                                        <th className="p-4 font-semibold text-right">Prev. Balance</th>
                                        <th className="p-4 font-semibold text-right">Total Payable</th>
                                        <th className="p-4 font-semibold text-right">Paid</th>
                                        <th className="p-4 font-semibold text-right">Remaining</th>
                                        <th className="p-4 font-semibold text-center">Status</th>
                                        <th className="p-4 font-semibold text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {vouchers.map(v => {
                                        const remaining = Number(v.total_payable || 0) - Number(v.amount_paid || 0);
                                        const isPaid = remaining <= 0;
                                        return (
                                            <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="p-4 font-bold text-slate-800 font-mono">
                                                    {v.voucher_number}
                                                </td>
                                                <td className="p-4 text-slate-700 font-medium">{v.fee_month}</td>
                                                <td className="p-4 text-right text-slate-600 font-mono">
                                                    PKR {Number(v.current_fee || 0).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right font-medium font-mono">
                                                    {Number(v.previous_balance || 0) > 0 ? (
                                                        <span className="text-rose-600">PKR {Number(v.previous_balance).toLocaleString()}</span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right font-bold text-slate-900 font-mono">
                                                    PKR {Number(v.total_payable || 0).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right text-emerald-600 font-semibold font-mono">
                                                    PKR {Number(v.amount_paid || 0).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right font-bold font-mono">
                                                    <span className={remaining > 0 ? 'text-rose-600 text-base' : 'text-emerald-600'}>
                                                        PKR {remaining.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${statusBadge(v.status)}`}>
                                                        {v.status || 'unpaid'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {isPaid ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                                                            <Check size={15} /> Cleared
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => openPayModal(v)}
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow"
                                                        >
                                                            <CreditCard size={14} /> Collect Fee
                                                        </button>
                                                    )}
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
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3 bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Receipt size={17} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-lg leading-tight">Today's Payment Log</h2>
                            <p className="text-xs text-slate-500">Real-time record of all fees collected today</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                            <input
                                type="text"
                                placeholder="Filter today's log..."
                                value={searchLogQuery}
                                onChange={e => setSearchLogQuery(e.target.value)}
                                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-48 transition-all"
                            />
                        </div>
                        {loadingToday && <Loader2 className="animate-spin text-slate-400 w-4 h-4" />}
                    </div>
                </div>

                {!loadingToday && todayPayments.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                        <Clock size={36} className="mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        No fee payments collected today yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                                <tr>
                                    <th className="p-4 font-semibold">Time</th>
                                    <th className="p-4 font-semibold">Student</th>
                                    <th className="p-4 font-semibold">Voucher #</th>
                                    <th className="p-4 font-semibold">Payment Mode</th>
                                    <th className="p-4 font-semibold text-right">Amount</th>
                                    <th className="p-4 font-semibold text-center">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTodayPayments.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="p-4 text-slate-500 font-mono text-xs">
                                            {p.created_at ? new Date(p.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : (p.payment_date || '-')}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-semibold text-slate-800">{p.students?.full_name || 'Student'}</p>
                                            <p className="text-xs text-slate-400 font-mono">{p.students?.registration_number}</p>
                                        </td>
                                        <td className="p-4 text-slate-600 font-mono text-xs">
                                            {p.fee_vouchers?.voucher_number || '-'}
                                        </td>
                                        <td className="p-4">
                                            <span className="capitalize px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                                                {p.payment_method || 'cash'}
                                            </span>
                                            {p.reference_number && (
                                                <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
                                                    Ref: {p.reference_number}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-bold text-emerald-600 font-mono text-base">
                                            PKR {Number(p.amount || 0).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => printReceipt({
                                                    voucherNumber: p.fee_vouchers?.voucher_number,
                                                    feeMonth: p.fee_vouchers?.fee_month,
                                                    studentName: p.students?.full_name,
                                                    registrationNumber: p.students?.registration_number,
                                                    amount: p.amount,
                                                    paymentMethod: p.payment_method,
                                                    paymentDate: p.payment_date,
                                                    remainingBalance: Math.max(0, (Number(p.fee_vouchers?.total_payable || 0) - Number(p.fee_vouchers?.amount_paid || 0)))
                                                })}
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Print Receipt Slip"
                                            >
                                                <Printer size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-200 bg-emerald-50/40">
                                <tr>
                                    <td colSpan={4} className="p-4 font-bold text-slate-800 text-right">
                                        Total Collection Today:
                                    </td>
                                    <td className="p-4 text-right font-bold text-emerald-700 text-lg font-mono">
                                        PKR {todayTotal.toLocaleString()}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {payModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                    <CreditCard size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-800">Record Fee Payment</h2>
                                    <p className="text-xs text-slate-500">Voucher: <span className="font-mono font-bold text-slate-700">{payModal.voucher_number}</span></p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setPayModal(null)} 
                                className="p-1.5 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {paySuccess ? (
                            /* Success Screen */
                            <div className="p-8 text-center space-y-5">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                    <CheckCircle2 size={36} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Payment Recorded!</h3>
                                    <p className="text-emerald-600 font-bold text-lg font-mono mt-1">
                                        PKR {Number(paySuccess.amount).toLocaleString()}
                                    </p>
                                    <p className="text-slate-500 text-xs mt-1">
                                        For {paySuccess.studentName} ({paySuccess.feeMonth})
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-left text-xs space-y-1.5">
                                    <div className="flex justify-between text-slate-600">
                                        <span>Remaining Balance:</span>
                                        <span className="font-bold font-mono text-slate-800">
                                            PKR {Number(paySuccess.remainingBalance || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Payment Mode:</span>
                                        <span className="font-semibold uppercase">{paySuccess.paymentMethod}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 justify-center pt-2">
                                    <button
                                        onClick={() => printReceipt(paySuccess)}
                                        className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                                    >
                                        <Printer size={16} /> Print Receipt
                                    </button>
                                    <button
                                        onClick={() => setPayModal(null)}
                                        className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Payment Form */
                            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                                {/* Voucher Calculation Card */}
                                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Fee Month</span>
                                        <span className="font-bold text-slate-800">{payModal.fee_month}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Total Payable</span>
                                        <span className="font-bold font-mono text-slate-800">PKR {Number(payModal.total_payable || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Already Paid</span>
                                        <span className="font-bold font-mono text-emerald-600">PKR {Number(payModal.amount_paid || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="border-t border-slate-200/80 pt-2 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-700">Remaining Balance</span>
                                        <span className="text-lg font-bold font-mono text-rose-600">
                                            PKR {(Number(payModal.total_payable || 0) - Number(payModal.amount_paid || 0)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {payError && (
                                    <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3.5 text-xs flex gap-2.5 items-center">
                                        <AlertCircle size={16} className="shrink-0 text-red-500" />
                                        <p className="font-semibold">{payError}</p>
                                    </div>
                                )}

                                <form onSubmit={handlePay} className="space-y-4">
                                    {/* Amount Input */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-bold text-slate-700">
                                                Amount Received (PKR) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const rem = Number(payModal.total_payable || 0) - Number(payModal.amount_paid || 0);
                                                        setPayForm(f => ({ ...f, amount: String(rem) }));
                                                    }}
                                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded"
                                                >
                                                    Full (PKR {(Number(payModal.total_payable || 0) - Number(payModal.amount_paid || 0)).toLocaleString()})
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            max={Number(payModal.total_payable || 0) - Number(payModal.amount_paid || 0)}
                                            className="w-full text-xl font-bold font-mono px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                            value={payForm.amount}
                                            onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                                            placeholder="0"
                                            required
                                            autoFocus
                                        />
                                        {payForm.amount && Number(payForm.amount) > 0 && (
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                Balance after this payment: <strong className="font-mono text-slate-800">PKR {Math.max(0, (Number(payModal.total_payable || 0) - Number(payModal.amount_paid || 0)) - Number(payForm.amount)).toLocaleString()}</strong>
                                            </p>
                                        )}
                                    </div>

                                    {/* Payment Method Selector */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Method</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { id: 'cash', label: 'Cash' },
                                                { id: 'bank_transfer', label: 'Bank' },
                                                { id: 'online', label: 'Online' },
                                                { id: 'cheque', label: 'Cheque' },
                                            ].map(m => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => setPayForm(f => ({ ...f, payment_method: m.id }))}
                                                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center ${
                                                        payForm.payment_method === m.id
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Payment Date & Reference */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                                            <input
                                                type="date"
                                                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                value={payForm.payment_date}
                                                onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))}
                                            />
                                        </div>

                                        {payForm.payment_method !== 'cash' ? (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Ref / Trx / Cheque #</label>
                                                <input
                                                    type="text"
                                                    placeholder="Optional"
                                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    value={payForm.reference_number}
                                                    onChange={e => setPayForm(f => ({ ...f, reference_number: e.target.value }))}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Note</label>
                                                <input
                                                    type="text"
                                                    placeholder="Optional note..."
                                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    value={payForm.remarks}
                                                    onChange={e => setPayForm(f => ({ ...f, remarks: e.target.value }))}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => setPayModal(null)}
                                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={paying}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                                        >
                                            {paying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            <CreditCard size={15} /> Record Payment
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
