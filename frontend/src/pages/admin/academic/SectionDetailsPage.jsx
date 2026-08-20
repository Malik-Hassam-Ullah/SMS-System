import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Download, Search, AlertCircle, DollarSign, Trophy, Users, Eye, Phone, CheckCircle2, ArrowRightLeft, X, CheckSquare, Square, Plus } from 'lucide-react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function SectionDetailsPage() {
  const { classId, sectionId } = useParams();

  const [initLoading, setInitLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'marks'

  const [sectionDetails, setSectionDetails] = useState(null);
  const [allClassSections, setAllClassSections] = useState([]);
  const [sectionStudents, setSectionStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // Marks & Exams state
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [marksLoading, setMarksLoading] = useState(false);
  const [marksData, setMarksData] = useState([]);
  const [feeData, setFeeData] = useState([]);
  const [search, setSearch] = useState('');

  // Shift / Move Students Modal State
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [classAllStudents, setClassAllStudents] = useState([]);
  const [selectedShiftIds, setSelectedShiftIds] = useState([]);
  const [shiftSourceFilter, setShiftSourceFilter] = useState('ALL');
  const [shiftSearch, setShiftSearch] = useState('');
  const [loadingShiftStudents, setLoadingShiftStudents] = useState(false);
  const [shifting, setShifting] = useState(false);

  const fetchSectionStudents = async () => {
    try {
      setStudentsLoading(true);
      const stuRes = await api.get('/students', { params: { class_id: classId, section_id: sectionId, limit: 1000 } }).catch(() => ({ data: { data: [] } }));
      const studentList = Array.isArray(stuRes.data)
        ? stuRes.data
        : Array.isArray(stuRes.data?.data)
          ? stuRes.data.data
          : [];

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
      setStudentsLoading(false);
    }
  };

  // Fetch initial lookups (Section info, Students list, Exams list)
  useEffect(() => {
    const fetchInit = async () => {
      try {
        setInitLoading(true);
        const [secRes, exmRes] = await Promise.all([
          api.get('/classes/sections/all').catch(() => ({ data: [] })),
          api.get('/exams').catch(() => ({ data: [] }))
        ]);

        const allSections = secRes.data?.data || secRes.data || [];
        const currentSection = allSections.find(s => s.id === sectionId);
        setSectionDetails(currentSection);

        // Sections belonging to the same class
        const sameClassSecs = allSections.filter(s => s.class_id === classId);
        setAllClassSections(sameClassSecs);

        const exms = exmRes.data?.data || exmRes.data || [];
        setExams(exms);
        if (exms.length > 0) {
          setSelectedExam(exms[0].id);
        }

        await fetchSectionStudents();
      } catch (e) {
        console.error(e);
      } finally {
        setInitLoading(false);
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

  const openShiftModal = async () => {
    setSelectedShiftIds([]);
    setShiftSourceFilter('ALL');
    setShiftSearch('');
    setShowShiftModal(true);
    setLoadingShiftStudents(true);
    try {
      const res = await api.get('/students', { params: { class_id: classId, limit: 1000 } });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : [];
      list.sort((a, b) => {
        const rollA = parseInt(a.roll_number, 10);
        const rollB = parseInt(b.roll_number, 10);
        if (!isNaN(rollA) && !isNaN(rollB) && rollA !== rollB) return rollA - rollB;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });
      setClassAllStudents(list);
    } catch (e) {
      toast.error('Failed to load students for shifting.');
    } finally {
      setLoadingShiftStudents(false);
    }
  };

  const filteredShiftStudents = useMemo(() => {
    return classAllStudents.filter(s => {
      // Don't show students already in this current section
      if (s.current_section_id === sectionId) return false;

      if (shiftSourceFilter === 'UNASSIGNED' && s.current_section_id) return false;
      if (shiftSourceFilter !== 'ALL' && shiftSourceFilter !== 'UNASSIGNED' && s.current_section_id !== shiftSourceFilter) return false;

      if (shiftSearch) {
        const term = shiftSearch.toLowerCase();
        const name = (s.full_name || '').toLowerCase();
        const roll = (s.roll_number || '').toLowerCase();
        const reg = (s.registration_number || '').toLowerCase();
        const father = (s.father_name || '').toLowerCase();
        if (!name.includes(term) && !roll.includes(term) && !reg.includes(term) && !father.includes(term)) return false;
      }
      return true;
    });
  }, [classAllStudents, shiftSourceFilter, shiftSearch, sectionId]);

  const toggleShiftSelection = (id) => {
    setSelectedShiftIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const toggleAllShiftFiltered = () => {
    const ids = filteredShiftStudents.map(s => s.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedShiftIds.includes(id));
    if (allSelected) {
      setSelectedShiftIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedShiftIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleExecuteShift = async (e) => {
    e.preventDefault();
    if (selectedShiftIds.length === 0) {
      return toast.error('Please select at least one student to move.');
    }
    try {
      setShifting(true);
      const res = await api.put('/students/bulk/assign-section', {
        student_ids: selectedShiftIds,
        section_id: sectionId
      });
      toast.success(res.data?.message || `Successfully moved ${selectedShiftIds.length} students to Section ${sectionDetails?.name}!`);
      setShowShiftModal(false);
      fetchSectionStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to shift students.');
    } finally {
      setShifting(false);
    }
  };

  // Build consolidated result sheet for marks
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

        {/* Header Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={openShiftModal}
            className="btn-primary flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 shadow-sm"
            title="Move students from other sections into this section"
          >
            <ArrowRightLeft size={14} /> Shift / Add Students Here
          </button>

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
              <h3 className="text-base font-bold text-slate-700">No students currently in Section {sectionDetails?.name}</h3>
              <p className="text-slate-500 text-sm max-w-sm mt-1 mb-4">
                You can shift students from Section A, B, etc. directly into this section.
              </p>
              <button
                onClick={openShiftModal}
                className="btn-primary flex items-center gap-1.5 text-xs font-semibold"
              >
                <ArrowRightLeft size={14} /> Shift Students into Section {sectionDetails?.name}
              </button>
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

      {/* ── MODAL: Shift Students Directly Into This Section ── */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 w-full max-w-4xl rounded-xl shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  Shift Students into Section {sectionDetails?.name} ({sectionDetails?.classes?.name})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select students from other sections to move them directly into Section {sectionDetails?.name}.
                </p>
              </div>
              <button onClick={() => setShowShiftModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            {loadingShiftStudents ? (
              <div className="flex-1 flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : classAllStudents.length === 0 ? (
              <div className="flex-1 py-16 text-center text-slate-500">
                No students found in this class.
              </div>
            ) : (
              <form onSubmit={handleExecuteShift} className="flex flex-col flex-1 overflow-hidden space-y-4">
                {/* Filter controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Filter Source Section:
                    </label>
                    <select
                      className="input w-full text-xs font-medium bg-white py-1.5"
                      value={shiftSourceFilter}
                      onChange={e => setShiftSourceFilter(e.target.value)}
                    >
                      <option value="ALL">All Other Sections ({classAllStudents.filter(s => s.current_section_id !== sectionId).length} Students)</option>
                      {allClassSections.filter(sec => sec.id !== sectionId).map(sec => {
                        const count = classAllStudents.filter(s => s.current_section_id === sec.id).length;
                        return (
                          <option key={sec.id} value={sec.id}>
                            Section {sec.name} ({count} Students)
                          </option>
                        );
                      })}
                      <option value="UNASSIGNED">
                        Unassigned ({classAllStudents.filter(s => !s.current_section_id).length} Students)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Search Student:
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search name, roll no..."
                        className="input w-full text-xs pl-8 py-1.5 bg-white"
                        value={shiftSearch}
                        onChange={e => setShiftSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Selection Counter & Quick Select */}
                <div className="flex justify-between items-center text-xs px-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleAllShiftFiltered}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold border border-slate-300 transition-colors"
                    >
                      {filteredShiftStudents.length > 0 && filteredShiftStudents.every(s => selectedShiftIds.includes(s.id))
                        ? 'Deselect All Filtered'
                        : `Select All Filtered (${filteredShiftStudents.length})`}
                    </button>
                    <span className="text-slate-500">
                      Showing {filteredShiftStudents.length} students available to shift
                    </span>
                  </div>

                  <div className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    {selectedShiftIds.length} Students Selected
                  </div>
                </div>

                {/* Table of Available Students */}
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <button type="button" onClick={toggleAllShiftFiltered} className="text-slate-400 hover:text-blue-600">
                            {filteredShiftStudents.length > 0 && filteredShiftStudents.every(s => selectedShiftIds.includes(s.id)) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="p-2.5 font-semibold text-slate-700">Roll No</th>
                        <th className="p-2.5 font-semibold text-slate-700">Reg No</th>
                        <th className="p-2.5 font-semibold text-slate-700">Student Name</th>
                        <th className="p-2.5 font-semibold text-slate-700">Father Name</th>
                        <th className="p-2.5 font-semibold text-slate-700">Current Section</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredShiftStudents.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-400 italic">
                            No other students found matching the filter.
                          </td>
                        </tr>
                      ) : (
                        filteredShiftStudents.map(student => {
                          const isSelected = selectedShiftIds.includes(student.id);
                          return (
                            <tr
                              key={student.id}
                              className={`transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-50/70 hover:bg-blue-100/60 font-medium' : 'hover:bg-slate-50'
                              }`}
                              onClick={() => toggleShiftSelection(student.id)}
                            >
                              <td className="p-2.5 text-center">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600 inline-block" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 inline-block" />
                                )}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-slate-800">{student.roll_number || '-'}</td>
                              <td className="p-2.5 text-slate-500 font-mono">{student.registration_number || '-'}</td>
                              <td className="p-2.5 text-slate-900 font-medium">{student.full_name}</td>
                              <td className="p-2.5 text-slate-600">{student.father_name || '-'}</td>
                              <td className="p-2.5">
                                {student.sections?.name ? (
                                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                    Section {student.sections.name}
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[11px] italic">
                                    Unassigned
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    {selectedShiftIds.length > 0 ? (
                      <span className="text-blue-700 font-medium">
                        Moving {selectedShiftIds.length} students into Section {sectionDetails?.name}
                      </span>
                    ) : (
                      'Select students to move into this section'
                    )}
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                      onClick={() => setShowShiftModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={shifting || selectedShiftIds.length === 0}
                      className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
                    >
                      <ArrowRightLeft size={16} />
                      {shifting
                        ? 'Moving Students...'
                        : `Move ${selectedShiftIds.length} Student${selectedShiftIds.length === 1 ? '' : 's'} into Section ${sectionDetails?.name}`}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
