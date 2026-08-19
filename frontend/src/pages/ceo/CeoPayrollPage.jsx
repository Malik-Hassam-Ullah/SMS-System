import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IndianRupee, Search, Filter, Loader2, CheckCircle2,
    AlertCircle, Printer, Edit2, X, Users, Building2,
    ArrowRight, DollarSign, TrendingUp, Calendar as CalendarIcon
} from 'lucide-react';
import { getBranches, getUsers } from '../../api';
import api from '@/lib/api';

const COLORS = ['#6366f1', '#d946ef', '#10b981', '#f59e0b', '#3b82f6'];

// Helper to convert month name to date range
const getMonthDateRange = (monthStr) => {
    const parts = monthStr.split(' ');
    const monthName = parts[0];
    const year = parts[1];

    const monthMap = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    const monthNum = monthMap[monthName] || '09';
    const fromDate = `${year}-${monthNum}-01`;

    const lastDay = new Date(Number(year), Number(monthNum), 0).getDate();
    const toDate = `${year}-${monthNum}-${lastDay}`;

    return { fromDate, toDate };
};

export default function CeoPayrollPage() {
    const navigate = useNavigate();
    const [teachers, setTeachers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('September 2026');
    const [attendanceReports, setAttendanceReports] = useState({});

    // Modal States
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedPayroll, setSelectedPayroll] = useState(null);
    const [allowanceInput, setAllowanceInput] = useState('');
    const [deductionInput, setDeductionInput] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

    const [showBaseSalaryModal, setShowBaseSalaryModal] = useState(false);
    const [baseSalaryInput, setBaseSalaryInput] = useState('');

    const [showSlipModal, setShowSlipModal] = useState(false);
    const [slipPayroll, setSlipPayroll] = useState(null);
    const [slipTeacher, setSlipTeacher] = useState(null);

    // Load Teachers and Branches
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [branchesData, usersData] = await Promise.all([
                    getBranches(),
                    getUsers()
                ]);
                setBranches(branchesData || []);

                const teacherUsers = (usersData || []).filter(u => u.role === 'teacher');

                const enhancedTeachers = teacherUsers.map(t => {
                    let base = localStorage.getItem(`teacher_base_salary_${t.id}`);
                    if (!base) {
                        base = '45000';
                        localStorage.setItem(`teacher_base_salary_${t.id}`, '45000');
                    }

                    let payrolls = localStorage.getItem(`teacher_payrolls_${t.id}`);
                    if (!payrolls) {
                        payrolls = [
                            {
                                month: 'August 2026',
                                baseSalary: Number(base),
                                allowances: 5000,
                                deductions: 2000,
                                netSalary: Number(base) + 5000 - 2000,
                                status: 'paid',
                                paymentMethod: 'Bank Transfer',
                                paymentDate: '2026-08-05'
                            },
                            {
                                month: 'July 2026',
                                baseSalary: Number(base),
                                allowances: 3000,
                                deductions: 1000,
                                netSalary: Number(base) + 3000 - 1000,
                                status: 'paid',
                                paymentMethod: 'Cash',
                                paymentDate: '2026-07-02'
                            },
                            {
                                month: 'September 2026',
                                baseSalary: Number(base),
                                allowances: 0,
                                deductions: 0,
                                netSalary: Number(base),
                                status: 'pending',
                                paymentMethod: '',
                                paymentDate: ''
                            }
                        ];
                        localStorage.setItem(`teacher_payrolls_${t.id}`, JSON.stringify(payrolls));
                    } else {
                        payrolls = JSON.parse(payrolls);
                    }

                    return {
                        ...t,
                        baseSalary: Number(base),
                        payrolls
                    };
                });

                setTeachers(enhancedTeachers);
            } catch (err) {
                console.error('Failed to load payroll directory:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Fetch Attendance Reports for the selected month
    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const { fromDate, toDate } = getMonthDateRange(selectedMonth);
                const branchesToFetch = branchFilter ? [branchFilter] : branches.map(b => b.id);
                const reports = {};

                await Promise.all(branchesToFetch.map(async (bId) => {
                    try {
                        const res = await api.get('/staff-attendance/report', {
                            params: { from_date: fromDate, to_date: toDate, branch_id: bId }
                        });
                        if (res.data?.success && res.data?.data) {
                            res.data.data.forEach(item => {
                                reports[item.staff.id] = {
                                    present: item.present,
                                    absent: item.absent,
                                    late: item.late,
                                    leave: item.leave,
                                    total: item.total,
                                    percentage: item.percentage
                                };
                            });
                        }
                    } catch (e) {
                        console.error(`Failed to fetch attendance report for branch ${bId}:`, e);
                    }
                }));

                setAttendanceReports(reports);
            } catch (err) {
                console.error('Failed to fetch attendance reports:', err);
            }
        };

        if (branches.length > 0) {
            fetchAttendance();
        }
    }, [selectedMonth, branchFilter, branches]);

    const filteredTeachers = teachers.filter(t => {
        const matchesSearch =
            t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.employee_code && t.employee_code.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesBranch = !branchFilter || t.branch_id === branchFilter;

        const monthPayroll = t.payrolls.find(p => p.month === selectedMonth);
        const matchesStatus = !statusFilter || (monthPayroll && monthPayroll.status === statusFilter);

        return matchesSearch && matchesBranch && matchesStatus;
    });

    const getStats = () => {
        let totalPayroll = 0;
        let paidCount = 0;
        let paidAmount = 0;
        let pendingCount = 0;
        let pendingAmount = 0;

        teachers.forEach(t => {
            const p = t.payrolls.find(pay => pay.month === selectedMonth);
            if (p) {
                totalPayroll += p.baseSalary;
                if (p.status === 'paid') {
                    paidCount++;
                    paidAmount += p.netSalary;
                } else {
                    pendingCount++;
                    pendingAmount += p.netSalary;
                }
            }
        });

        return { totalPayroll, paidCount, paidAmount, pendingCount, pendingAmount };
    };

    const stats = getStats();

    const handleUpdateBaseSalary = (e) => {
        e.preventDefault();
        const newBase = Number(baseSalaryInput);
        if (isNaN(newBase) || newBase <= 0) return;

        const updatedTeachers = teachers.map(t => {
            if (t.id === selectedTeacher.id) {
                localStorage.setItem(`teacher_base_salary_${t.id}`, newBase.toString());

                const updatedPayrolls = t.payrolls.map(p => {
                    if (p.status === 'pending') {
                        return {
                            ...p,
                            baseSalary: newBase,
                            netSalary: newBase + p.allowances - p.deductions
                        };
                    }
                    return p;
                });
                localStorage.setItem(`teacher_payrolls_${t.id}`, JSON.stringify(updatedPayrolls));

                return {
                    ...t,
                    baseSalary: newBase,
                    payrolls: updatedPayrolls
                };
            }
            return t;
        });

        setTeachers(updatedTeachers);
        setShowBaseSalaryModal(false);
    };

    const handlePaySalary = (e) => {
        e.preventDefault();
        const allowances = Number(allowanceInput) || 0;
        const deductions = Number(deductionInput) || 0;
        const netSalary = selectedPayroll.baseSalary + allowances - deductions;

        const updatedTeachers = teachers.map(t => {
            if (t.id === selectedTeacher.id) {
                const updatedPayrolls = t.payrolls.map(p => {
                    if (p.month === selectedPayroll.month) {
                        return {
                            ...p,
                            allowances,
                            deductions,
                            netSalary,
                            status: 'paid',
                            paymentMethod,
                            paymentDate: new Date().toISOString().split('T')[0]
                        };
                    }
                    return p;
                });
                localStorage.setItem(`teacher_payrolls_${t.id}`, JSON.stringify(updatedPayrolls));

                return {
                    ...t,
                    payrolls: updatedPayrolls
                };
            }
            return t;
        });

        setTeachers(updatedTeachers);
        setShowPayModal(false);
        setAllowanceInput('');
        setDeductionInput('');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                <p className="text-sm text-slate-500 font-medium">Loading Payroll Directory...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Teachers Payroll & Salaries</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage base salaries, pay monthly salaries, and print slips for all teachers.</p>
                </div>

                {/* Month Selector */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <label className="text-xs font-bold text-slate-500 pl-2 uppercase tracking-wider">Payroll Month:</label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="input py-1.5 text-xs w-44 border-slate-200 shadow-none bg-slate-50 cursor-pointer font-bold text-slate-700"
                    >
                        <option value="September 2026">September 2026</option>
                        <option value="August 2026">August 2026</option>
                        <option value="July 2026">July 2026</option>
                    </select>
                </div>
            </div>

            {/* Summary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Stat 1: Total Base Payroll */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Base Payroll</p>
                        <h3 className="text-2xl font-black text-slate-900">PKR {stats.totalPayroll.toLocaleString()}</h3>
                        <p className="text-xs text-slate-400">Sum of all base salaries</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>

                {/* Stat 2: Paid Salaries */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Paid Salaries</p>
                        <h3 className="text-2xl font-black text-emerald-600">PKR {stats.paidAmount.toLocaleString()}</h3>
                        <p className="text-xs text-emerald-600 font-semibold">{stats.paidCount} of {teachers.length} Teachers Paid</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                {/* Stat 3: Pending Salaries */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pending Salaries</p>
                        <h3 className="text-2xl font-black text-amber-600">PKR {stats.pendingAmount.toLocaleString()}</h3>
                        <p className="text-xs text-amber-600 font-semibold">{stats.pendingCount} Teachers Awaiting Payment</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                </div>

            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by teacher name or employee code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-colors shadow-sm"
                    />
                </div>
                <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="input bg-white cursor-pointer"
                >
                    <option value="">All Branches</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input bg-white cursor-pointer"
                >
                    <option value="">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                </select>
            </div>

            {/* Payroll Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Teacher Name</th>
                                <th className="px-6 py-4">Branch</th>
                                <th className="px-6 py-4">Attendance ({selectedMonth.split(' ')[0]})</th>
                                <th className="px-6 py-4">Base Salary</th>
                                <th className="px-6 py-4">Allowances</th>
                                <th className="px-6 py-4">Deductions</th>
                                <th className="px-6 py-4">Net Salary</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTeachers.length > 0 ? (
                                filteredTeachers.map((t) => {
                                    const p = t.payrolls.find(pay => pay.month === selectedMonth) || {
                                        baseSalary: t.baseSalary,
                                        allowances: 0,
                                        deductions: 0,
                                        netSalary: t.baseSalary,
                                        status: 'pending'
                                    };
                                    const att = attendanceReports[t.id] || { present: 0, absent: 0, late: 0, leave: 0, percentage: '0.0', total: 0 };
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{t.full_name}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">{t.employee_code || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {t.branches?.name || 'Unassigned'}
                                            </td>
                                            {/* Attendance Column */}
                                            <td className="px-6 py-4">
                                                {att.total > 0 ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold">
                                                            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">P:{att.present}</span>
                                                            <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">A:{att.absent}</span>
                                                            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">L:{att.late}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-semibold">
                                                            Attendance Rate: <span className={Number(att.percentage) >= 80 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{att.percentage}%</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No records marked</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-mono">
                                                PKR {p.baseSalary.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-emerald-600 font-mono">
                                                +PKR {p.allowances.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-rose-600 font-mono">
                                                -PKR {p.deductions.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                                                PKR {p.netSalary.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {p.status === 'paid' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                                        <AlertCircle className="w-3.5 h-3.5" /> Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedTeacher(t);
                                                        setBaseSalaryInput(t.baseSalary.toString());
                                                        setShowBaseSalaryModal(true);
                                                    }}
                                                    title="Adjust Base Salary"
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {p.status === 'paid' ? (
                                                    <button
                                                        onClick={() => {
                                                            setSlipTeacher(t);
                                                            setSlipPayroll(p);
                                                            setShowSlipModal(true);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" /> Slip
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTeacher(t);
                                                            setSelectedPayroll(p);
                                                            setAllowanceInput('');
                                                            setDeductionInput('');
                                                            setShowPayModal(true);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold text-white transition-colors shadow-sm"
                                                    >
                                                        <IndianRupee className="w-3.5 h-3.5" /> Pay
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/ceo/teachers/${t.id}`)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                                                    title="View Profile"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="9" className="text-center py-10 text-slate-400 font-medium">No teachers found matching your filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADJUST BASE SALARY MODAL */}
            {showBaseSalaryModal && selectedTeacher && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-indigo-600" /> Adjust Base Salary - {selectedTeacher.full_name}
                            </h3>
                            <button onClick={() => setShowBaseSalaryModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateBaseSalary}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">New Monthly Base Salary (PKR)</label>
                                    <input
                                        type="number"
                                        required
                                        autoFocus
                                        className="input"
                                        placeholder="e.g. 45000"
                                        value={baseSalaryInput}
                                        onChange={(e) => setBaseSalaryInput(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-500 mt-1.5">This will update the base salary for future and pending payroll cycles.</p>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBaseSalaryModal(false)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PAY SALARY MODAL */}
            {showPayModal && selectedTeacher && selectedPayroll && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <IndianRupee className="w-5 h-5 text-indigo-600" /> Pay Salary - {selectedPayroll.month}
                            </h3>
                            <button onClick={() => setShowPayModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handlePaySalary}>
                            <div className="p-6 space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Teacher:</span>
                                        <span className="font-bold text-slate-800">{selectedTeacher.full_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Base Salary:</span>
                                        <span className="font-bold text-slate-800">PKR {selectedPayroll.baseSalary.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Allowances (PKR)</label>
                                        <input
                                            type="number"
                                            className="input"
                                            placeholder="e.g. 5000"
                                            value={allowanceInput}
                                            onChange={(e) => setAllowanceInput(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Deductions (PKR)</label>
                                        <input
                                            type="number"
                                            className="input"
                                            placeholder="e.g. 1000"
                                            value={deductionInput}
                                            onChange={(e) => setDeductionInput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                                    <select
                                        className="input"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    >
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>

                                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-700">Net Payable:</span>
                                    <span className="text-xl font-black text-indigo-600">
                                        PKR {(selectedPayroll.baseSalary + (Number(allowanceInput) || 0) - (Number(deductionInput) || 0)).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPayModal(false)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    Confirm Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PRINT SLIP MODAL */}
            {showSlipModal && slipPayroll && slipTeacher && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Printer className="w-5 h-5 text-indigo-600" /> Salary Slip Preview
                            </h3>
                            <button onClick={() => setShowSlipModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Printable Area */}
                        <div className="p-8 space-y-6" id="salary-slip-print">
                            <div className="text-center space-y-1 border-b border-slate-200 pb-4">
                                <h2 className="text-xl font-black text-slate-900">THE SMART SCHOOL</h2>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Salary Disbursement Slip</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                                <div>
                                    <p><span className="font-semibold text-slate-500">Employee Name:</span> <span className="font-bold text-slate-800">{slipTeacher.full_name}</span></p>
                                    <p className="mt-1"><span className="font-semibold text-slate-500">Employee ID:</span> <span className="font-mono text-slate-800">{slipTeacher.employee_code}</span></p>
                                    <p className="mt-1"><span className="font-semibold text-slate-500">Department:</span> <span className="text-slate-800">{slipTeacher.qualification || 'General'}</span></p>
                                </div>
                                <div className="text-right">
                                    <p><span className="font-semibold text-slate-500">Salary Month:</span> <span className="font-bold text-slate-800">{slipPayroll.month}</span></p>
                                    <p className="mt-1"><span className="font-semibold text-slate-500">Payment Date:</span> <span className="text-slate-800">{slipPayroll.paymentDate}</span></p>
                                    <p className="mt-1"><span className="font-semibold text-slate-500">Payment Method:</span> <span className="text-slate-800">{slipPayroll.paymentMethod}</span></p>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                                <div className="grid grid-cols-2 bg-slate-50 font-bold text-slate-700 border-b border-slate-200 p-3">
                                    <span>Description</span>
                                    <span className="text-right">Amount (PKR)</span>
                                </div>
                                <div className="p-3 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Base Salary</span>
                                        <span className="font-mono text-slate-800">PKR {slipPayroll.baseSalary.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-600">
                                        <span>Allowances</span>
                                        <span className="font-mono">+PKR {slipPayroll.allowances.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-rose-600">
                                        <span>Deductions</span>
                                        <span className="font-mono">-PKR {slipPayroll.deductions.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 bg-slate-900 text-white font-bold p-3">
                                    <span className="text-sm">Net Disbursed</span>
                                    <span className="text-right text-sm font-mono">PKR {slipPayroll.netSalary.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex justify-between pt-12 text-[10px] text-slate-400">
                                <div className="border-t border-slate-200 w-32 text-center pt-1">Employee Signature</div>
                                <div className="border-t border-slate-200 w-32 text-center pt-1">Authorized Signature</div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowSlipModal(false)}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    const printContent = document.getElementById('salary-slip-print').innerHTML;
                                    const originalContent = document.body.innerHTML;
                                    document.body.innerHTML = printContent;
                                    window.print();
                                    document.body.innerHTML = originalContent;
                                    window.location.reload(); // Reload to restore React state
                                }}
                                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5"
                            >
                                <Printer className="w-4 h-4" /> Print Slip
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
