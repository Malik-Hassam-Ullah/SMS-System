import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Download, Search, AlertCircle, DollarSign, Trophy, Users, Eye, Phone, CheckCircle2 } from 'lucide-react';
import api from '../../../lib/api';

export default function SectionDetailsPage() {
  const { classId, sectionId } = useParams();

  const [initLoading, setInitLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'marks'

  const [sectionDetails, setSectionDetails] = useState(null);
  const [sectionStudents, setSectionStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // Marks & Exams state
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [marksLoading, setMarksLoading] = useState(false);
  const [marksData, setMarksData] = useState([]);
  const [feeData, setFeeData] = useState([]);
  const [search, setSearch] = useState('');

  // Fetch initial lookups (Section info, Students list, Exams list)
  useEffect(() => {
    const fetchInit = async () => {
      try {
        setInitLoading(true);
        const [secRes, exmRes, stuRes] = await Promise.all([
          api.get('/classes/sections/all').catch(() => ({ data: [] })),
          api.get('/exams').catch(() => ({ data: [] })),
          api.get('/students', { params: { class_id: classId, section_id: sectionId, limit: 1000 } }).catch(() => ({ data: { data: [] } }))
        ]);

        const allSections = secRes.data?.data || secRes.data || [];
        const currentSection = allSections.find(s => s.id === sectionId);
        setSectionDetails(currentSection);

        const exms = exmRes.data?.data || exmRes.data || [];
        setExams(exms);
        if (exms.length > 0) {
          setSelectedExam(exms[0].id);
        }

        const studentList = Array.isArray(stuRes.data)
          ? stuRes.data
          : Array.isArray(stuRes.data?.data)
            ? stuRes.data.data
            : [];

        // Sort students by Roll Number / Reg No ascending
        studentList.sort((a, b) => {
          const rollA = parseInt(a.roll_number, 10);
          const rollB = parseInt(b.roll_number, 10);
          if (!isNaN(rollA) && !isNaN(rollB) && rollA !== rollB) return rollA - rollB;
          const regA = parseInt(a.registration_number, 10);
          const regB = parseInt(b.registration_number, 10);
          if (!isNaN(regA) && !isNaN(regB) && regA !== regB) return regA - regB;
          return (a.full_name || '').localeCompare(b.full_name || '');
        });

        setSectionStudents(studentList);
      } catch (e) {
        console.error(e);
      } finally {
        setInitLoading(false);
        setStudentsLoading(false);
      }
    };
    fetchInit();
  }, [classId, sectionId]);

  // Fetch Student data (Marks + Fees) whenever Exam changes
  useEffect(() => {
    const fetchMarks = async () => {
      if (!selectedExam || activeTab !== 'marks') return;
      setMarksLoading(true);
      try {
        const [mRes, fRes] = await Promise.all([
          api.get(`/marks/report/section/${sectionId}`, { params: { exam_id: selectedExam } }).catch(() => ({ data: { data: [] } })),
          api.get('/fees/outstanding', { params: { section_id: sectionId, limit: 1000 } }).catch(() => ({ data: { data: [] } }))
        ]);

        setMarksData(mRes.data?.data || []);
        setFeeData(fRes.data?.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setMarksLoading(false);
      }
    };
    fetchMarks();
  }, [selectedExam, sectionId, activeTab]);

  // Build a consolidated result sheet
  const resultSheet = useMemo(() => {
    if (!marksData.length && !feeData.length) return [];

    const studentMap = {};
    const subjectSet = new Set();

    marksData.forEach(m => {
      const sId = m.student_id;
      if (!studentMap[sId]) {
        studentMap[sId] = {
          student: m.students,
          marks: {},
          totalObtained: 0,
          totalMax: 0,
          outstandingFee: 0
        };
      }
      const subName = m.subjects?.name || 'Unknown';
      subjectSet.add(subName);

      const obtained = Number(m.marks_obtained);
      const max = Number(m.total_marks || m.subjects?.total_marks || 100);

      studentMap[sId].marks[subName] = { obtained, max };
      studentMap[sId].totalObtained += obtained;
      studentMap[sId].totalMax += max;
    });

    feeData.forEach(f => {
      const sId = f.student_id;
      if (!studentMap[sId]) {
        studentMap[sId] = {
          student: f.students,
          marks: {},
          totalObtained: 0,
          totalMax: 0,
          outstandingFee: 0
        };
      }
      studentMap[sId].outstandingFee += Number(f.balance_amount);
    });

    const subjects = Array.from(subjectSet).sort();

    const rows = Object.values(studentMap).map(row => {
      const percentage = row.totalMax > 0 ? (row.totalObtained / row.totalMax) * 100 : 0;
      return { ...row, percentage };
    });

    rows.sort((a, b) => b.percentage - a.percentage);

    rows.forEach((row, index) => {
      if (row.totalMax > 0) row.position = index + 1;
      else row.position = '-';
    });

    return { rows, subjects };
  }, [marksData, feeData]);

  if (initLoading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredStudents = sectionStudents.filter(s => {
    const term = search.toLowerCase();
    const name = (s.full_name || '').toLowerCase();
    const roll = (s.roll_number || '').toLowerCase();
    const reg = (s.registration_number || '').toLowerCase();
    const father = (s.father_name || '').toLowerCase();
    return name.includes(term) || roll.includes(term) || reg.includes(term) || father.includes(term);
  });

  const { rows, subjects } = resultSheet;
  const filteredMarksRows = rows?.filter(r =>
    r.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.student?.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/admin/academic/classes" className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-1 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Classes & Sections
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {sectionDetails?.classes?.name || 'Class'} — <span className="text-blue-600">Section {sectionDetails?.name || ''}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Total <span className="font-semibold text-slate-800">{sectionStudents.length} Students</span> enrolled in this section
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'students'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={16} />
            Enrolled Students ({sectionStudents.length})
          </button>
          <button
            onClick={() => setActiveTab('marks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === 'marks'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy size={16} />
            Exam Results & Performance
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, roll no, reg no, father..."
              className="input pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-blue-500 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {activeTab === 'marks' && (
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Exam Term:</label>
              <select
                className="input bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                value={selectedExam}
                onChange={e => setSelectedExam(e.target.value)}
              >
                {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── TAB 1: Enrolled Students List ── */}
      {activeTab === 'students' && (
        <div className="card p-0 overflow-hidden bg-white border border-slate-200 rounded-lg shadow-sm">
          {studentsLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                    <th className="p-3">#</th>
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Reg No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Father Name</th>
                    <th className="p-3">Father CNIC</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3 text-right">Outstanding Fee</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((stu, index) => {
                    const balanceObj = Array.isArray(stu.student_outstanding_balance)
                      ? stu.student_outstanding_balance[0]
                      : stu.student_outstanding_balance;
                    const feeDues = Number(balanceObj?.total_outstanding || 0);

                    return (
                      <tr key={stu.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 text-slate-400 font-mono text-xs">{index + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{stu.roll_number || '-'}</td>
                        <td className="p-3 font-mono text-blue-600 text-xs">{stu.registration_number || '-'}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {(stu.full_name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-900">{stu.full_name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">{stu.father_name || '-'}</td>
                        <td className="p-3 font-mono text-xs text-slate-500">{stu.father_cnic || '-'}</td>
                        <td className="p-3 font-mono text-xs text-slate-600">{stu.contact_number || '-'}</td>
                        <td className="p-3 text-right font-mono font-semibold">
                          {feeDues > 0 ? (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Rs. {feeDues.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                              Paid
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            stu.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {stu.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            to={`/admin/students/${stu.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                          >
                            <Eye size={14} /> View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-700">No students found</h3>
              <p className="text-slate-500 text-sm max-w-sm mt-1">
                No student records found matching this section filter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Exam Marks & Performance ── */}
      {activeTab === 'marks' && (
        <div className="card p-0 overflow-hidden bg-white border border-slate-200 rounded-lg shadow-sm">
          {marksLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : filteredMarksRows?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                    <th className="p-3 font-bold text-slate-700">Roll No</th>
                    <th className="p-3 font-bold text-slate-700">Student Name</th>
                    {subjects.map(sub => (
                      <th key={sub} className="p-3 text-center font-bold text-slate-700 whitespace-nowrap">
                        {sub}
                      </th>
                    ))}
                    <th className="p-3 text-center font-bold text-slate-700">Total</th>
                    <th className="p-3 text-center font-bold text-slate-700">%</th>
                    <th className="p-3 text-center font-bold text-slate-700">Pos</th>
                    <th className="p-3 text-right font-bold text-slate-700">Outstanding Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMarksRows.map((row, i) => (
                    <tr key={row.student?.id || i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-medium text-slate-500 font-mono">
                        {row.student?.roll_number || '-'}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{row.student?.full_name}</div>
                        <div className="text-xs text-slate-500">{row.student?.registration_number}</div>
                      </td>

                      {subjects.map(sub => {
                        const m = row.marks[sub];
                        return (
                          <td key={sub} className="p-3 text-center">
                            {m ? (
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-sm font-medium text-slate-700">
                                {m.obtained} <span className="text-slate-400 text-xs">/ {m.max}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="p-3 text-center font-bold text-slate-700">
                        {row.totalMax > 0 ? `${row.totalObtained} / ${row.totalMax}` : '-'}
                      </td>

                      <td className="p-3 text-center">
                        {row.totalMax > 0 ? (
                          <span className={`inline-flex px-2 py-1 rounded text-sm font-bold ${
                            row.percentage >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            row.percentage >= 60 ? 'bg-blue-100 text-blue-700' :
                            row.percentage >= 40 ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {row.percentage.toFixed(1)}%
                          </span>
                        ) : '-'}
                      </td>

                      <td className="p-3 text-center">
                        {row.position !== '-' ? (
                          <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${
                            row.position === 1 ? 'bg-amber-100 text-amber-600' :
                            row.position === 2 ? 'bg-slate-200 text-slate-600' :
                            row.position === 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-50 text-slate-500'
                          }`}>
                            {row.position}
                          </div>
                        ) : '-'}
                      </td>

                      <td className="p-3 text-right">
                        {row.outstandingFee > 0 ? (
                          <span className="text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-200 text-xs">
                            PKR {row.outstandingFee.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200 text-xs">
                            Paid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <AlertCircle className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-700">No marks data available</h3>
              <p className="text-slate-500 text-sm max-w-sm mt-1">
                Marks have not been generated for the selected exam yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
