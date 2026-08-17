import React, { useState, useEffect } from 'react';
import { Calendar, Users, Filter, Download } from 'lucide-react';
import { getAttendance, getSections } from '@/api';

const AttendancePage = () => {
 const [sections, setSections] = useState([]);
 const [filters, setFilters] = useState({
 date: new Date().toISOString().split('T')[0],
 sectionId: ''
 });
 
 const [attendanceData, setAttendanceData] = useState([]);
 const [isLoading, setIsLoading] = useState(false);
 const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, leave: 0 });

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

 const handleSearch = async (e) => {
 e.preventDefault();
 if (!filters.sectionId || !filters.date) {
 alert("Please select date and section");
 return;
 }
 
 setIsLoading(true);
 try {
 const data = await getAttendance(filters);
 setAttendanceData(data || []);
 
 // Calculate summary
 const sum = { present: 0, absent: 0, late: 0, leave: 0 };
 data.forEach(record => {
 const status = record.status.toLowerCase();
 if (sum[status] !== undefined) {
 sum[status]++;
 }
 });
 setSummary(sum);
 } catch (error) {
 console.error("Failed to fetch attendance", error);
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="p-6">
 <div className="page-header mb-6 flex justify-between items-center">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <Calendar className="w-6 h-6" />
 Attendance Reports
 </h1>
 <p className="text-slate-500">View daily attendance across classes</p>
 </div>
 <button className="btn-primary flex items-center gap-2">
 <Download className="w-4 h-4" />
 Export Report
 </button>
 </div>

 <div className="card p-4 mb-6">
 <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
 <select 
 name="sectionId" 
 value={filters.sectionId} 
 onChange={handleFilterChange}
 className="input w-full"
 >
 <option value="">Select Section</option>
 {sections.map(sec => (
 <option key={sec.id} value={sec.id}>{sec.name}</option>
 ))}
 </select>
 </div>
 <div>
 <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
 <Filter className="w-4 h-4" />
 {isLoading ? 'Loading...' : 'View Attendance'}
 </button>
 </div>
 </form>
 </div>

 {attendanceData.length > 0 && (
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
 <div className="card p-4 bg-green-900/20 border border-green-500/20">
 <h3 className="text-sm font-medium text-green-400">Present</h3>
 <p className="text-2xl font-bold mt-1">{summary.present}</p>
 </div>
 <div className="card p-4 bg-red-900/20 border border-red-500/20">
 <h3 className="text-sm font-medium text-red-400">Absent</h3>
 <p className="text-2xl font-bold mt-1">{summary.absent}</p>
 </div>
 <div className="card p-4 bg-yellow-900/20 border border-yellow-500/20">
 <h3 className="text-sm font-medium text-yellow-400">Late</h3>
 <p className="text-2xl font-bold mt-1">{summary.late}</p>
 </div>
 <div className="card p-4 bg-blue-900/20 border border-blue-500/20">
 <h3 className="text-sm font-medium text-blue-400">Leave</h3>
 <p className="text-2xl font-bold mt-1">{summary.leave}</p>
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
 <th className="text-center">Status</th>
 <th className="text-left">Remarks</th>
 </tr>
 </thead>
 <tbody>
 {attendanceData.length === 0 ? (
 <tr>
 <td colSpan="4" className="text-center py-8 text-slate-400">
 No attendance records found. Please search to view data.
 </td>
 </tr>
 ) : (
 attendanceData.map((record) => (
 <tr key={record.id}>
 <td>{record.student.rollNo}</td>
 <td className="font-medium flex items-center gap-2">
 <Users className="w-4 h-4 text-slate-500" />
 {record.student.name}
 </td>
 <td className="text-center">
 <span className={`badge-${record.status.toLowerCase()}`}>
 {record.status}
 </span>
 </td>
 <td>{record.remarks || '-'}</td>
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

export default AttendancePage;
