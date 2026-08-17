import React, { useState } from 'react';
import { Shield, Filter, Search, Clock, User, Activity, Database } from 'lucide-react';

const AuditLogsPage = () => {
 const [logs, setLogs] = useState([
 { id: 1, user: 'Admin User', role: 'Super Admin', action: 'CREATE', module: 'Student', details: 'Added new student John Doe', timestamp: '2026-07-21T09:30:00Z', ip: '192.168.1.1' },
 { id: 2, user: 'Finance Officer', role: 'Staff', action: 'UPDATE', module: 'Fee', details: 'Updated fee structure for Class 10', timestamp: '2026-07-21T08:45:00Z', ip: '192.168.1.12' },
 { id: 3, user: 'System', role: 'System', action: 'DELETE', module: 'Session', details: 'Cleared expired sessions', timestamp: '2026-07-21T00:00:00Z', ip: 'localhost' },
 { id: 4, user: 'Teacher Sarah', role: 'Teacher', action: 'LOGIN', module: 'Auth', details: 'Successful login', timestamp: '2026-07-20T14:20:00Z', ip: '10.0.0.5' },
 { id: 5, user: 'Admin User', role: 'Super Admin', action: 'UPDATE', module: 'Settings', details: 'Changed global SMS provider', timestamp: '2026-07-20T11:15:00Z', ip: '192.168.1.1' },
 ]);

 const [filters, setFilters] = useState({
 search: '',
 module: 'all',
 action: 'all'
 });

 const getActionColor = (action) => {
 switch (action) {
 case 'CREATE': return 'text-green-400 bg-green-400/10 border border-green-400/20';
 case 'UPDATE': return 'text-blue-400 bg-blue-400/10 border border-blue-400/20';
 case 'DELETE': return 'text-red-400 bg-red-400/10 border border-red-400/20';
 case 'LOGIN': return 'text-purple-400 bg-purple-400/10 border border-purple-400/20';
 default: return 'text-slate-500 bg-white border border-slate-200';
 }
 };

 const filteredLogs = logs.filter(log => {
 const matchesSearch = log.user.toLowerCase().includes(filters.search.toLowerCase()) || 
 log.details.toLowerCase().includes(filters.search.toLowerCase());
 const matchesModule = filters.module === 'all' || log.module === filters.module;
 const matchesAction = filters.action === 'all' || log.action === filters.action;
 return matchesSearch && matchesModule && matchesAction;
 });

 const formatDate = (isoString) => {
 const date = new Date(isoString);
 return date.toLocaleString('en-US', {
 month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
 });
 };

 return (
 <div className="space-y-6">
 <div className="page-header flex justify-between items-end">
 <div>
 <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
 <Shield className="h-6 w-6 text-red-500" />
 System Audit Logs
 </h1>
 <p className="text-slate-500 text-sm mt-1">Track and monitor all system activities</p>
 </div>
 <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50/50 px-4 py-2 rounded-lg border border-slate-200">
 <Database className="h-4 w-4" />
 <span>Total Logs: <strong className="text-gray-200">{logs.length}</strong></span>
 </div>
 </div>

 <div className="card p-6">
 <div className="flex flex-col sm:flex-row gap-4 mb-6">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
 <input
 type="text"
 placeholder="Search user or details..."
 value={filters.search}
 onChange={(e) => setFilters({...filters, search: e.target.value})}
 className="input w-full pl-10"
 />
 </div>
 
 <div className="flex items-center gap-3">
 <div className="relative">
 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
 <select
 value={filters.module}
 onChange={(e) => setFilters({...filters, module: e.target.value})}
 className="input pl-10 w-40 appearance-none"
 >
 <option value="all">All Modules</option>
 <option value="Student">Student</option>
 <option value="Fee">Fee</option>
 <option value="Auth">Auth</option>
 <option value="Settings">Settings</option>
 </select>
 </div>

 <select
 value={filters.action}
 onChange={(e) => setFilters({...filters, action: e.target.value})}
 className="input w-40"
 >
 <option value="all">All Actions</option>
 <option value="CREATE">Create</option>
 <option value="UPDATE">Update</option>
 <option value="DELETE">Delete</option>
 <option value="LOGIN">Login</option>
 </select>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="table w-full text-left text-sm">
 <thead>
 <tr className="text-slate-500 border-b border-slate-200">
 <th className="pb-3 font-medium">Timestamp</th>
 <th className="pb-3 font-medium">User</th>
 <th className="pb-3 font-medium">Action & Module</th>
 <th className="pb-3 font-medium">Details</th>
 <th className="pb-3 font-medium text-right">IP Address</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-800">
 {filteredLogs.map((log) => (
 <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
 <td className="py-4">
 <div className="flex items-center gap-2 text-slate-600 whitespace-nowrap">
 <Clock className="h-4 w-4 text-slate-400" />
 {formatDate(log.timestamp)}
 </div>
 </td>
 <td className="py-4">
 <div className="flex items-center gap-3">
 <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0">
 <User className="h-4 w-4 text-slate-500" />
 </div>
 <div>
 <div className="font-medium text-gray-200">{log.user}</div>
 <div className="text-xs text-slate-400">{log.role}</div>
 </div>
 </div>
 </td>
 <td className="py-4">
 <div className="flex flex-col gap-1 items-start">
 <span className={`px-2 py-0.5 rounded text-xs font-medium tracking-wide ${getActionColor(log.action)}`}>
 {log.action}
 </span>
 <span className="text-slate-500 text-xs flex items-center gap-1">
 <Activity className="h-3 w-3" /> {log.module}
 </span>
 </div>
 </td>
 <td className="py-4">
 <p className="text-slate-600 max-w-md truncate" title={log.details}>
 {log.details}
 </p>
 </td>
 <td className="py-4 text-right text-slate-400 font-mono text-xs">
 {log.ip}
 </td>
 </tr>
 ))}
 {filteredLogs.length === 0 && (
 <tr>
 <td colSpan="5" className="py-8 text-center text-slate-400">
 No audit logs found matching your filters.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
};

export default AuditLogsPage;
