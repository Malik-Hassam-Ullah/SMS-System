import React, { useState, useEffect } from 'react';
import { Search, Eye } from 'lucide-react';
import { getStudents } from '../../api/students.api';

export default function AccountantStudentsPage() {
 const [students, setStudents] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');

 useEffect(() => {
   const fetchStudents = async () => {
     setLoading(true);
     setError('');
     try {
       const data = await getStudents({ limit: 1000 });
       setStudents(Array.isArray(data) ? data : []);
     } catch (err) {
       console.error('Failed to load students:', err);
       setError('Unable to load students. Please refresh or contact admin.');
     } finally {
       setLoading(false);
     }
   };

   fetchStudents();
 }, []);

 return (
 <div className="p-6">
 <div className="page-header mb-6">
 <h1 className="text-2xl font-bold ">Student Directory (Read-Only)</h1>
 <p className="text-slate-500">View student details and current balances</p>
 </div>

 <div className="card p-4 mb-6 bg-white rounded-lg">
 <div className="flex gap-4">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-3 text-slate-500" size={18} />
 <input
 type="text"
 className="input pl-10 w-full p-2 bg-slate-50 border border-slate-200 rounded "
 placeholder="Search students..."
 />
 </div>
 </div>
 </div>

 <div className="card overflow-x-auto bg-white rounded-lg">
 <table className="table w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-slate-200 text-slate-600">
 <th className="p-4">Student ID</th>
 <th className="p-4">Name</th>
 <th className="p-4">Class</th>
 <th className="p-4">Status</th>
 <th className="p-4">Current Balance</th>
 <th className="p-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr><td colSpan="6" className="text-center p-4 text-slate-500">Loading students...</td></tr>
 ) : error ? (
 <tr><td colSpan="6" className="text-center p-4 text-red-500">{error}</td></tr>
 ) : students.length === 0 ? (
 <tr><td colSpan="6" className="text-center p-4 text-slate-500">No students found for your branch.</td></tr>
 ) : (
 students.map(s => (
 <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-100">
 <td className="p-4 font-medium">{s.registration_number || s.id}</td>
 <td className="p-4 text-slate-600">{s.full_name || s.name}</td>
 <td className="p-4 text-slate-600">{s.current_class_name || s.class || '-'}</td>
 <td className="p-4">
 <span className={`badge px-2 py-1 rounded text-xs ${s.is_active ? 'bg-green-900 text-green-300' : 'bg-slate-200 text-slate-500'}`}>
 {s.is_active ? 'Active' : 'Inactive'}
 </span>
 </td>
 <td className={`p-4 font-bold ${Number(s.total_outstanding || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
 {`₹${Number(s.total_outstanding || 0)}`}
 </td>
 <td className="p-4 text-right flex justify-end gap-2">
 <button className="text-blue-400 hover:text-blue-300 p-1" title="View Details">
 <Eye size={18} />
 </button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
}
