import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, FileText, Activity, BookOpen, Pencil, Plus, Loader2, AlertCircle, Eye } from 'lucide-react';
import api from '@/api';

const StudentDetailPage = () => {
    const { id } = useParams();
    const [student, setStudent] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);

    // Fee Tab States
    const [vouchers, setVouchers] = useState([]);
    const [outstanding, setOutstanding] = useState(0);
    const [feeStructures, setFeeStructures] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loadingFees, setLoadingFees] = useState(false);

    // Generate Voucher Modal States
    const [showVoucherModal, setShowVoucherModal] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [voucherError, setVoucherError] = useState('');
    const [voucherForm, setVoucherForm] = useState({
        session_id: '',
        fee_month: new Date().toISOString().slice(0, 7),
        due_date: '',
        current_fee: '0',
        other_charges: '0',
        discount: '0',
    });

    const fetchStudent = async () => {
        try {
            const response = await api.get(`/students/${id}`);
            const payload = response?.data ?? response;
            const studentData = payload?.data ?? payload;
            setStudent(studentData || null);
        } catch (error) {
            console.error('Failed to fetch student:', error);
        }
    };

    const fetchFeeData = async () => {
        setLoadingFees(true);
        try {
            const [vouchRes, outRes, structRes, sessRes] = await Promise.all([
                api.get('/fees/vouchers', { params: { student_id: id, limit: 100 } }),
                api.get(`/fees/outstanding/${id}`),
                api.get('/fees/structures'),
                api.get('/sessions'),
            ]);

            setVouchers(vouchRes.data || vouchRes.data?.data || []);
            setOutstanding(outRes.data?.total_outstanding || 0);
            setFeeStructures(structRes.data || []);
            setSessions(sessRes.data || []);

            // Auto-fill defaults for the form
            const activeSession = (sessRes.data || []).find(s => s.status === 'active');
            const classStruct = (structRes.data || []).find(
                s => s.class_id === student?.current_class_id && s.frequency === 'monthly'
            );

            // Set due date to 10th of current month or next month
            const today = new Date();
            const dueDate = new Date(today.getFullYear(), today.getMonth(), 10).toISOString().split('T')[0];

            setVoucherForm(f => ({
                ...f,
                session_id: activeSession?.id || '',
                current_fee: classStruct ? String(classStruct.amount) : '0',
                due_date: dueDate,
            }));
        } catch (err) {
            console.error('Failed to fetch fee data:', err);
        } finally {
            setLoadingFees(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchStudent();
            setLoading(false);
        };
        if (id) init();
    }, [id]);

    useEffect(() => {
        if (activeTab === 'fees' && student) {
            fetchFeeData();
        }
    }, [activeTab, student]);

    const handleGenerateVoucher = async (e) => {
        e.preventDefault();
        setGenerating(true);
        setVoucherError('');
        try {
            await api.post('/fees/vouchers', {
                student_id: id,
                session_id: voucherForm.session_id,
                fee_month: voucherForm.fee_month,
                due_date: voucherForm.due_date,
                current_fee: Number(voucherForm.current_fee),
                other_charges: Number(voucherForm.other_charges || 0),
                discount: Number(voucherForm.discount || 0),
            });
            setShowVoucherModal(false);
            fetchFeeData();
        } catch (err) {
            console.error(err);
            setVoucherError(err.response?.data?.message || 'Failed to generate voucher');
        } finally {
            setGenerating(false);
        }
    };

    const totalPayable = Math.max(
        0,
        Number(voucherForm.current_fee || 0) +
        Number(outstanding || 0) +
        Number(voucherForm.other_charges || 0) -
        Number(voucherForm.discount || 0)
    );

    if (loading) return <div className="p-6 text-slate-500">Loading student details...</div>;
    if (!student) return <div className="p-6 text-red-400">Student not found</div>;

    return (
        <div className="p-6">
            <div className="page-header mb-6 flex items-center gap-4">
                <Link to="/admin/students" className="p-2 text-slate-500 hover: rounded-md hover:bg-white transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold ">Student Details</h1>
                    <p className="text-slate-500">{student.registration_number || 'N/A'} — {student.full_name || 'Unnamed'}</p>
                </div>
                <Link
                    to={`/admin/students/${id}/edit`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <Pencil size={16} />
                    Edit Student
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar/Profile Summary */}
                <div className="md:col-span-1">
                    <div className="bg-white border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-800">{student.full_name}</h2>
                            <p className="text-slate-500 text-sm mt-1">Reg No: <span className="text-blue-600 font-medium">{student.registration_number || '-'}</span></p>
                            <p className="text-slate-500 text-sm">Roll Number: <span className="text-blue-600 font-medium">{student.roll_number || '-'}</span></p>
                            <p className="text-slate-500 text-sm">Voucher No: <span className="text-blue-600 font-medium">{student.voucher_number || '-'}</span></p>
                        </div>

                        <div className="p-0">
                            <div className="flex flex-col divide-y divide-slate-100">
                                <div className="py-3 px-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <span className="text-slate-600 font-medium text-sm">Class</span>
                                    <span className="text-blue-600 text-sm text-right">{student.classes?.name || '-'}</span>
                                </div>
                                <div className="py-3 px-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <span className="text-slate-600 font-medium text-sm">Section</span>
                                    <span className="text-blue-600 text-sm text-right">{student.sections?.name || '-'}</span>
                                </div>
                                <div className="py-3 px-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <span className="text-slate-600 font-medium text-sm">Gender</span>
                                    <span className="text-blue-600 text-sm text-right capitalize">{student.gender || '-'}</span>
                                </div>
                                <div className="py-3 px-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <span className="text-slate-600 font-medium text-sm">Admission In Class</span>
                                    <span className="text-blue-600 text-sm text-right">{student.admission_class || '-'}</span>
                                </div>
                                <div className="py-3 px-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <span className="text-slate-600 font-medium text-sm">Status</span>
                                    <span className={`text-sm text-right font-medium ${student.is_active !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {student.is_active !== false ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="py-3 px-4 flex justify-between items-center hover:bg-slate-50 transition-colors bg-slate-50/50">
                                    <span className="text-slate-600 font-medium text-sm">Total Balance</span>
                                    <span className="font-bold text-rose-600 text-sm text-right">PKR {outstanding.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Tabs */}
                <div className="md:col-span-3">
                    <div className="bg-white border border-slate-200 shadow-sm rounded-sm overflow-hidden">
                        <div className="flex border-b border-slate-200 bg-white overflow-x-auto whitespace-nowrap">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Profile
                            </button>
                            <button
                                onClick={() => setActiveTab('fees')}
                                className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'fees' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Fees
                            </button>
                            <button
                                onClick={() => setActiveTab('marks')}
                                className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'marks' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Exam
                            </button>
                            <button
                                onClick={() => setActiveTab('attendance')}
                                className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'attendance' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Attendance
                            </button>
                        </div>

                        <div className="p-0">
                            {activeTab === 'profile' && (
                                <div className="flex flex-col">
                                    {/* General Details */}
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Admission Date</span>
                                            <span className="text-slate-800">{student.date_of_admission ? new Date(student.date_of_admission).toLocaleDateString('en-GB') : '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Date Of Birth</span>
                                            <span className="text-slate-800">{student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB') : '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Contact Number</span>
                                            <span className="text-slate-800">{student.contact_number || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Nationality</span>
                                            <span className="text-slate-800">{student.nationality || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Place of Birth</span>
                                            <span className="text-slate-800">{student.place_of_birth || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Concession Type</span>
                                            <span className="text-slate-800">{student.concession_type || 'None'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Discount</span>
                                            <span className="text-slate-800">{student.concession_percentage ? `${student.concession_percentage}%` : '0%'}</span>
                                        </div>
                                    </div>

                                    {/* Address Section */}
                                    <div className="bg-slate-100 px-4 py-2 border-y border-slate-200">
                                        <h3 className="text-slate-700 font-semibold text-sm">Address</h3>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 gap-y-3 text-sm">
                                        <div className="flex justify-between md:justify-start md:gap-24">
                                            <span className="text-slate-600 font-medium w-32 shrink-0">Home Address</span>
                                            <span className="text-slate-800">{student.address || '-'}</span>
                                        </div>
                                    </div>

                                    {/* Parent Guardian Detail Section */}
                                    <div className="bg-slate-100 px-4 py-2 border-y border-slate-200">
                                        <h3 className="text-slate-700 font-semibold text-sm">Parent Guardian Detail</h3>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Father Name</span>
                                            <span className="text-slate-800">{student.father_name || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Father CNIC</span>
                                            <span className="text-slate-800">{student.father_cnic || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Father Occupation</span>
                                            <span className="text-slate-800">{student.father_occupation || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Primary Contact</span>
                                            <span className="text-slate-800">{student.primary_contact_person || 'Father'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600 font-medium">Parent Email</span>
                                            <span className="text-slate-800">{student.parent_email || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'fees' && (
                                <div className="space-y-6">
                                    {/* Outstanding Balance Summary Card */}
                                    <div className="flex justify-between items-center p-6 bg-slate-50 border border-slate-200 rounded-xl">
                                        <div>
                                            <p className="text-sm font-medium text-slate-500">Current Outstanding Balance</p>
                                            <p className={`text-3xl font-bold font-mono mt-1 ${outstanding > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                                PKR {outstanding.toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowVoucherModal(true)}
                                            className="btn-primary flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                                        >
                                            <Plus size={18} /> Generate Manual Voucher
                                        </button>
                                    </div>

                                    {/* Vouchers List */}
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-4">Fee Vouchers</h3>
                                        {loadingFees ? (
                                            <div className="text-center py-8 text-slate-500">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                                                Loading fee records...
                                            </div>
                                        ) : vouchers.length === 0 ? (
                                            <div className="text-center py-10 text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                                                <FileText size={48} className="mx-auto mb-4 opacity-30 text-slate-400" />
                                                <p className="font-medium">No fee vouchers generated for this student yet.</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 text-slate-600 bg-slate-50 text-sm">
                                                            <th className="p-4 font-semibold">Voucher ID</th>
                                                            <th className="p-4 font-semibold">Month</th>
                                                            <th className="p-4 font-semibold">Due Date</th>
                                                            <th className="p-4 font-semibold text-right">Total Payable</th>
                                                            <th className="p-4 font-semibold text-right">Amount Paid</th>
                                                            <th className="p-4 font-semibold">Status</th>
                                                            <th className="p-4 font-semibold text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {vouchers.map(v => (
                                                            <tr key={v.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors text-sm">
                                                                <td className="p-4 font-bold text-slate-700">{v.voucher_number}</td>
                                                                <td className="p-4 text-slate-600">{v.fee_month}</td>
                                                                <td className="p-4 text-slate-600">{new Date(v.due_date).toLocaleDateString()}</td>
                                                                <td className="p-4 text-right font-bold text-slate-900">PKR {v.total_payable?.toLocaleString()}</td>
                                                                <td className="p-4 text-right font-semibold text-emerald-600">PKR {v.amount_paid?.toLocaleString()}</td>
                                                                <td className="p-4">
                                                                    <span className={`badge px-2.5 py-1 rounded-full text-xs font-semibold ${v.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                                                        v.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                                                                            v.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                                                                                'bg-slate-100 text-slate-800'
                                                                        }`}>
                                                                        {(v.status || 'unpaid').toUpperCase()}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <Link to={`/admin/fees/voucher/${v.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 px-2.5 py-1.5 rounded-lg text-xs" title="View Details">
                                                                        <Eye size={14} /> View
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'marks' && (
                                <div className="text-center py-10 text-slate-500">
                                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Academic marks and grades will be displayed here.</p>
                                </div>
                            )}

                            {activeTab === 'attendance' && (
                                <div className="text-center py-10 text-slate-500">
                                    <Activity size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Attendance records will be displayed here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Generate Voucher Modal */}
            {showVoucherModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 w-full max-w-md rounded-xl shadow-xl border border-slate-200">
                        <h2 className="text-xl font-bold mb-4 text-slate-900">Generate Manual Voucher</h2>

                        {voucherError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 mb-4">
                                {voucherError}
                            </div>
                        )}

                        <form onSubmit={handleGenerateVoucher} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Session</label>
                                <select
                                    className="input w-full"
                                    value={voucherForm.session_id}
                                    onChange={e => setVoucherForm(f => ({ ...f, session_id: e.target.value }))}
                                    required
                                >
                                    <option value="">Select Session</option>
                                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fee Month</label>
                                <input
                                    type="month"
                                    className="input w-full"
                                    value={voucherForm.fee_month}
                                    onChange={e => setVoucherForm(f => ({ ...f, fee_month: e.target.value }))}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    className="input w-full"
                                    value={voucherForm.due_date}
                                    onChange={e => setVoucherForm(f => ({ ...f, due_date: e.target.value }))}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Current Fee (PKR)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="input w-full"
                                    value={voucherForm.current_fee}
                                    onChange={e => setVoucherForm(f => ({ ...f, current_fee: e.target.value }))}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Other Charges (PKR)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="input w-full"
                                    value={voucherForm.other_charges}
                                    onChange={e => setVoucherForm(f => ({ ...f, other_charges: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Discount (PKR)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="input w-full"
                                    value={voucherForm.discount}
                                    onChange={e => setVoucherForm(f => ({ ...f, discount: e.target.value }))}
                                />
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Current Fee:</span>
                                    <span>PKR {Number(voucherForm.current_fee || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Previous Balance:</span>
                                    <span className="text-rose-600 font-medium">PKR {outstanding.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Other Charges:</span>
                                    <span>PKR {Number(voucherForm.other_charges || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Discount:</span>
                                    <span>- PKR {Number(voucherForm.discount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 text-base">
                                    <span>Total Payable:</span>
                                    <span>PKR {totalPayable.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                                    onClick={() => setShowVoucherModal(false)}
                                    disabled={generating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex items-center gap-2"
                                    disabled={generating}
                                >
                                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDetailPage;
