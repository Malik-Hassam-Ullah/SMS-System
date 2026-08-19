import React, { useState, useEffect, useMemo } from 'react';
import { 
    DollarSign, Plus, CheckCircle2, XCircle, Clock, Filter, 
    Search, Calendar, RefreshCw, FileText, ChevronRight, Loader2,
    AlertCircle, Edit2, Trash2, Tag, Receipt
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

export default function AccountantExpensesPage() {
    const { user } = useAuthStore();
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({
        totalApproved: 0,
        totalPending: 0,
        totalRejected: 0,
        pendingCount: 0,
        approvedCount: 0
    });
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Add / Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const [form, setForm] = useState({
        title: '',
        category: 'Utilities (Electricity, Water, Gas)',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        reference_number: '',
        description: ''
    });

    useEffect(() => {
        fetchExpenses();
    }, [statusFilter, categoryFilter]);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const params = {
                status: statusFilter !== 'all' ? statusFilter : undefined,
                category: categoryFilter !== 'all' ? categoryFilter : undefined,
                search: searchQuery || undefined,
                limit: 100
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

    const openCreateModal = () => {
        setEditingExpense(null);
        setForm({
            title: '',
            category: 'Utilities (Electricity, Water, Gas)',
            amount: '',
            expense_date: new Date().toISOString().split('T')[0],
            payment_method: 'cash',
            reference_number: '',
            description: ''
        });
        setFormError('');
        setShowModal(true);
    };

    const openEditModal = (expense) => {
        setEditingExpense(expense);
        setForm({
            title: expense.title || '',
            category: expense.category || 'Utilities (Electricity, Water, Gas)',
            amount: String(expense.amount || ''),
            expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
            payment_method: expense.payment_method || 'cash',
            reference_number: expense.reference_number || '',
            description: expense.description || ''
        });
        setFormError('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            return setFormError('Expense title is required');
        }
        if (!form.amount || Number(form.amount) <= 0) {
            return setFormError('Please enter a valid amount');
        }

        setSubmitting(true);
        setFormError('');
        try {
            if (editingExpense) {
                await api.put(`/expenses/${editingExpense.id}`, form);
            } else {
                await api.post('/expenses', form);
            }
            setShowModal(false);
            fetchExpenses();
        } catch (err) {
            setFormError(err?.response?.data?.message || 'Failed to save expense');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this pending expense?')) return;
        try {
            await api.delete(`/expenses/${id}`);
            fetchExpenses();
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to delete expense');
        }
    };

    const filteredExpenses = useMemo(() => {
        if (!searchQuery.trim()) return expenses;
        const q = searchQuery.toLowerCase();
        return expenses.filter(e => 
            e.title?.toLowerCase().includes(q) ||
            e.category?.toLowerCase().includes(q) ||
            e.reference_number?.toLowerCase().includes(q) ||
            e.description?.toLowerCase().includes(q)
        );
    }, [expenses, searchQuery]);

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
                        <Receipt className="text-blue-600 w-7 h-7 p-1 bg-blue-50 rounded-xl" />
                        School Expenses
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Record branch expenditures and track approval status from the CEO
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchExpenses}
                        title="Refresh expenses"
                        className="p-2.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-all shadow-sm"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                        <Plus size={16} /> Record New Expense
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* 1. Pending Approval */}
                <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending CEO Approval</p>
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                            {summary.pendingCount}
                        </div>
                    </div>
                    <p className="text-2xl font-black font-mono text-amber-800 tracking-tight">
                        PKR {summary.totalPending.toLocaleString()}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                        {summary.pendingCount} expense{summary.pendingCount === 1 ? '' : 's'} awaiting review
                    </p>
                </div>

                {/* 2. Approved */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved by CEO</p>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
                        PKR {summary.totalApproved.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {summary.approvedCount} approved expenditures
                    </p>
                </div>

                {/* 3. Rejected */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Rejected Requests</p>
                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <XCircle size={18} />
                        </div>
                    </div>
                    <p className="text-2xl font-black font-mono text-rose-600 tracking-tight">
                        PKR {summary.totalRejected.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Review notes & re-submit if needed
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3">
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

                    <div className="flex items-center gap-3">
                        {/* Category Dropdown */}
                        <select
                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {EXPENSE_CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search expenses..."
                                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48"
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
                        <h2 className="font-bold text-slate-800 text-base">Expense Log</h2>
                        <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                            {filteredExpenses.length}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Loading expenses...
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <DollarSign className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        <p className="font-bold text-slate-700">No expenses recorded</p>
                        <p className="text-xs text-slate-400 mt-1">Click "Record New Expense" above to add an expense.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Expense Title</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Payment Method</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredExpenses.map(e => (
                                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="p-4 text-slate-500 font-mono">{e.expense_date}</td>
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
                                        <td className="p-4 text-center">
                                            {e.status === 'approved' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle2 size={12} /> APPROVED
                                                </span>
                                            )}
                                            {e.status === 'pending' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    <Clock size={12} /> AWAITING CEO
                                                </span>
                                            )}
                                            {e.status === 'rejected' && (
                                                <div>
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <XCircle size={12} /> REJECTED
                                                    </span>
                                                    {e.rejection_reason && (
                                                        <p className="text-[10px] text-rose-600 mt-1 max-w-xs">
                                                            Reason: {e.rejection_reason}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right font-black font-mono text-slate-900 text-sm">
                                            PKR {Number(e.amount || 0).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            {e.status === 'pending' ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => openEditModal(e)}
                                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit expense"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(e.id)}
                                                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Delete expense"
                                                    >
                                                        <Trash2 size={14} />
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
                                    <td colSpan={5} className="p-4 text-right text-slate-700">Total:</td>
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

            {/* Record / Edit Expense Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                            <div className="flex items-center gap-2">
                                <Plus className="text-blue-600" size={20} />
                                <h3 className="font-bold text-slate-800 text-base">
                                    {editingExpense ? 'Edit Expense Details' : 'Record School Expense'}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-center gap-2 font-medium">
                                <Clock size={16} className="shrink-0 text-blue-600" />
                                <span>This expense will be submitted to the CEO for review and approval.</span>
                            </div>

                            {formError && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. Science Lab Supplies, Repair of Classroom Door"
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                                    <select
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={form.category}
                                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
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
                                        value={form.amount}
                                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
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
                                        value={form.expense_date}
                                        onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                                    <select
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={form.payment_method}
                                        onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="online">Online</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Receipt / Voucher / Bill #</label>
                                <input
                                    type="text"
                                    placeholder="Optional reference number"
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={form.reference_number}
                                    onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                                <textarea
                                    rows="2"
                                    placeholder="Add details about vendor, purpose, or reason for expense..."
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                                >
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Submit for Approval
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
