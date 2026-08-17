import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Download, Search, AlertCircle, DollarSign, Trophy } from 'lucide-react';
import api from '../../../lib/api';

export default function SectionDetailsPage() {
  const { classId, sectionId } = useParams();
  
  const [initLoading, setInitLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [sectionDetails, setSectionDetails] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [search, setSearch] = useState('');
  
  const [marksData, setMarksData] = useState([]);
  const [feeData, setFeeData] = useState([]);

  // Fetch initial lookups (Section info + Exams list)
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [secRes, exmRes] = await Promise.all([
          api.get('/classes/sections/all').catch(() => ({ data: [] })),
          api.get('/exams').catch(() => ({ data: [] }))
        ]);
        
        const allSections = secRes.data?.data || [];
        const currentSection = allSections.find(s => s.id === sectionId);
        setSectionDetails(currentSection);
        
        const exms = exmRes.data?.data || [];
        setExams(exms);
        if (exms.length > 0) {
          setSelectedExam(exms[0].id); // default to first exam
        }
      } catch (e) {
        console.error(e);
      } finally {
        setInitLoading(false);
      }
    };
    fetchInit();
  }, [sectionId]);

  // Fetch Student data (Marks + Fees) whenever Exam changes
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedExam) return;
      setLoading(true);
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
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedExam, sectionId]);

  // Build a consolidated result sheet
  const resultSheet = useMemo(() => {
    if (!marksData.length && !feeData.length) return [];
    
    const studentMap = {};
    const subjectSet = new Set();
    
    // First, process marks
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

    // Next, process fee data for the same students (and any who might not have marks yet)
    feeData.forEach(f => {
      const sId = f.student_id;
      if (!studentMap[sId]) {
        // Student exists in fee data but has no marks yet
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
    
    // Calculate percentage and rank
    const rows = Object.values(studentMap).map(row => {
      const percentage = row.totalMax > 0 ? (row.totalObtained / row.totalMax) * 100 : 0;
      return { ...row, percentage };
    });
    
    // Sort by percentage descending for ranking
    rows.sort((a, b) => b.percentage - a.percentage);
    
    // Assign positions
    rows.forEach((row, index) => {
      if (row.totalMax > 0) row.position = index + 1;
      else row.position = '-';
    });

    return { rows, subjects };
  }, [marksData, feeData]);

  if (initLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  const { rows, subjects } = resultSheet;
  
  const filteredRows = rows?.filter(r => 
    r.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.student?.roll_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-full">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/admin/academic/classes" className="text-sm font-medium text-slate-500 hover:text-primary-600 flex items-center gap-1 mb-1 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Classes
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Class {sectionDetails?.classes?.name} — Section <span className="text-gradient">{sectionDetails?.name}</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wider">
            Student Performance & Fees Overview
          </p>
        </div>
      </div>

      {/* Filters / Selectors */}
      <div className="card bg-white p-5">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Exam Term</label>
            <select 
              className="input w-full bg-slate-50 border-slate-200 focus:bg-white"
              value={selectedExam}
              onChange={e => setSelectedExam(e.target.value)}
            >
              <option value="" disabled>Select an exam</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          
          <div className="flex-1 max-w-sm ml-auto">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search Student</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name or roll no..." 
                className="input pl-10 w-full bg-slate-50 focus:bg-white"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
        ) : filteredRows?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="font-bold text-slate-700">Roll No</th>
                  <th className="font-bold text-slate-700">Student Name</th>
                  {subjects.map(sub => (
                    <th key={sub} className="text-center font-bold text-slate-700 whitespace-nowrap">
                      {sub}
                    </th>
                  ))}
                  <th className="text-center font-bold text-slate-700">Total</th>
                  <th className="text-center font-bold text-slate-700">%</th>
                  <th className="text-center font-bold text-slate-700">Pos</th>
                  <th className="text-right font-bold text-slate-700">Outstanding Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, i) => (
                  <tr key={row.student?.id || i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="font-medium text-slate-500">
                      {row.student?.roll_number || '-'}
                    </td>
                    <td>
                      <div className="font-bold text-slate-900">{row.student?.full_name}</div>
                      <div className="text-xs text-slate-500">{row.student?.registration_number}</div>
                    </td>
                    
                    {subjects.map(sub => {
                      const m = row.marks[sub];
                      return (
                        <td key={sub} className="text-center">
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
                    
                    <td className="text-center font-bold text-slate-700">
                      {row.totalMax > 0 ? `${row.totalObtained} / ${row.totalMax}` : '-'}
                    </td>
                    
                    <td className="text-center">
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
                    
                    <td className="text-center">
                      {row.position !== '-' ? (
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          row.position === 1 ? 'bg-amber-100 text-amber-600' :
                          row.position === 2 ? 'bg-slate-200 text-slate-600' :
                          row.position === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {row.position}
                        </div>
                      ) : '-'}
                    </td>
                    
                    <td className="text-right">
                      {row.outstandingFee > 0 ? (
                        <div className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded">
                          <DollarSign className="w-4 h-4" /> PKR {row.outstandingFee.toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-emerald-500 font-bold bg-emerald-50 px-2 py-1 rounded">Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No data available</h3>
            <p className="text-slate-500 max-w-sm mt-1">
              Either there are no students in this section, or marks/fees have not been generated for the selected exam.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
