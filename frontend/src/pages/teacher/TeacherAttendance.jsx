import React, { useState, useEffect } from 'react';
import { Users, Save, CheckCircle } from 'lucide-react';
import { getStudents, getSections, markBulkAttendance } from '@/api';

const TeacherAttendance = () => {
 const [sections, setSections] = useState([]);
 const [filters, setFilters] = useState({
 sectionId: '',
 date: new Date().toISOString().split('T')[0]
 });
 
 const [students, setStudents] = useState([]);
 const [attendanceData, setAttendanceData] = useState({});
 const [isLoading, setIsLoading] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [saveSuccess, setSaveSuccess] = useState(false);

 useEffect(() => {
 const fetchSections = async () => {
 try {
 const data = await getSections();
 setSections(data || []);
 } catch (error) {
 console.error("Failed to load sections", error);
 }
 };
 fetchSections();
 }, []);

 const handleFilterChange = (e) => {
 const { name, value } = e.target;
 setFilters(prev => ({ ...prev, [name]: value }));
 };

 const handleLoadStudents = async (e) => {
 e.preventDefault();
 if (!filters.sectionId || !filters.date) {
 alert("Please select section and date");
 return;
 }
 
 setIsLoading(true);
 setSaveSuccess(false);
 try {
 const data = await getStudents({ sectionId: filters.sectionId });
 setStudents(data || []);
 
 // Default everyone to present
 const initialAttendance = {};
 (data || []).forEach(student => {
 initialAttendance[student.id] = { status: 'Present', remarks: '' };
 });
 setAttendanceData(initialAttendance);
 } catch (error) {
 console.error("Failed to fetch students", error);
 } finally {
 setIsLoading(false);
 }
 };

 const handleStatusChange = (studentId, status) => {
 setAttendanceData(prev => ({
 ...prev,
 [studentId]: { ...prev[studentId], status }
 }));
 };

 const handleRemarksChange = (studentId, remarks) => {
 setAttendanceData(prev => ({
 ...prev,
 [studentId]: { ...prev[studentId], remarks }
 }));
 };

 const markAllAs = (status) => {
 const updated = { ...attendanceData };
 Object.keys(updated).forEach(id => {
 updated[id].status = status;
 });
 setAttendanceData(updated);
 };

 const handleSaveAttendance = async () => {
 setIsSaving(true);
 setSaveSuccess(false);
 
 try {
 const payload = {
 sectionId: filters.sectionId,
 date: filters.date,
 records: Object.entries(attendanceData).map(([studentId, data]) => ({
 studentId,
 status: data.status,
 remarks: data.remarks
 }))
 };
 
 await markBulkAttendance(payload);
 setSaveSuccess(true);
 setTimeout(() => setSaveSuccess(false), 3000);
 } catch (error) {
 console.error("Failed to save attendance", error);
 alert("Failed to save attendance. Please try again.");
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <div className="p-6">
 <div className="page-header mb-6">
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <Users className="w-6 h-6" />
 Mark Daily Attendance
 </h1>
 <p className="text-slate-500">Record attendance for your assigned classes</p>
 </div>

 <div className="card p-4 mb-6">
 <form onSubmit={handleLoadStudents} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
 <div>
 <label className="block text-sm font-medium mb-1">Date</label>
 <input 
 type="date"
 name="date"
 value={filters.date}
 onChange={handleFilterChange}
 className="input w-full"
 />
 </div>
 <div>
 <label className="block text-sm font-medium mb-1">Section</label>
 <select name="sectionId" value={filters.sectionId} onChange={handleFilterChange} className="input w-full">
 <option value="">Select Section</option>
 {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
 </select>
 </div>
 <div>
 <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
 {isLoading ? 'Loading...' : 'Load Class Register'}
 </button>
 </div>
 </form>
 </div>

 {students.length > 0 && (
 <div className="card overflow-hidden">
 <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50/50 gap-4">
 <div className="flex gap-2">
 <button onClick={() => markAllAs('Present')} className="px-3 py-1 text-sm bg-slate-50 hover:bg-slate-100 rounded transition-colors">
 Mark All Present
 </button>
 <button onClick={() => markAllAs('Absent')} className="px-3 py-1 text-sm bg-slate-50 hover:bg-slate-100 rounded transition-colors">
 Mark All Absent
 </button>
 </div>
 <div className="flex items-center gap-4">
 {saveSuccess && (
 <span className="text-green-400 flex items-center gap-1 text-sm">
 <CheckCircle className="w-4 h-4" /> Attendance Saved
 </span>
 )}
 <button 
 onClick={handleSaveAttendance} 
 disabled={isSaving}
 className="btn-primary flex items-center gap-2"
 >
 <Save className="w-4 h-4" />
 {isSaving ? 'Saving...' : 'Save Attendance'}
 </button>
 </div>
 </div>
 
 <div className="overflow-x-auto">
 <table className="table w-full">
 <thead>
 <tr>
 <th className="text-left w-24">Roll No</th>
 <th className="text-left w-64">Student Name</th>
 <th className="text-center w-64">Status</th>
 <th className="text-left">Remarks</th>
 </tr>
 </thead>
 <tbody>
 {students.map((student) => {
 const data = attendanceData[student.id] || { status: 'Present', remarks: '' };
 
 return (
 <tr key={student.id}>
 <td>{student.rollNo}</td>
 <td className="font-medium">{student.name}</td>
 <td>
 <div className="flex justify-center gap-2">
 {['Present', 'Absent', 'Late', 'Leave'].map((status) => (
 <button
 key={status}
 onClick={() => handleStatusChange(student.id, status)}
 className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
 data.status === status 
 ? `bg-${status.toLowerCase()}-500 ` 
 : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
 }`}
 >
 {status.charAt(0)}
 </button>
 ))}
 </div>
 </td>
 <td>
 <input
 type="text"
 value={data.remarks}
 onChange={(e) => handleRemarksChange(student.id, e.target.value)}
 className="input w-full h-8 text-sm bg-white focus:bg-white"
 placeholder="Optional remarks..."
 />
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 );
};

export default TeacherAttendance;
