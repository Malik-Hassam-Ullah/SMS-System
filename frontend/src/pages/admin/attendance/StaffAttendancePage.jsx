import React, { useState, useEffect, useCallback } from 'react';
import {
    UserCheck, Calendar, Save, Loader2, CheckCircle2, XCircle,
    Clock, AlertCircle, Users, Filter, BarChart2, RefreshCw
} from 'lucide-react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
    { value: 'present', label: 'Present', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
    { value: 'absent', label: 'Absent', color: 'bg-rose-100 text-rose-700 border-rose-300', dot: 'bg-rose-500' },
    { value: 'late', label: 'Late', color: 'bg-amber-100 text-amber-700 border-amber-300', dot: 'bg-amber-500' },
    { value: 'leave', label: 'Leave', color: 'bg-blue-100 text-blue-700 border-blue-300', dot: 'bg-blue-500' },
];

const ROLE_LABELS = {
    teacher: 'Teacher',
    admin: 'Admin',
    accountant: 'Accountant',
};

const ROLE_COLORS = {
    teacher: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    accountant: 'bg-orange-100 text-orange-700',
};

export default function StaffAttendancePage() {
    const [tab, setTab] = useState('mark'); // 'mark' | 'report'
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [staff, setStaff] = useState([]);
    const [attendance, setAttendance] = useState({}); // { staff_id: { status, check_in, check_out, remarks } }
    const [existingRecords, setExistingRecords] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Report state
    const [reportFrom, setReportFrom] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [reportTo, setReportTo] = useState(new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);

    // Load staff list once
    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const res = await api.get('/staff-attendance/staff');
                setStaff(res.data || []);
            } catch (err) {
                console.error(err);
                toast.error('Failed to load staff list');
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, []);

    // Load existing attendance when date changes
    const loadAttendanceForDate = useCallback(async () => {
        if (!date) return;
        try {
            const res = await api.get('/staff-attendance', { params: { date } });
            const records = {};
            (res.data || []).forEach(r => {
                records[r.staff_id] = {
                    status: r.status,
                    check_in: r.check_in || '',
                    check_out: r.check_out || '',
                    remarks: r.remarks || '',
                };
            });
            setExistingRecords(records);
            // Pre-fill attendance state with existing data (default to present for new staff)
            setAttendance(prev => {
                const updated = { ...prev };
                staff.forEach(s => {
                    if (records[s.id]) {
                        updated[s.id] = { ...records[s.id] };
                    } else if (!updated[s.id]) {
                        updated[s.id] = { status: 'present', check_in: '', check_out: '', remarks: '' };
                    }
                });
                return updated;
            });
            setSaved(false);
        } catch (err) {
            console.error(err);
        }
    }, [date, staff]);

    useEffect(() => {
        if (staff.length > 0) {
            // Initialize attendance default
            const init = {};
            staff.forEach(s => {
                init[s.id] = { status: 'present', check_in: '', check_out: '', remarks: '' };
            });
            setAttendance(init);
            loadAttendanceForDate();
        }
    }, [staff, date]);

    const updateField = (staffId, field, value) => {
        setAttendance(prev => ({
            ...prev,
            [staffId]: { ...prev[staffId], [field]: value },
        }));
        setSaved(false);
    };

    const setAllStatus = (status) => {
        setAttendance(prev => {
            const updated = {};
            Object.keys(prev).forEach(id => {
                updated[id] = { ...prev[id], status };
            });
            return updated;
        });
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const records = staff.map(s => ({
                staff_id: s.id,
                status: attendance[s.id]?.status || 'present',
                check_in: attendance[s.id]?.check_in || null,
                check_out: attendance[s.id]?.check_out || null,
                remarks: attendance[s.id]?.remarks || null,
            }));
            await api.post('/staff-attendance/bulk', { records, date });
            toast.success(`Attendance saved for ${records.length} staff members!`);
            setSaved(true);
            loadAttendanceForDate();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.response?.data || 'Failed to save attendance';
            toast.error(typeof msg === 'string' ? msg : 'Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };

    const loadReport = async () => {
        setReportLoading(true);
        try {
            const res = await api.get('/staff-attendance/report', {
                params: { from_date: reportFrom, to_date: reportTo },
            });
            setReportData(res.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load report');
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'report') loadReport();
    }, [tab]);

    const summary = {
        present: Object.values(attendance).filter(a => a?.status === 'present').length,
        absent: Object.values(attendance).filter(a => a?.status === 'absent').length,
        late: Object.values(attendance).filter(a => a?.status === 'late').length,
        leave: Object.values(attendance).filter(a => a?.status === 'leave').length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <UserCheck className="w-7 h-7 text-primary-600" />
                        Staff Attendance
                    </h1>
                    <p className="text-slate-500 mt-1">Mark and manage daily attendance for all staff members.</p>
                </div>
                {/* Tab Toggle */}
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setTab('mark')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'mark' ? 'bg-white shadow text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><Users size={16} /> Mark Attendance</span>
                    </button>
                    <button
                        onClick={() => setTab('report')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'report' ? 'bg-white shadow text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><BarChart2 size={16} /> Report</span>
                    </button>
                </div>
            </div>

            {/* ── MARK ATTENDANCE TAB ── */}
            {tab === 'mark' && (
                <>
                    {/* Controls */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                <Calendar size={14} className="inline mr-1" /> Date
                            </label>
                            <input
                                type="date"
                                className="input w-48"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-600 self-end mb-1">Mark All:</span>
                            {STATUS_OPTIONS.map(s => (
                                <button
                                    key={s.value}
                                    onClick={() => setAllStatus(s.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${s.color}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={loadAttendanceForDate}
                            className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Present', count: summary.present, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" /> },
                            { label: 'Absent', count: summary.absent, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: <XCircle className="w-5 h-5 text-rose-500" /> },
                            { label: 'Late', count: summary.late, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Clock className="w-5 h-5 text-amber-500" /> },
                            { label: 'Leave', count: summary.leave, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <AlertCircle className="w-5 h-5 text-blue-500" /> },
                        ].map(stat => (
                            <div key={stat.label} className={`rounded-xl border ${stat.border} ${stat.bg} p-4 flex items-center gap-3`}>
                                {stat.icon}
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
                                    <p className={`text-2xl font-bold ${stat.text}`}>{stat.count}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Attendance Table */}
                    {staff.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p className="font-semibold text-slate-500">No staff members found.</p>
                            <p className="text-sm mt-1">Add teachers or staff from the Teachers section.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="p-3 text-left font-semibold text-slate-600">#</th>
                                            <th className="p-3 text-left font-semibold text-slate-600">Staff Member</th>
                                            <th className="p-3 text-left font-semibold text-slate-600">Role</th>
                                            <th className="p-3 text-center font-semibold text-slate-600">Status</th>
                                            <th className="p-3 text-left font-semibold text-slate-600">Check In</th>
                                            <th className="p-3 text-left font-semibold text-slate-600">Check Out</th>
                                            <th className="p-3 text-left font-semibold text-slate-600">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {staff.map((member, idx) => {
                                            const rec = attendance[member.id] || { status: 'present', check_in: '', check_out: '', remarks: '' };
                                            const statusOpt = STATUS_OPTIONS.find(s => s.value === rec.status) || STATUS_OPTIONS[0];
                                            const isExisting = !!existingRecords[member.id];
                                            return (
                                                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 text-slate-400 font-medium">{idx + 1}</td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                                {member.full_name?.charAt(0)?.toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-800">{member.full_name}</p>
                                                                {member.employee_code && (
                                                                    <p className="text-xs text-slate-400">{member.employee_code}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${ROLE_COLORS[member.role] || 'bg-slate-100 text-slate-700'}`}>
                                                            {ROLE_LABELS[member.role] || member.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex gap-1 justify-center flex-wrap">
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <button
                                                                    key={opt.value}
                                                                    onClick={() => updateField(member.id, 'status', opt.value)}
                                                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${rec.status === opt.value
                                                                            ? opt.color + ' ring-2 ring-offset-1 ring-current'
                                                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                                                                        }`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="time"
                                                            className="input w-32 text-xs py-1.5"
                                                            value={rec.check_in}
                                                            onChange={e => updateField(member.id, 'check_in', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="time"
                                                            className="input w-32 text-xs py-1.5"
                                                            value={rec.check_out}
                                                            onChange={e => updateField(member.id, 'check_out', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            className="input w-40 text-xs py-1.5"
                                                            placeholder="Optional note..."
                                                            value={rec.remarks}
                                                            onChange={e => updateField(member.id, 'remarks', e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <p className="text-sm text-slate-500">
                                    {staff.length} staff members • {date}
                                </p>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="btn-primary flex items-center gap-2 px-6 py-2.5"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : saved ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Attendance'}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── REPORT TAB ── */}
            {tab === 'report' && (
                <>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                            <input type="date" className="input w-44" value={reportFrom} onChange={e => setReportFrom(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                            <input type="date" className="input w-44" value={reportTo} onChange={e => setReportTo(e.target.value)} />
                        </div>
                        <button
                            onClick={loadReport}
                            disabled={reportLoading}
                            className="btn-primary flex items-center gap-2"
                        >
                            {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter size={16} />}
                            Generate Report
                        </button>
                    </div>

                    {reportLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                        </div>
                    ) : reportData.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                            <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p className="font-semibold text-slate-500">No report data found.</p>
                            <p className="text-sm mt-1">Select a date range and click Generate Report.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="font-bold text-slate-800">Attendance Summary</h2>
                                <span className="text-sm text-slate-500">{reportFrom} — {reportTo}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="p-3 text-left font-semibold text-slate-600">Staff Member</th>
                                            <th className="p-3 text-left font-semibold text-slate-600">Role</th>
                                            <th className="p-3 text-center font-semibold text-slate-600">Total Days</th>
                                            <th className="p-3 text-center font-semibold text-emerald-600">Present</th>
                                            <th className="p-3 text-center font-semibold text-rose-600">Absent</th>
                                            <th className="p-3 text-center font-semibold text-amber-600">Late</th>
                                            <th className="p-3 text-center font-semibold text-blue-600">Leave</th>
                                            <th className="p-3 text-center font-semibold text-slate-600">%</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportData.sort((a, b) => b.percentage - a.percentage).map(row => (
                                            <tr key={row.staff?.id} className="hover:bg-slate-50">
                                                <td className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                            {row.staff?.full_name?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800">{row.staff?.full_name}</p>
                                                            {row.staff?.employee_code && <p className="text-xs text-slate-400">{row.staff?.employee_code}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${ROLE_COLORS[row.staff?.role] || 'bg-slate-100 text-slate-700'}`}>
                                                        {ROLE_LABELS[row.staff?.role] || row.staff?.role}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center font-semibold text-slate-700">{row.total}</td>
                                                <td className="p-3 text-center font-bold text-emerald-600">{row.present}</td>
                                                <td className="p-3 text-center font-bold text-rose-600">{row.absent}</td>
                                                <td className="p-3 text-center font-bold text-amber-600">{row.late}</td>
                                                <td className="p-3 text-center font-bold text-blue-600">{row.leave}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`font-bold px-2 py-1 rounded-full text-xs ${Number(row.percentage) >= 80 ? 'bg-emerald-100 text-emerald-700'
                                                            : Number(row.percentage) >= 60 ? 'bg-amber-100 text-amber-700'
                                                                : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                        {row.percentage}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
