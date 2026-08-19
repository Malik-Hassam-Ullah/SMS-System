import React, { useState, useEffect, useMemo } from 'react';
import { 
    DollarSign, Plus, CheckCircle2, XCircle, Clock, Filter, 
    Search, Calendar, Building2, Download, Printer, RefreshCw, 
    AlertTriangle, Check, X, Tag, FileText, ChevronRight, Loader2, ArrowUpRight
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

const EXPENSE_CATEGORIES = [
    'Utilities (Electricity, Water, Gas)',
    'Salaries & Wages',
    'Building & Maintenance',
    'Stationery & Office Supplies',
    'Rent & Property',
    'Refreshment & Events',
    'Transport & Fuel',
    'Marketing & Advertising',
    'IT & Software',
    'Miscellaneous'
];

export default function CeoExpensesPage() {
    const { user } = useAuthStore();
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({
        totalApproved: 0,
        totalPending: 0,
        totalRejected: 0,
        pendingCount: 0,
        approvedCount: 0,
        thisMonthApproved: 0,
        categoryBreakdown: {}
    });
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [rejectModalExpense, setRejectModalExpense] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // New Expense Form (CEO Direct Add)
    const [newExpenseForm, setNewExpenseForm] = useState({
        branch_id: '',
        title: '',
        category: 'Utilities (Electricity, Water, Gas)',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        reference_number: '',
        description: ''
    });
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [selectedBranch, statusFilter, categoryFilter, fromDate, toDate]);

    const fetchBranches = async () => {
        try {
            const res = await api.get('/ceo/branches');
            const list = res?.data?.data ?? res?.data ?? res ?? [];
            setBranches(Array.isArray(list) ? list : []);
            if (list.length > 0 && !newExpenseForm.branch_id) {
                setNewExpenseForm(f => ({ ...f, branch_id: list[0].id }));
            }
        } catch (e) {
            console.error('Failed to fetch branches:', e);
        }
    };

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const params = {
                branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                category: categoryFilter !== 'all' ? categoryFilter : undefined,
                from_date: fromDate || undefined,
                to_date: toDate || undefined,
                search: searchQuery || undefined,
                limit: 200
            };
            const res = await api.get('/expenses', { params });
            const list = res?.data?.data ?? res?.data ?? [];
            setExpenses(Array.isArray(list) ? list : []);
            if (res?.data?.summary) {
                setSummary(res.data.summary);
            }
        } catch (e) {
            console.error('Failed to fetch expenses:', e);
        } finally {
            setLoading(false);
        }
    };

    // CEO 1-Click Approve
    const handleApprove = async (expenseId) => {
        setActionLoading(true);
        try {
            await api.put(`/expenses/${expenseId}/approve`);
            fetchExpenses();
        } catch (e) {
            alert(e?.response?.data?.message || 'Failed to approve expense');
        } finally {
            setActionLoading(false);
        }
    };

    // CEO Submit Rejection
    const handleRejectSubmit = async (e) => {
        e.preventDefault();
        if (!rejectModalExpense) return;
        setActionLoading(true);
        try {
            await api.put(`/expenses/${rejectModalExpense.id}/reject`, {
                rejection_reason: rejectionReason
            });
            setRejectModalExpense(null);
            setRejectionReason('');
            fetchExpenses();
        } catch (e) {
            alert(e?.response?.data?.message || 'Failed to reject expense');
        } finally {
            setActionLoading(false);
        }
    };

    // CEO Direct Add Expense
    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!newExpenseForm.title.trim()) {
            return setFormError('Title is required');
        }
        if (!newExpenseForm.amount || Number(newExpenseForm.amount) <= 0) {
            return setFormError('Please enter a valid amount');
        }

        setActionLoading(true);
        setFormError('');
        try {
            await api.post('/expenses', newExpenseForm);
            setShowAddModal(false);
            setNewExpenseForm({
                branch_id: branches[0]?.id || '',
                title: '',
                category: 'Utilities (Electricity, Water, Gas)',
                amount: '',
                expense_date: new Date().toISOString().split('T')[0],
                payment_method: 'cash',
                reference_number: '',
                description: ''
            });
            fetchExpenses();
        } catch (err) {
            setFormError(err?.response?.data?.message || 'Failed to add expense');
        } finally {
            setActionLoading(false);
        }
    };

    // Filtered by in-memory search
    const filteredExpenses = useMemo(() => {
        if (!searchQuery.trim()) return expenses;
        const q = searchQuery.toLowerCase();
        return expenses.filter(e => 
            e.title?.toLowerCase().includes(q) ||
            e.category?.toLowerCase().includes(q) ||
            e.reference_number?.toLowerCase().includes(q) ||
            e.branches?.name?.toLowerCase().includes(q) ||
            e.created_user?.full_name?.toLowerCase().includes(q) ||
            e.description?.toLowerCase().includes(q)
        );
    }, [expenses, searchQuery]);

    const pendingExpenses = useMemo(() => {
        return expenses.filter(e => e.status === 'pending');
    }, [expenses]);

    // Print Financial Report
    const handlePrintReport = () => {
        const branchName = selectedBranch !== 'all' 
            ? branches.find(b => b.id === selectedBranch)?.name || 'Branch' 
            : 'All Branches';
        const dateStr = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

        const rows = filteredExpenses.map((e, idx) => `
            <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>${e.expense_date || '-'}</td>
                <td><strong>${e.branches?.name || '-'}</strong></td>
                <td>${e.title}</td>
                <td>${e.category}</td>
                <td>${e.payment_method}</td>
                <td>${e.created_user?.full_name || '-'}</td>
                <td style="text-transform:uppercase; font-weight:bold; color: ${e.status === 'approved' ? '#059669' : e.status === 'pending' ? '#d97706' : '#dc2626'}">${e.status}</td>
                <td style="text-align:right; font-family:monospace; font-weight:bold;">PKR ${Number(e.amount || 0).toLocaleString()}</td>
            </tr>
        `).join('');

        const html = `<!DOCTYPE html>
<html>
<head>
    <title>Expenses Report - ${branchName}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
        h1 { margin-bottom: 2px; text-align: center; font-size: 20px; }
        .sub { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
        th { background: #f1f5f9; text-align: left; }
        .footer { margin-top: 20px; text-align: right; font-size: 14px; font-weight: bold; }
        @media print { @page { margin: 10mm; size: landscape; } }
    </style>
</head>
<body>
    <h1>${user?.school?.name || 'School Management'} - Financial Expenses</h1>
    <div class="sub">Campus: ${branchName} | Generated: ${dateStr}</div>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Date</th>
                <th>Branch</th>
                <th>Expense Title</th>
                <th>Category</th>
                <th>Method</th>
                <th>Added By</th>
                <th>Status</th>
                <th style="text-align:right;">Amount (PKR)</th>
            </tr>
        </thead>
        <tbody>
            ${rows || '<tr><td colspan="9" style="text-align:center;">No expenses found.</td></tr>'}
        </tbody>
    </table>
    <div class="footer">Total Approved: PKR ${summary.totalApproved.toLocaleString()}</div>
    <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
        } else {
            alert('Please allow popups to print report.');
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                        <DollarSign className="text-emerald-600 w-7 h-7 p-1 bg-emerald-50 rounded-xl" />
                        Expenses Management & Approvals
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Review school operational expenses, approve pending accountant requests, and record payments
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrintReport}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-sm hover:shadow transition-all"
                    >
                        <Printer size={15} /> Print Report
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                        <Plus size={16} /> Record Expense
                    </button>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Pending Approvals */}
                <div className={`p-5 rounded-2xl border transition-all ${
                    summary.pendingCount > 0 
                        ? 'bg-amber-50/70 border-amber-200 shadow-sm ring-2 ring-amber-400/30' 
                        : 'bg-white border-slate-200/90 shadow-sm'
                }`}>
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending Approvals</p>
                        <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                            {summary.pendingCount}
                        </span>
                    </div>
                    <p className="text-2xl font-black font-mono text-amber-700 tracking-tight">
                        PKR {summary.totalPending.toLocaleString()}
                    </p>
                    <p className="text-xs text-amber-600 mt-1 font-medium">
                        {summary.pendingCount} request{summary.pendingCount === 1 ? '' : 's'} awaiting your review
                    </p>
                </div>

                {/* 2. Total Approved */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Approved</p>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
                        PKR {summary.totalApproved.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {summary.approvedCount} verified expense transactions
                    </p>
                </div>

                {/* 3. This Month Approved */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">This Month</p>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Calendar size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-black font-mono text-slate-800 tracking-tight">
                        PKR {summary.thisMonthApproved.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Approved in current month
                    </p>
                </div>

                {/* 4. Active Branches */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Branches</p>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Building2 size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-black font-mono text-slate-800 tracking-tight">
                        {branches.length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Operating School Campuses
                    </p>
                </div>
            </div>

            {/* Pending Approvals Quick Banner (if any) */}
            {pendingExpenses.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-5 shadow-sm space-y-3 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="text-amber-600 w-5 h-5" />
                            <h3 className="font-bold text-amber-900 text-base">
                                Pending Expense Requests ({pendingExpenses.length})
                            </h3>
                        </div>
                        <span className="text-xs text-amber-700 font-semibold">
                            Total: PKR {summary.totalPending.toLocaleString()}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pendingExpenses.slice(0, 6).map(item => (
                            <div key={item.id} className="bg-white border border-amber-200/80 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                                            {item.branches?.name || 'Campus'}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">{item.expense_date}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm mt-1.5 line-clamp-1">{item.title}</h4>
                                    <p className="text-xs text-slate-500">{item.category}</p>
                                    {item.description && (
                                        <p className="text-xs text-slate-600 italic mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                            "{item.description}"
                                        </p>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-medium">Amount</p>
                                        <p className="text-base font-black font-mono text-emerald-600">
                                            PKR {Number(item.amount).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => setRejectModalExpense(item)}
                                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                            title="Reject request"
                                        >
                                            <X size={14} /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprove(item.id)}
                                            disabled={actionLoading}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                            title="Approve request"
                                        >
                                            <Check size={14} /> Approve
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
                        {[
                            { id: 'all', label: 'All Expenses' },
                            { id: 'pending', label: `Pending (${summary.pendingCount})` },
                            { id: 'approved', label: 'Approved' },
                            { id: 'rejected', label: 'Rejected' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setStatusFilter(tab.id)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    statusFilter === tab.id
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={fetchExpenses}
                        title="Refresh expenses"
                        className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-sm"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                    {/* Branch Filter */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Campus / Branch</label>
                        <select
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={selectedBranch}
                            onChange={e => setSelectedBranch(e.target.value)}
                        >
                            <option value="all">All Branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Category</label>
                        <select
                            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {EXPENSE_CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* From Date */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">From Date</label>
                        <input
                            type="date"
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                        />
                    </div>

                    {/* Search */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Search Details</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                            <input
                                type="text"
                                placeholder="Search title, ref, person..."
                                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expenses List Table */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-slate-600" />
                        <h2 className="font-bold text-slate-800 text-base">Expense Records</h2>
                        <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                            {filteredExpenses.length}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading expense records...
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <DollarSign className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        <p className="font-bold text-slate-700">No expenses found</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or click "Record Expense" to add one.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Branch</th>
                                    <th className="p-4">Expense Title</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Payment Mode</th>
                                    <th className="p-4">Added By</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredExpenses.map(e => (
                                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="p-4 text-slate-500 font-mono">{e.expense_date}</td>
                                        <td className="p-4 font-semibold text-slate-800">
                                            <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium text-[11px]">
                                                {e.branches?.name || 'Main Campus'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-slate-900 text-sm">{e.title}</p>
                                            {e.description && (
                                                <p className="text-[11px] text-slate-500 truncate max-w-xs">{e.description}</p>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-600">{e.category}</td>
                                        <td className="p-4">
                                            <span className="capitalize font-medium text-slate-700">{e.payment_method}</span>
                                            {e.reference_number && (
                                                <span className="block text-[10px] text-slate-400 font-mono">Ref: {e.reference_number}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className="font-semibold text-slate-800">{e.created_user?.full_name || 'Staff'}</span>
                                            <span className="block text-[10px] text-slate-400 capitalize">{e.created_user?.role || 'accountant'}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {e.status === 'approved' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <Check size={12} /> APPROVED
                                                </span>
                                            )}
                                            {e.status === 'pending' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    <Clock size={12} /> PENDING
                                                </span>
                                            )}
                                            {e.status === 'rejected' && (
                                                <span 
                                                    title={e.rejection_reason || 'Rejected by CEO'}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
                                                >
                                                    <X size={12} /> REJECTED
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-black font-mono text-slate-900 text-sm">
                                            PKR {Number(e.amount || 0).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            {e.status === 'pending' ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleApprove(e.id)}
                                                        className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
                                                        title="Approve"
                                                    >
                                                        <Check size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectModalExpense(e)}
                                                        className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg transition-colors"
                                                        title="Reject"
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-[11px] font-medium">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                                <tr>
                                    <td colSpan={7} className="p-4 text-right text-slate-700">Total Filtered Amount:</td>
                                    <td className="p-4 text-right font-mono text-emerald-700 text-base">
                                        PKR {filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0).toLocaleString()}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Direct Add Expense Modal (CEO) */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                            <div className="flex items-center gap-2">
                                <Plus className="text-blue-600" size={20} />
                                <h3 className="font-bold text-slate-800 text-base">Record School Expense</h3>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAddExpense} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {formError && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Campus / Branch <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={newExpenseForm.branch_id}
                                    onChange={e => setNewExpenseForm(f => ({ ...f, branch_id: e.target.value }))}
                                    required
                                >
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. August Electricity Bill, Science Lab Equipment"
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={newExpenseForm.title}
                                    onChange={e => setNewExpenseForm(f => ({ ...f, title: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                                    <select
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={newExpenseForm.category}
                                        onChange={e => setNewExpenseForm(f => ({ ...f, category: e.target.value }))}
                                    >
                                        {EXPENSE_CATEGORIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount (PKR) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="0"
                                        className="w-full text-sm font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={newExpenseForm.amount}
                                        onChange={e => setNewExpenseForm(f => ({ ...f, amount: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Expense Date</label>
                                    <input
                                        type="date"
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={newExpenseForm.expense_date}
                                        onChange={e => setNewExpenseForm(f => ({ ...f, expense_date: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                                    <select
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={newExpenseForm.payment_method}
                                        onChange={e => setNewExpenseForm(f => ({ ...f, payment_method: e.target.value }))}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="online">Online</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Receipt / Cheque / Trx #</label>
                                <input
                                    type="text"
                                    placeholder="Optional reference number"
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={newExpenseForm.reference_number}
                                    onChange={e => setNewExpenseForm(f => ({ ...f, reference_number: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                                <textarea
                                    rows="2"
                                    placeholder="Additional notes about this expenditure..."
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={newExpenseForm.description}
                                    onChange={e => setNewExpenseForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                                >
                                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Save & Approve
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {rejectModalExpense && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 text-rose-600">
                                <XCircle size={28} />
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base">Reject Expense Request</h3>
                                    <p className="text-xs text-slate-500 font-medium">"{rejectModalExpense.title}" (PKR {Number(rejectModalExpense.amount).toLocaleString()})</p>
                                </div>
                            </div>

                            <form onSubmit={handleRejectSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Please provide a reason so the accountant understands..."
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                        value={rejectionReason}
                                        onChange={e => setRejectionReason(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setRejectModalExpense(null)}
                                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                                    >
                                        {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        Confirm Rejection
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
