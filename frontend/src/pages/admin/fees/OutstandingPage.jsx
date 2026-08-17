import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, Send } from 'lucide-react';

export default function OutstandingPage() {
 const [outstanding, setOutstanding] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 setTimeout(() => {
 setOutstanding([
 { studentId: 'STD-102', name: 'Bob Jones', class: '9-B', totalDue: 450, vouchers: 1, lastReminder: '2026-07-15' },
 { studentId: 'STD-105', name: 'Eve Davis', class: '10-A', totalDue: 900, vouchers: 2, lastReminder: '2026-07-10' },
 ]);
 setLoading(false);
 }, 500);
 }, []);

 return (
 <div className="p-6">
 <div className="page-header flex justify-between items-center mb-6">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <AlertTriangle className="text-yellow-500" /> Outstanding Balances
 </h1>
 <p className="text-slate-500">Students with unpaid fee vouchers</p>
 </div>
 <button className="btn-primary flex items-center gap-2 bg-blue-600 p-2 rounded hover:bg-blue-700">
 <Send size={18} /> Send Reminders to All
 </button>
 </div>

 <div className="card p-4 mb-6 bg-white rounded-lg">
 <div className="flex gap-4">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-3 text-slate-500" size={18} />
 <input
 type="text"
 className="input pl-10 w-full p-2 bg-slate-50 border border-slate-200 rounded "
 placeholder="Search by Student Name or ID..."
 />
 </div>
 <select className="input p-2 bg-slate-50 border border-slate-200 rounded ">
 <option value="">Filter by Class</option>
 <option value="10-A">10-A</option>
 <option value="9-B">9-B</option>
 </select>
 </div>
 </div>

 <div className="card overflow-x-auto bg-white rounded-lg">
 <table className="table w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-slate-200 text-slate-600">
 <th className="p-4">Student ID</th>
 <th className="p-4">Name</th>
 <th className="p-4">Class</th>
 <th className="p-4">Unpaid Vouchers</th>
 <th className="p-4">Total Due</th>
 <th className="p-4">Last Reminder</th>
 <th className="p-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr><td colSpan="7" className="text-center p-4 text-slate-500">Loading outstanding balances...</td></tr>
 ) : (
 outstanding.map(item => (
 <tr key={item.studentId} className="border-b border-slate-200 hover:bg-slate-100">
 <td className="p-4 font-medium">{item.studentId}</td>
 <td className="p-4 text-slate-600">{item.name}</td>
 <td className="p-4 text-slate-600">{item.class}</td>
 <td className="p-4 text-slate-600">
 <span className="badge px-2 py-1 rounded text-xs bg-red-900/50 text-red-400 border border-red-800">
 {item.vouchers} Vouchers
 </span>
 </td>
 <td className="p-4 text-red-400 font-bold">${item.totalDue}</td>
 <td className="p-4 text-slate-500 text-sm">{item.lastReminder || 'Never'}</td>
 <td className="p-4 text-right">
 <button className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-end gap-1 ml-auto">
 <Send size={16} /> Send Reminder
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
