import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Download, FileText, Loader2, Search, Trophy, MessageSquare, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../lib/api';

export default function MarksViewPage() {
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  // Lookups
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [exams, setExams] = useState([]);

  // Selections
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [search, setSearch] = useState('');

  // Data
  const [marksData, setMarksData] = useState([]);
  const [feeData, setFeeData] = useState([]); // { student_id: outstanding_balance }

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [cls, sec, exm] = await Promise.all([
          api.get('/classes').catch(() => ({ data: [] })),
          api.get('/classes/sections/all').catch(() => ({ data: [] })),
          api.get('/exams').catch(() => ({ data: [] }))
        ]);
        setClasses(cls.data || []);
        setSections(sec.data || []);
        setExams(exm.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setInitLoading(false);
      }
    };
    fetchInit();
  }, []);

  const availableSections = selectedClass
    ? sections.filter(s => s.class_id === selectedClass)
    : [];

  const handleFetchReport = async () => {
    if (!selectedSection || !selectedExam) return;
    setLoading(true);
    try {
      // 1. Fetch Marks for section + exam
      const mRes = await api.get(`/marks/report/section/${selectedSection}`, {
        params: { exam_id: selectedExam }
      });
      const marksList = mRes.data?.data || [];

      // 2. Fetch Fee Outstanding for section
      // The API supports ?section_id=... limit=500
      const fRes = await api.get('/fees/outstanding', {
        params: { section_id: selectedSection, limit: 1000 }
      });
      const outList = fRes.data?.data || [];

      setMarksData(marksList);
      setFeeData(outList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Generate Result Sheet
  const resultSheet = useMemo(() => {
    if (!marksData.length) return [];

    // Group marks by student
    const studentMap = {};
    const subjectSet = new Set();

    marksData.forEach(m => {
      const sId = m.student_id;
      if (!studentMap[sId]) {
        studentMap[sId] = {
          student: m.students,
          marks: {},
          totalObtained: 0,
          totalMax: 0
        };
      }

      const subName = m.subjects?.name || 'Unknown';
      subjectSet.add(subName);

      studentMap[sId].marks[subName] = {
        obtained: Number(m.marks_obtained),
        max: Number(m.total_marks || m.subjects?.total_marks || 100)
      };

      studentMap[sId].totalObtained += Number(m.marks_obtained);
      studentMap[sId].totalMax += Number(m.total_marks || m.subjects?.total_marks || 100);
    });

    // Create array and calculate percentages
    let results = Object.values(studentMap).map(row => {
      const percentage = row.totalMax > 0 ? (row.totalObtained / row.totalMax) * 100 : 0;
      return {
        ...row,
        percentage,
        subjectsList: Array.from(subjectSet)
      };
    });

    // Sort by percentage descending to assign ranks
    results.sort((a, b) => b.percentage - a.percentage);

    // Assign ranks (handling ties)
    let currentRank = 1;
    let prevPercentage = null;
    let rankOffset = 0;

    results.forEach((row, index) => {
      if (prevPercentage !== null && row.percentage < prevPercentage) {
        currentRank = currentRank + rankOffset;
        rankOffset = 1;
      } else if (prevPercentage !== null) {
        rankOffset++;
      } else {
        rankOffset = 1;
      }
      row.position = currentRank;
      prevPercentage = row.percentage;
    });

    // Map fee data
    const feeMap = {};
    feeData.forEach(f => {
      feeMap[f.student_id] = f.total_outstanding;
    });

    results = results.map(row => ({
      ...row,
      outstanding_fee: feeMap[row.student.id] || 0
    }));

    return results;
  }, [marksData, feeData]);

  // Search filter
  const filteredResults = resultSheet.filter(row =>
    row.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    row.student?.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  const getRankBadge = (pos) => {
    if (pos === 1) return <span className="flex items-center gap-1 font-bold text-amber-500"><Trophy size={14} /> 1st</span>;
    if (pos === 2) return <span className="flex items-center gap-1 font-bold text-slate-400"><Trophy size={14} /> 2nd</span>;
    if (pos === 3) return <span className="flex items-center gap-1 font-bold text-amber-700"><Trophy size={14} /> 3rd</span>;
    return <span className="font-semibold text-slate-600">{pos}th</span>;
  };

  if (initLoading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  const subjectsCols = resultSheet.length > 0 ? resultSheet[0].subjectsList : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="text-blue-500" /> Comprehensive Result Sheet
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">View consolidated marks, class positions, and fee status</p>
        </div>
        <div className="flex gap-3">
          {selectedClass && (
            <Link to={`/admin/messages/compose?class=${selectedClass}&section=${selectedSection}`} className="btn-secondary bg-white shadow-sm flex items-center gap-2">
              <MessageSquare size={16} /> Message Class
            </Link>
          )}
          <button className="btn-outline bg-white shadow-sm" disabled={filteredResults.length === 0}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Filters */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Class</label>
                <select className="input bg-white w-full" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Section</label>
                <select className="input bg-white w-full" value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass}>
                  <option value="">Select Section</option>
                  {availableSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Exam</label>
                <select className="input bg-white w-full" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                  <option value="">Select Exam</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={handleFetchReport}
              disabled={!selectedSection || !selectedExam || loading}
              className="btn-primary flex items-center gap-2 h-10 px-6"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
              Generate Report
            </button>
          </div>

          {resultSheet.length > 0 && (
            <div className="mt-6 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search student name or roll no..."
                className="input w-full pl-10 bg-white"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap bg-slate-100/50">Rank</th>
                <th className="px-6 py-4 whitespace-nowrap">Roll No</th>
                <th className="px-6 py-4 whitespace-nowrap min-w-[200px]">Student Name</th>
                {subjectsCols.map(sub => (
                  <th key={sub} className="px-6 py-4 whitespace-nowrap text-center">{sub}</th>
                ))}
                <th className="px-6 py-4 whitespace-nowrap text-center bg-blue-50/50 text-blue-800">Total Marks</th>
                <th className="px-6 py-4 whitespace-nowrap text-center bg-blue-50/50 text-blue-800">%</th>
                <th className="px-6 py-4 whitespace-nowrap text-right bg-rose-50/50 text-rose-800 border-l border-slate-200">Fee Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6 + subjectsCols.length} className="px-6 py-16 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
                    Generating comprehensive report...
                  </td>
                </tr>
              ) : !selectedSection || !selectedExam ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-slate-500">
                    <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-base font-medium text-slate-900">Select class, section and exam</p>
                    <p className="mt-1">Click "Generate Report" to view the result sheet.</p>
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={6 + subjectsCols.length} className="px-6 py-16 text-center text-slate-500">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-base font-medium text-slate-900">No results found</p>
                    <p className="mt-1">No marks entered for this selection yet.</p>
                  </td>
                </tr>
              ) : (
                filteredResults.map((row) => (
                  <tr key={row.student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap bg-slate-50/50 border-r border-slate-100">
                      {getRankBadge(row.position)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-600">
                      {row.student.roll_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900">{row.student.full_name}</p>
                      <p className="text-xs text-slate-500">{row.student.registration_number}</p>
                    </td>

                    {subjectsCols.map(sub => {
                      const m = row.marks[sub];
                      return (
                        <td key={sub} className="px-6 py-4 whitespace-nowrap text-center">
                          {m ? (
                            <div>
                              <span className="font-bold text-slate-800">{m.obtained}</span>
                              <span className="text-slate-400 text-xs">/{m.max}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-6 py-4 whitespace-nowrap text-center bg-blue-50/30">
                      <span className="font-bold text-slate-900">{row.totalObtained}</span>
                      <span className="text-slate-400 text-xs">/{row.totalMax}</span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center bg-blue-50/30">
                      <div className="flex flex-col items-center">
                        <span className={`font-bold ${row.percentage >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {row.percentage.toFixed(1)}%
                        </span>
                        <div className="w-16 bg-slate-200 rounded-full h-1 mt-1">
                          <div
                            className={`h-1 rounded-full ${row.percentage >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right border-l border-slate-100 bg-slate-50/30">
                      {row.outstanding_fee > 0 ? (
                        <div>
                          <p className="text-xs font-bold text-rose-500 uppercase">Outstanding</p>
                          <p className="font-bold text-rose-700">PKR {Number(row.outstanding_fee).toLocaleString()}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-emerald-500 uppercase">Cleared</p>
                          <p className="font-bold text-emerald-700">PKR 0</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
