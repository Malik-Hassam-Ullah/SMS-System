import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2, Search, Download, Loader2, AlertCircle,
  Trophy, Award, FileText, Printer, CheckCircle2, XCircle
} from 'lucide-react';
import api from '@/api';
import toast from 'react-hot-toast';
import ResultCardModal from '../../components/academic/ResultCardModal';

export default function TeacherMarksReport() {
  const [initLoading, setInitLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  // Dropdown data derived from teacher assignments
  const [classes, setClasses] = useState([]);   // [{id, name}]
  const [exams, setExams] = useState([]);       // [{id, name, exam_type}]

  // Selections
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [search, setSearch] = useState('');

  // Report data
  const [reportData, setReportData] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);

  // Result card modal
  const [showResultCard, setShowResultCard] = useState(false);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState(null);
  const [studentCardExamData, setStudentCardExamData] = useState(null);

  // Load teacher's assigned classes & exams from teacher-assignments endpoint
  useEffect(() => {
    const init = async () => {
      try {
        const [assignRes, branchRes] = await Promise.all([
          api.get('/marks/teacher-assignments').catch(() => ({ data: { data: [] } })),
          api.get('/settings').catch(() => ({ data: {} }))
        ]);

        const assignments = assignRes.data?.data || [];
        setBranchInfo(branchRes.data || {});

        // Extract unique classes and exams from assignments
        const classMap = {};
        const examMap = {};
        assignments.forEach(a => {
          if (a.class_id && a.class_name) {
            classMap[a.class_id] = { id: a.class_id, name: a.class_name };
          }
          if (a.exam_id && a.exam_name) {
            examMap[a.exam_id] = { id: a.exam_id, name: a.exam_name, exam_type: a.exam_type };
          }
        });

        const uniqueClasses = Object.values(classMap);
        const uniqueExams = Object.values(examMap);

        setClasses(uniqueClasses);
        setExams(uniqueExams);

        if (uniqueClasses.length > 0) setSelectedClass(uniqueClasses[0].id);
        if (uniqueExams.length > 0) setSelectedExam(uniqueExams[0].id);
      } catch (err) {
        console.error('Failed to load teacher assignments:', err);
        toast.error('Failed to load assigned classes.');
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, []);

  // Fetch report whenever class or exam changes
  useEffect(() => {
    if (selectedClass && selectedExam) {
      fetchClassReport(selectedClass, selectedExam);
    }
  }, [selectedClass, selectedExam]);

  const fetchClassReport = async (classId, examId) => {
    setLoading(true);
    try {
      const res = await api.get(`/marks/report/class/${classId}/exam/${examId}`);
      setReportData(res.data?.data || null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load class result report.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResultCard = async (student) => {
    try {
      const res = await api.get(`/marks/report/student/${student.student_id}`, {
        params: { exam_id: selectedExam }
      });
      const data = res.data?.data || {};
      setSelectedStudentForCard(data.student);
      setStudentCardExamData(data.selectedExamResult);
      setShowResultCard(true);
    } catch (err) {
      toast.error('Failed to fetch student result card.');
    }
  };

  const filteredRows = useMemo(() => {
    if (!reportData?.rows) return [];
    const term = search.toLowerCase();
    return reportData.rows.filter(r =>
      (r.full_name || '').toLowerCase().includes(term) ||
      (r.roll_number || '').toLowerCase().includes(term) ||
      (r.registration_number || '').toLowerCase().includes(term) ||
      (r.father_name || '').toLowerCase().includes(term) ||
      (r.section_name || '').toLowerCase().includes(term)
    );
  }, [reportData, search]);

  const handleExportCSV = () => {
    if (!reportData || !filteredRows.length) return;
    const subjects = reportData.subjects || [];
    const headers = ['Position', 'Roll No', 'Reg No', 'Student Name', 'Father Name', 'Section', ...subjects, 'Total Obtained', 'Total Max', 'Percentage', 'Status'];
    const csvRows = filteredRows.map(r => {
      const subMarks = subjects.map(s => r.marks[s] ? (r.marks[s].is_absent ? 'ABSENT' : r.marks[s].obtained) : '-');
      return [
        `"${r.position || '-'}"`,
        `"${r.roll_number || '-'}"`,
        `"${r.registration_number || '-'}"`,
        `"${r.full_name || '-'}"`,
        `"${r.father_name || '-'}"`,
        `"${r.section_name || '-'}"`,
        ...subMarks,
        r.total_obtained,
        r.total_max,
        `"${r.percentage}%"`,
        `"${r.result_status}"`
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportData.class?.name}_${reportData.exam?.name}_Result_Sheet.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Loading state ─────────────────────────────────────────────
  if (initLoading) {
    return (
      <div className="flex justify-center items-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-700 text-lg">No Assigned Classes</h3>
        <p className="text-slate-400 text-sm mt-1">
          You have no classes assigned yet. Contact your administrator to get assignments.
        </p>
      </div>
    );
  }

  const top5 = reportData?.top5 || [];

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <BarChart2 className="w-7 h-7 text-blue-500" />
            Class Marks Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Performance analytics for your assigned classes — subject-wise results &amp; rankings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors print:hidden"
          >
            <Printer size={16} /> Print Sheet
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!filteredRows.length}
            className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50 print:hidden"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">

          {/* Exam Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Select Exam Term:
            </label>
            <select
              className="input w-full text-sm bg-white font-semibold"
              value={selectedExam}
              onChange={e => setSelectedExam(e.target.value)}
            >
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.exam_type || 'Term'})</option>
              ))}
            </select>
          </div>

          {/* Class Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Select Class:
            </label>
            <select
              className="input w-full text-sm bg-white font-semibold"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Search Student:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, roll, reg..."
                className="input pl-9 pr-4 py-2 w-full text-sm bg-slate-50 border-slate-200 rounded-lg focus:bg-white"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Top 5 Widget ── */}
      {top5.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Top 5 Position Holders — {reportData?.class?.name} ({reportData?.exam?.name})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {top5.map((ranker, i) => {
              const medalColor =
                i === 0 ? 'from-amber-400 to-amber-600 text-white' :
                i === 1 ? 'from-slate-300 to-slate-500 text-white' :
                i === 2 ? 'from-amber-700 to-orange-800 text-white' :
                'from-blue-600 to-indigo-700 text-white';

              return (
                <div
                  key={ranker.student_id}
                  className="card p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`w-8 h-8 rounded-full bg-gradient-to-br ${medalColor} flex items-center justify-center font-black text-sm shadow`}>
                      {ranker.position}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Sec {ranker.section_name}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm truncate">{ranker.full_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Roll: {ranker.roll_number}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-slate-700">
                      {ranker.total_obtained}/{ranker.total_max}
                    </span>
                    <span className="font-black text-blue-600 text-sm">
                      {ranker.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Result Table ── */}
      <div className="card p-0 overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No marks recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Either there are no students in this class or marks have not been submitted for this exam term.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3 text-center w-12">Pos</th>
                  <th className="p-3 w-16">Roll No</th>
                  <th className="p-3 w-20">Reg No</th>
                  <th className="p-3 min-w-[150px]">Student Name</th>
                  <th className="p-3">Father Name</th>
                  <th className="p-3 text-center">Sec</th>
                  {(reportData?.subjects || []).map(sub => (
                    <th key={sub} className="p-3 text-center whitespace-nowrap">{sub}</th>
                  ))}
                  <th className="p-3 text-center">Total</th>
                  <th className="p-3 text-center">%</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right print:hidden">Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(row => {
                  const isPassed = row.result_status === 'PASS';
                  return (
                    <tr key={row.student_id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Position */}
                      <td className="p-3 text-center">
                        {row.position && row.position !== '-' ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-[11px] ${
                            row.position === 1 ? 'bg-amber-400 text-slate-900 shadow-sm' :
                            row.position === 2 ? 'bg-slate-300 text-slate-800' :
                            row.position === 3 ? 'bg-orange-300 text-slate-900' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {row.position}
                          </span>
                        ) : '-'}
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-900">{row.roll_number || '-'}</td>
                      <td className="p-3 font-mono text-slate-500">{row.registration_number || '-'}</td>
                      <td className="p-3 font-bold text-slate-900">{row.full_name}</td>
                      <td className="p-3 text-slate-600">{row.father_name || '-'}</td>
                      <td className="p-3 text-center font-bold text-slate-700">{row.section_name}</td>

                      {/* Subject Marks */}
                      {(reportData?.subjects || []).map(sub => {
                        const m = row.marks[sub];
                        return (
                          <td key={sub} className="p-3 text-center">
                            {m ? (
                              m.is_absent ? (
                                <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">ABS</span>
                              ) : (
                                <span className={`font-mono font-bold ${m.is_failed ? 'text-rose-600' : 'text-slate-900'}`}>
                                  {m.obtained}
                                </span>
                              )
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total & Percentage */}
                      <td className="p-3 text-center font-mono font-bold text-slate-900">
                        {row.total_max > 0 ? `${row.total_obtained}/${row.total_max}` : '-'}
                      </td>
                      <td className="p-3 text-center font-bold text-blue-700 font-mono">
                        {row.total_max > 0 ? `${row.percentage}%` : '-'}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {row.result_status}
                        </span>
                      </td>

                      {/* Result Card */}
                      <td className="p-3 text-right print:hidden">
                        <button
                          onClick={() => handleOpenResultCard(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-bold transition-colors"
                          title="View Official Result Card"
                        >
                          <FileText size={13} /> Card
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Result Card Modal ── */}
      <ResultCardModal
        isOpen={showResultCard}
        onClose={() => setShowResultCard(false)}
        student={selectedStudentForCard}
        school={branchInfo}
        examResult={studentCardExamData}
      />
    </div>
  );
}
