import React, { useState, useEffect } from 'react';
import { Save, FileText, CheckCircle2, Loader2, AlertCircle, BookOpen, Lock, Unlock, User, Award, ArrowLeft, Search, Check, X } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import api from '@/api';
import toast from 'react-hot-toast';

export default function MarksEntryPage() {
  const { user } = useAuthStore();

  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Roster & Marks state
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterData, setRosterData] = useState(null);
  const [studentMarks, setStudentMarks] = useState([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const res = await api.get('/marks/teacher-assignments');
      const list = res.data?.data || [];
      setAssignments(list);
      if (list.length > 0) {
        loadRoster(list[0]);
      }
    } catch (err) {
      toast.error('Failed to load assigned classes/subjects.');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadRoster = async (assignment) => {
    setSelectedAssignment(assignment);
    setLoadingRoster(true);
    try {
      const res = await api.get('/marks/roster', {
        params: {
          section_id: assignment.section_id,
          subject_id: assignment.subject_id,
          exam_id: assignment.exam_id
        }
      });

      const data = res.data?.data || {};
      setRosterData(data);

      // Initialize student marks state
      const initialMarks = (data.roster || []).map(stu => ({
        student_id: stu.student_id,
        roll_number: stu.roll_number,
        registration_number: stu.registration_number,
        full_name: stu.full_name,
        father_name: stu.father_name,
        total_marks: stu.total_marks || data.subject?.total_marks || 100,
        marks_obtained: stu.marks_obtained !== null && stu.marks_obtained !== '' ? stu.marks_obtained : '',
        is_absent: !!stu.is_absent,
        remarks: stu.remarks || ''
      }));

      setStudentMarks(initialMarks);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load student roster.');
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleMarkChange = (studentId, value) => {
    setStudentMarks(prev =>
      prev.map(s => {
        if (s.student_id === studentId) {
          return { ...s, marks_obtained: value, is_absent: false };
        }
        return s;
      })
    );
  };

  const toggleAbsent = (studentId) => {
    setStudentMarks(prev =>
      prev.map(s => {
        if (s.student_id === studentId) {
          const newAbsent = !s.is_absent;
          return { ...s, is_absent: newAbsent, marks_obtained: newAbsent ? '' : s.marks_obtained };
        }
        return s;
      })
    );
  };

  const handleSaveMarks = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAssignment || !rosterData) return;

    if (rosterData.is_locked) {
      return toast.error('This exam is locked. Marks cannot be saved.');
    }

    const maxMarks = Number(rosterData.subject?.total_marks || 100);

    // Validate marks before sending
    for (const s of studentMarks) {
      if (!s.is_absent && s.marks_obtained !== '' && s.marks_obtained !== null) {
        const num = Number(s.marks_obtained);
        if (isNaN(num)) {
          return toast.error(`Invalid numeric mark for ${s.full_name}`);
        }
        if (num < 0) {
          return toast.error(`Negative marks are not allowed for ${s.full_name}`);
        }
        if (num > maxMarks) {
          return toast.error(`Obtained marks (${num}) for ${s.full_name} cannot exceed total marks (${maxMarks})`);
        }
      }
    }

    try {
      setSaving(true);
      const payload = {
        exam_id: selectedAssignment.exam_id,
        subject_id: selectedAssignment.subject_id,
        section_id: selectedAssignment.section_id,
        marks: studentMarks.map(s => ({
          student_id: s.student_id,
          marks_obtained: s.is_absent ? 0 : (s.marks_obtained !== '' ? Number(s.marks_obtained) : null),
          is_absent: s.is_absent,
          remarks: s.remarks
        }))
      };

      const res = await api.post('/marks/bulk', payload);
      toast.success(res.data?.message || 'Marks saved successfully!');
      // Refresh roster data
      loadRoster(selectedAssignment);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = studentMarks.filter(s => {
    const term = search.toLowerCase();
    return (
      (s.full_name || '').toLowerCase().includes(term) ||
      (s.roll_number || '').toLowerCase().includes(term) ||
      (s.father_name || '').toLowerCase().includes(term)
    );
  });

  const totalStudents = studentMarks.length;
  const enteredCount = studentMarks.filter(s => s.marks_obtained !== '' || s.is_absent).length;
  const absentCount = studentMarks.filter(s => s.is_absent).length;
  const pendingCount = totalStudents - enteredCount;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Award className="w-7 h-7 text-indigo-600" />
            Teacher Marks Entry Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Select your assigned exam and class to record student marks with instant validation.
          </p>
        </div>

        {selectedAssignment && rosterData && !rosterData.is_locked && (
          <button
            onClick={handleSaveMarks}
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving Marks...' : 'Save All Marks'}
          </button>
        )}
      </div>

      {/* ── ASSIGNMENTS SELECTOR BAR / CARDS ── */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
          Your Assigned Classes & Subjects ({assignments.length})
        </label>

        {loadingAssignments ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="card p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No active class assignments found</p>
            <p className="text-xs text-slate-400 mt-1">
              The CEO or Administrator has not assigned you any exam subjects yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {assignments.map((assign, idx) => {
              const isSelected =
                selectedAssignment?.section_id === assign.section_id &&
                selectedAssignment?.subject_id === assign.subject_id &&
                selectedAssignment?.exam_id === assign.exam_id;

              return (
                <button
                  key={idx}
                  onClick={() => loadRoster(assign)}
                  className={`card p-4 text-left border rounded-xl transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                        {assign.exam_name}
                      </span>
                      {assign.is_locked && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Lock size={11} /> Locked
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {assign.class_name} — Section {assign.section_name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                      Subject: <span className="text-indigo-600">{assign.subject_name}</span> (Max: {assign.total_marks})
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className={`font-semibold ${assign.marks_entered > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {assign.marks_entered > 0 ? 'Marks Submitted' : 'Pending Entry'}
                    </span>
                    <span className="text-indigo-600 font-bold text-xs">Open Roster →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MARKS ENTRY ROSTER TABLE ── */}
      {selectedAssignment && rosterData && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Lock Banner if locked */}
          {rosterData.is_locked && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-3 text-amber-900">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">This examination is LOCKED by CEO / Administration.</p>
                <p className="text-xs text-amber-700">Marks are in read-only mode and cannot be modified.</p>
              </div>
            </div>
          )}

          {/* Roster Controls & Summary Bar */}
          <div className="card bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>{rosterData.class_name} — Section {rosterData.section_name}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-indigo-600">{rosterData.subject?.name}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exam Term: <span className="font-semibold text-slate-700">{rosterData.exam?.name}</span> • Total Marks: <span className="font-bold text-indigo-700">{rosterData.subject?.total_marks || 100}</span>
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student name or roll..."
                  className="input pl-9 pr-4 py-1.5 w-full bg-slate-50 border-slate-200 rounded-lg text-xs focus:bg-white"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs font-bold">
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                Total Students: {totalStudents}
              </span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg">
                Marks Entered: {enteredCount}
              </span>
              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-lg">
                Absent: {absentCount}
              </span>
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg">
                Pending: {pendingCount}
              </span>
            </div>
          </div>

          {/* Roster Table */}
          <div className="card p-0 overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
            {loadingRoster ? (
              <div className="flex justify-center p-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No students found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-20">Roll No</th>
                      <th className="p-3 w-24">Reg No</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Father Name</th>
                      <th className="p-3 text-center w-28">Total Marks</th>
                      <th className="p-3 text-center w-40">Obtained Marks *</th>
                      <th className="p-3 text-center w-28">Attendance</th>
                      <th className="p-3 text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((stu, index) => {
                      const maxM = stu.total_marks || rosterData.subject?.total_marks || 100;
                      const obtVal = stu.marks_obtained;
                      const isOverMax = !stu.is_absent && obtVal !== '' && Number(obtVal) > maxM;
                      const isNegative = !stu.is_absent && obtVal !== '' && Number(obtVal) < 0;
                      const hasError = isOverMax || isNegative;

                      return (
                        <tr
                          key={stu.student_id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            stu.is_absent ? 'bg-rose-50/30' : hasError ? 'bg-red-50/50' : ''
                          }`}
                        >
                          <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">{stu.roll_number || '-'}</td>
                          <td className="p-3 font-mono text-slate-500">{stu.registration_number || '-'}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 text-sm block">{stu.full_name}</span>
                          </td>
                          <td className="p-3 text-slate-600">{stu.father_name || '-'}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-500">{maxM}</td>

                          {/* Obtained Marks Input */}
                          <td className="p-3 text-center">
                            {stu.is_absent ? (
                              <span className="font-bold text-rose-600 bg-rose-100 px-3 py-1.5 rounded-lg text-xs inline-block">
                                ABSENT (0)
                              </span>
                            ) : (
                              <div className="relative inline-block w-28">
                                <input
                                  type="number"
                                  min="0"
                                  max={maxM}
                                  step="0.5"
                                  disabled={rosterData.is_locked}
                                  placeholder="0 - 100"
                                  className={`input w-full text-center font-mono font-bold text-sm py-1.5 rounded-lg transition-all ${
                                    hasError
                                      ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-400'
                                      : obtVal !== ''
                                      ? 'border-indigo-400 bg-indigo-50/30 text-indigo-900'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                  value={obtVal}
                                  onChange={e => handleMarkChange(stu.student_id, e.target.value)}
                                />
                                {isOverMax && (
                                  <span className="absolute -bottom-4 left-0 right-0 text-[10px] text-red-600 font-bold">
                                    Max: {maxM}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Absent Toggle Button */}
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              disabled={rosterData.is_locked}
                              onClick={() => toggleAbsent(stu.student_id)}
                              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                                stu.is_absent
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200'
                              }`}
                            >
                              {stu.is_absent ? 'Marked Absent' : 'Mark Absent'}
                            </button>
                          </td>

                          {/* Status Badge */}
                          <td className="p-3 text-center">
                            {stu.is_absent ? (
                              <span className="text-rose-600 font-bold text-xs">Absent</span>
                            ) : obtVal !== '' && !hasError ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                                <Check size={14} /> Ready
                              </span>
                            ) : hasError ? (
                              <span className="text-red-600 font-bold text-xs">Error</span>
                            ) : (
                              <span className="text-slate-400 font-medium text-xs">Pending</span>
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

          {/* Bottom Save Action Bar */}
          {!rosterData.is_locked && (
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">
                Remember to click "Save Marks" to record your changes into the database.
              </span>
              <button
                onClick={handleSaveMarks}
                disabled={saving}
                className="btn-primary flex items-center gap-2 text-sm shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving Marks...' : 'Save All Marks'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
