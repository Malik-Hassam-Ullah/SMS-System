import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, BarChart2 } from 'lucide-react';
import { getMarks, getSections, getSubjects, getExams } from '@/api';

const TeacherMarksReport = () => {
 const [sections, setSections] = useState([]);
 const [subjects, setSubjects] = useState([]);
 const [exams, setExams] = useState([]);
 
 const [filters, setFilters] = useState({
 sectionId: '',
 subjectId: '',
 examId: ''
 });
 
 const [marks, setMarks] = useState([]);
 const [isLoading, setIsLoading] = useState(false);
 const [stats, setStats] = useState({ avg: 0, highest: 0, passRate: 0 });

 useEffect(() => {
 const fetchOptions = async () => {
 try {
 const [sectionsData, subjectsData, examsData] = await Promise.all([
 getSections(),
 getSubjects(),
 getExams()
 ]);
 setSections(sectionsData || []);
 setSubjects(subjectsData || []);
 setExams(examsData || []);
 } catch (error) {
 console.error("Failed to load options", error);
 }
 };
 fetchOptions();
 }, []);

 const handleFilterChange = (e) => {
 const { name, value } = e.target;
 setFilters(prev => ({ ...prev, [name]: value }));
 };

 const calculateStats = (data) => {
 if (!data || data.length === 0) return { avg: 0, highest: 0, passRate: 0 };
 
 let totalMarks = 0;
 let highest = 0;
 let passed = 0;
 
 data.forEach(mark => {
 const score = Number(mark.obtainedMarks);
 totalMarks += score;
 if (score > highest) highest = score;
 if (mark.status === 'Pass') passed++;
 });
 
 return {
 avg: (totalMarks / data.length).toFixed(1),
 highest,
 passRate: ((passed / data.length) * 100).toFixed(1)
 };
 };

 const handleSearch = async (e) => {
 e.preventDefault();
 if (!filters.sectionId || !filters.subjectId || !filters.examId) {
 alert("Please select section, subject, and exam");
 return;
 }
 
 setIsLoading(true);
 try {
 const data = await getMarks(filters);
 setMarks(data || []);
 setStats(calculateStats(data || []));
 } catch (error) {
 console.error("Failed to fetch marks report", error);
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="p-6">
 <div className="page-header mb-6 flex justify-between items-center">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <BarChart2 className="w-6 h-6" />
 Class Marks Report
 </h1>
 <p className="text-slate-500">View performance analytics for your assigned classes</p>
 </div>
 <button className="btn-primary flex items-center gap-2">
 <Download className="w-4 h-4" />
 Download PDF
 </button>
 </div>

 <div className="card p-4 mb-6">
 <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
 <div>
 <label className="block text-sm font-medium mb-1">Section</label>
 <select name="sectionId" value={filters.sectionId} onChange={handleFilterChange} className="input w-full">
 <option value="">Select Section</option>
 {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium mb-1">Subject</label>
 <select name="subjectId" value={filters.subjectId} onChange={handleFilterChange} className="input w-full">
 <option value="">Select Subject</option>
 {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium mb-1">Exam</label>
 <select name="examId" value={filters.examId} onChange={handleFilterChange} className="input w-full">
 <option value="">Select Exam</option>
 {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
 </select>
 </div>
 <div>
 <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
 <Search className="w-4 h-4" />
 {isLoading ? 'Generating...' : 'Generate Report'}
 </button>
 </div>
 </form>
 </div>

 {marks.length > 0 && (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <div className="card p-4 bg-slate-50/50">
 <h3 className="text-sm font-medium text-slate-500">Class Average</h3>
 <p className="text-3xl font-bold mt-1 text-blue-400">{stats.avg}</p>
 </div>
 <div className="card p-4 bg-slate-50/50">
 <h3 className="text-sm font-medium text-slate-500">Highest Score</h3>
 <p className="text-3xl font-bold mt-1 text-yellow-400">{stats.highest}</p>
 </div>
 <div className="card p-4 bg-slate-50/50">
 <h3 className="text-sm font-medium text-slate-500">Pass Rate</h3>
 <p className="text-3xl font-bold mt-1 text-green-400">{stats.passRate}%</p>
 </div>
 </div>
 )}

 <div className="card overflow-hidden">
 <div className="overflow-x-auto">
 <table className="table w-full">
 <thead>
 <tr>
 <th className="text-left">Roll No</th>
 <th className="text-left">Student Name</th>
 <th className="text-center">Total Marks</th>
 <th className="text-center">Obtained Marks</th>
 <th className="text-center">Grade</th>
 <th className="text-center">Status</th>
 </tr>
 </thead>
 <tbody>
 {marks.length === 0 ? (
 <tr>
 <td colSpan="6" className="text-center py-8 text-slate-400">
 No marks records available. Generate a report to view details.
 </td>
 </tr>
 ) : (
 marks.map((mark) => (
 <tr key={mark.id}>
 <td>{mark.student.rollNo}</td>
 <td className="font-medium">{mark.student.name}</td>
 <td className="text-center">{mark.totalMarks}</td>
 <td className="text-center font-bold text-lg">{mark.obtainedMarks}</td>
 <td className="text-center">
 <span className="badge-primary">{mark.grade}</span>
 </td>
 <td className="text-center">
 <span className={`badge-${mark.status === 'Pass' ? 'success' : 'danger'}`}>
 {mark.status}
 </span>
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
};

export default TeacherMarksReport;
