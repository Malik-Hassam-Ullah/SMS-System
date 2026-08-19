import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, User, BookOpen, ChevronDown, ChevronRight,
  Loader2, Award, IndianRupee, Printer, CheckCircle2,
  AlertCircle, X, Edit2, DollarSign, Calendar, Clock
} from 'lucide-react';
import api from '@/api';
import { useAuthStore } from '@/store/auth.store';

const TeacherDetailPage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuthStore();
  const [teacher, setTeacher] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);

  // Marks View States
  const [expandedAssignment, setExpandedAssignment] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [marksData, setMarksData] = useState([]);
  const [loadingMarks, setLoadingMarks] = useState(false);

  // Payroll States
  const [baseSalary, setBaseSalary] = useState(45000);
  const [payrolls, setPayrolls] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [allowanceInput, setAllowanceInput] = useState('');
  const [deductionInput, setDeductionInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [showBaseSalaryModal, setShowBaseSalaryModal] = useState(false);
  const [baseSalaryInput, setBaseSalaryInput] = useState('');
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipPayroll, setSlipPayroll] = useState(null);

  // Attendance States
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceMonth, setAttendanceMonth] = useState('2026-08');

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        const response = await api.get(`/teachers/${id}`);
        setTeacher(response.data || null);
      } catch (error) {
        console.error('Failed to fetch teacher:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacher();
  }, [id]);

  // Load/Initialize Payroll Data from localStorage
  useEffect(() => {
    if (!teacher) return;

    // Load Base Salary
    const storedBase = localStorage.getItem(`teacher_base_salary_${id}`);
    if (storedBase) {
      setBaseSalary(Number(storedBase));
    } else {
      localStorage.setItem(`teacher_base_salary_${id}`, '45000');
      setBaseSalary(45000);
    }

    // Load Payroll History
    const storedPayrolls = localStorage.getItem(`teacher_payrolls_${id}`);
    if (storedPayrolls) {
      setPayrolls(JSON.parse(storedPayrolls));
    } else {
      const initialPayrolls = [
        {
          month: 'August 2026',
          baseSalary: 45000,
          allowances: 5000,
          deductions: 2000,
          netSalary: 48000,
          status: 'paid',
          paymentMethod: 'Bank Transfer',
          paymentDate: '2026-08-05'
        },
        {
          month: 'July 2026',
          baseSalary: 45000,
          allowances: 3000,
          deductions: 1000,
          netSalary: 47000,
          status: 'paid',
          paymentMethod: 'Cash',
          paymentDate: '2026-07-02'
        },
        {
          month: 'September 2026',
          baseSalary: 45000,
          allowances: 0,
          deductions: 0,
          netSalary: 45000,
          status: 'pending',
          paymentMethod: '',
          paymentDate: ''
        }
      ];
      localStorage.setItem(`teacher_payrolls_${id}`, JSON.stringify(initialPayrolls));
      setPayrolls(initialPayrolls);
    }
  }, [teacher, id]);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get('/exams');
        setExams(res.data || []);
        if (res.data?.length > 0) {
          setSelectedExamId(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch exams:", err);
      }
    };
    if (activeTab === 'classes') {
      fetchExams();
    }
  }, [activeTab]);

  // Fetch Attendance History
  useEffect(() => {
    const fetchAttendance = async () => {
      if (activeTab !== 'attendance' || !teacher) return;
      setLoadingAttendance(true);
      try {
        const year = attendanceMonth.split('-')[0];
        const month = attendanceMonth.split('-')[1];
        const fromDate = `${year}-${month}-01`;
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        const toDate = `${year}-${month}-${lastDay}`;

        const res = await api.get('/staff-attendance', {
          params: { staff_id: id, from_date: fromDate, to_date: toDate, branch_id: teacher.branch_id }
        });
        setAttendanceHistory(res.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch attendance history:", err);
      } finally {
        setLoadingAttendance(false);
      }
    };
    fetchAttendance();
  }, [activeTab, attendanceMonth, id, teacher]);

  const handleExpandAssignment = async (assignment) => {
    if (expandedAssignment === assignment.id) {
      setExpandedAssignment(null);
      return;
    }
    setExpandedAssignment(assignment.id);
    fetchMarks(assignment.sections.id, assignment.subjects.id, selectedExamId);
  };

  const fetchMarks = async (sectionId, subjectId, examId) => {
    if (!sectionId || !subjectId || !examId) return;
    setLoadingMarks(true);
    try {
      const res = await api.get('/marks', { params: { section_id: sectionId, subject_id: subjectId, exam_id: examId } });
      setMarksData(res.data || []);
    } catch (err) {
      console.error("Failed to fetch marks", err);
    } finally {
      setLoadingMarks(false);
    }
  };

  // Refetch marks if exam changes
  useEffect(() => {
    if (expandedAssignment && selectedExamId) {
      const assignment = teacher.teacher_assignments.find(a => a.id === expandedAssignment);
      if (assignment) {
        fetchMarks(assignment.sections.id, assignment.subjects.id, selectedExamId);
      }
    }
  }, [selectedExamId]);

  // Handle Base Salary Update
  const handleUpdateBaseSalary = (e) => {
    e.preventDefault();
    const newBase = Number(baseSalaryInput);
    if (isNaN(newBase) || newBase <= 0) return;

    setBaseSalary(newBase);
    localStorage.setItem(`teacher_base_salary_${id}`, newBase.toString());

    const updatedPayrolls = payrolls.map(p => {
      if (p.status === 'pending') {
        return {
          ...p,
          baseSalary: newBase,
          netSalary: newBase + p.allowances - p.deductions
        };
      }
      return p;
    });
    setPayrolls(updatedPayrolls);
    localStorage.setItem(`teacher_payrolls_${id}`, JSON.stringify(updatedPayrolls));
    setShowBaseSalaryModal(false);
  };

  // Handle Pay Salary
  const handlePaySalary = (e) => {
    e.preventDefault();
    const allowances = Number(allowanceInput) || 0;
    const deductions = Number(deductionInput) || 0;
    const netSalary = selectedPayroll.baseSalary + allowances - deductions;

    const updatedPayrolls = payrolls.map(p => {
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

    setPayrolls(updatedPayrolls);
    localStorage.setItem(`teacher_payrolls_${id}`, JSON.stringify(updatedPayrolls));
    setShowPayModal(false);
    setAllowanceInput('');
    setDeductionInput('');
  };

  // Calculate Attendance Summary Stats
  const getAttendanceSummary = () => {
    const summary = { present: 0, absent: 0, late: 0, leave: 0, total: 0, percentage: '0.0' };
    attendanceHistory.forEach(r => {
      summary.total++;
      if (r.status === 'present') summary.present++;
      else if (r.status === 'absent') summary.absent++;
      else if (r.status === 'late') summary.late++;
      else if (r.status === 'leave') summary.leave++;
    });
    if (summary.total > 0) {
      summary.percentage = ((summary.present / summary.total) * 100).toFixed(1);
    }
    return summary;
  };

  const attSummary = getAttendanceSummary();

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  if (!teacher) return <div className="p-6 text-red-400">Teacher not found</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Page Header */}
      <div className="page-header flex items-center gap-4">
        <Link to="/ceo/teachers" className="p-2 text-slate-500 hover:text-blue-500 rounded-md hover:bg-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Teacher Details</h1>
          <p className="text-slate-500">{teacher.employee_code} - {teacher.user_profiles?.full_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        {/* Sidebar/Profile Summary */}
        <div className="md:col-span-1">
          <div className="card bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
            <div className="w-24 h-24 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-300 font-bold text-3xl mb-4 uppercase shadow-inner">
              {(teacher.user_profiles?.full_name || 'T').charAt(0)}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{teacher.user_profiles?.full_name}</h2>
            <p className="text-slate-500 mb-4">{teacher.qualification || 'General'} Department</p>

            <span className={`badge px-4 py-1.5 rounded-full text-xs font-bold ${teacher.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {teacher.is_active ? 'Active' : 'Inactive'}
            </span>

            <div className="w-full mt-6 pt-6 border-t border-slate-100 flex flex-col gap-4 text-left text-sm">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Employee ID</p>
                <p className="text-slate-700 font-medium">{teacher.employee_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Email</p>
                <p className="text-slate-700 font-medium break-all">{teacher.user_profiles?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Join Date</p>
                <p className="text-slate-700 font-medium">{teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="md:col-span-3">
          <div className="card bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[500px] shadow-sm">

            {/* Tab Headers */}
            <div className="flex border-b border-slate-200 bg-slate-50/50">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}`}
              >
                <User size={18} /> Profile
              </button>
              <button
                onClick={() => setActiveTab('classes')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'classes' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}`}
              >
                <BookOpen size={18} /> Assigned Classes & Marks
              </button>
              {currentUser?.role === 'ceo' && (
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'attendance' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}`}
                >
                  <Calendar size={18} /> Attendance History
                </button>
              )}
              {currentUser?.role === 'ceo' && (
                <button
                  onClick={() => setActiveTab('payroll')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'payroll' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}`}
                >
                  <IndianRupee size={18} /> Payroll & Salary
                </button>
              )}
            </div>

            {/* Tab Contents */}
            <div className="p-6">

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                  <h3 className="text-lg font-bold text-slate-800">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Phone Number</p>
                      <p className="font-semibold text-slate-800 text-lg">{teacher.user_profiles?.phone || 'N/A'}</p>
                    </div>
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Gender</p>
                      <p className="font-semibold text-slate-800 text-lg">{teacher.user_profiles?.gender || 'N/A'}</p>
                    </div>
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">CNIC</p>
                      <p className="font-semibold text-slate-800 text-lg">{teacher.user_profiles?.cnic || 'N/A'}</p>
                    </div>
                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Address</p>
                      <p className="font-semibold text-slate-800">{teacher.user_profiles?.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Classes & Marks Tab */}
              {activeTab === 'classes' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-800">Assigned Classes & Subjects</h3>

                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <label className="text-sm font-medium text-slate-600 pl-2">Filter Marks By Exam:</label>
                      <select
                        className="input py-1.5 text-sm w-48 border-slate-300 shadow-sm"
                        value={selectedExamId}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                      >
                        {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        {exams.length === 0 && <option value="">No exams available</option>}
                      </select>
                    </div>
                  </div>

                  {teacher.teacher_assignments && teacher.teacher_assignments.length > 0 ? (
                    <div className="space-y-4">
                      {teacher.teacher_assignments.map((assignment, idx) => {
                        const isExpanded = expandedAssignment === assignment.id;
                        return (
                          <div key={idx} className={`bg-white border ${isExpanded ? 'border-indigo-300 shadow-md ring-4 ring-indigo-50' : 'border-slate-200 shadow-sm'} rounded-xl transition-all duration-200 overflow-hidden`}>
                            <button
                              onClick={() => handleExpandAssignment(assignment)}
                              className={`w-full p-5 flex items-center justify-between transition-colors ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                                  <BookOpen size={20} />
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-slate-800 text-lg">{assignment.sections?.classes?.name} - {assignment.sections?.name}</p>
                                  <p className="text-sm font-medium text-indigo-600">{assignment.subjects?.name}</p>
                                </div>
                              </div>
                              <div className={`p-2 rounded-full ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-slate-200 bg-slate-50 p-6 animate-in slide-in-from-top-2 duration-200">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                  <Award size={18} className="text-yellow-500" />
                                  Student Marks for {exams.find(e => e.id === selectedExamId)?.name || 'Selected Exam'}
                                </h4>

                                {loadingMarks ? (
                                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-500 w-6 h-6" /></div>
                                ) : marksData.length === 0 ? (
                                  <div className="text-center p-8 border border-dashed border-slate-300 rounded-lg bg-white">
                                    <p className="text-slate-500 font-medium">No marks have been recorded by this teacher for this exam yet.</p>
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                    <table className="w-full text-left text-sm">
                                      <thead className="bg-slate-100 border-b border-slate-200">
                                        <tr>
                                          <th className="p-3 font-semibold text-slate-700">Roll No</th>
                                          <th className="p-3 font-semibold text-slate-700">Student Name</th>
                                          <th className="p-3 font-semibold text-slate-700 text-center">Marks Obtained</th>
                                          <th className="p-3 font-semibold text-slate-700 text-center">Total Marks</th>
                                          <th className="p-3 font-semibold text-slate-700">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {marksData.map(mark => (
                                          <tr key={mark.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-600">{mark.students?.roll_number || '-'}</td>
                                            <td className="p-3 font-bold text-slate-800">{mark.students?.full_name}</td>
                                            <td className="p-3 text-center font-bold text-indigo-600">{mark.is_absent ? '-' : mark.marks_obtained}</td>
                                            <td className="p-3 text-center font-medium text-slate-500">{mark.subjects?.total_marks || '-'}</td>
                                            <td className="p-3">
                                              {mark.is_absent ? (
                                                <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold">ABSENT</span>
                                              ) : (
                                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">PRESENT</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="font-medium text-lg">No classes assigned to this teacher.</p>
                      <p className="text-sm">Assignments can be managed by the CEO.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Attendance History Tab (CEO Only) */}
              {activeTab === 'attendance' && currentUser?.role === 'ceo' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">

                  {/* Month Selector & Stats */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold text-slate-600">Select Month:</label>
                      <input
                        type="month"
                        value={attendanceMonth}
                        onChange={(e) => setAttendanceMonth(e.target.value)}
                        className="input py-1.5 text-sm w-44 border-slate-300 shadow-sm bg-white cursor-pointer"
                      />
                    </div>
                    {/* Stats Summary */}
                    {attendanceHistory.length > 0 && (
                      <div className="flex flex-wrap gap-3 text-xs font-bold">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg">Present: {attSummary.present}</span>
                        <span className="bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded-lg">Absent: {attSummary.absent}</span>
                        <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-lg">Late: {attSummary.late}</span>
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg">Leave: {attSummary.leave}</span>
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg">Rate: {attSummary.percentage}%</span>
                      </div>
                    )}
                  </div>

                  {/* Attendance Records Table */}
                  {loadingAttendance ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>
                  ) : attendanceHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="font-medium text-lg">No attendance records found for this month.</p>
                      <p className="text-sm">Attendance can be marked by the branch Administrator.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-5 py-3">Date</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3">Check In</th>
                              <th className="px-5 py-3">Check Out</th>
                              <th className="px-5 py-3">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {attendanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date)).map((r, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-5 py-4 font-bold text-slate-800">{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                <td className="px-5 py-4">
                                  {r.status === 'present' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                      Present
                                    </span>
                                  )}
                                  {r.status === 'absent' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                                      Absent
                                    </span>
                                  )}
                                  {r.status === 'late' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                      Late
                                    </span>
                                  )}
                                  {r.status === 'leave' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                      Leave
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-slate-600 font-mono flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" /> {r.check_in || '--:--'}
                                </td>
                                <td className="px-5 py-4 text-slate-600 font-mono">
                                  {r.check_out || '--:--'}
                                </td>
                                <td className="px-5 py-4 text-slate-500 italic">
                                  {r.remarks || 'No remarks'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Payroll Tab (CEO Only) */}
              {activeTab === 'payroll' && currentUser?.role === 'ceo' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">

                  {/* Salary Configuration Card */}
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-md">
                    <div className="space-y-1">
                      <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider">Base Salary Configuration</p>
                      <h3 className="text-3xl font-black text-white">PKR {baseSalary.toLocaleString()} <span className="text-xs text-slate-400 font-medium">/ month</span></h3>
                      <p className="text-slate-400 text-xs">This base salary is used to generate monthly payroll slips.</p>
                    </div>
                    <button
                      onClick={() => {
                        setBaseSalaryInput(baseSalary.toString());
                        setShowBaseSalaryModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold transition-all text-white"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Adjust Base Salary
                    </button>
                  </div>

                  {/* Payroll History Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                      <h4 className="font-bold text-slate-800">Salary & Payroll History</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3">Month</th>
                            <th className="px-5 py-3">Base Salary</th>
                            <th className="px-5 py-3">Allowances</th>
                            <th className="px-5 py-3">Deductions</th>
                            <th className="px-5 py-3">Net Salary</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payrolls.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-5 py-4 font-bold text-slate-800">{p.month}</td>
                              <td className="px-5 py-4 text-slate-600 font-mono">PKR {p.baseSalary.toLocaleString()}</td>
                              <td className="px-5 py-4 text-emerald-600 font-mono">+PKR {p.allowances.toLocaleString()}</td>
                              <td className="px-5 py-4 text-rose-600 font-mono">-PKR {p.deductions.toLocaleString()}</td>
                              <td className="px-5 py-4 font-bold text-slate-900 font-mono">PKR {p.netSalary.toLocaleString()}</td>
                              <td className="px-5 py-4">
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
                              <td className="px-5 py-4 text-right">
                                {p.status === 'paid' ? (
                                  <button
                                    onClick={() => {
                                      setSlipPayroll(p);
                                      setShowSlipModal(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                                  >
                                    <Printer className="w-3.5 h-3.5" /> Print Slip
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedPayroll(p);
                                      setAllowanceInput('');
                                      setDeductionInput('');
                                      setShowPayModal(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold text-white transition-colors shadow-sm"
                                  >
                                    <IndianRupee className="w-3.5 h-3.5" /> Pay Salary
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* ADJUST BASE SALARY MODAL */}
      {showBaseSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" /> Adjust Base Salary
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
      {showPayModal && selectedPayroll && (
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
                    <span className="font-bold text-slate-800">{teacher.user_profiles?.full_name}</span>
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
      {showSlipModal && slipPayroll && (
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
                  <p><span className="font-semibold text-slate-500">Employee Name:</span> <span className="font-bold text-slate-800">{teacher.user_profiles?.full_name}</span></p>
                  <p className="mt-1"><span className="font-semibold text-slate-500">Employee ID:</span> <span className="font-mono text-slate-800">{teacher.employee_code}</span></p>
                  <p className="mt-1"><span className="font-semibold text-slate-500">Department:</span> <span className="text-slate-800">{teacher.qualification || 'General'}</span></p>
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
};

export default TeacherDetailPage;
