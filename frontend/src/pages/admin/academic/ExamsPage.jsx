import React, { useState, useEffect } from 'react';
import { Plus, FileText, Filter, AlertCircle } from 'lucide-react';
import api from '@/api';

export default function ExamsPage() {
 const [exams, setExams] = useState([]);
 const [sessions, setSessions] = useState([]);
 const [selectedSession, setSelectedSession] = useState('');
 
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showModal, setShowModal] = useState(false);
 
 const [formData, setFormData] = useState({
 name: '',
 startDate: '',
 endDate: '',
 sessionId: ''
 });
 const [isCreatingSession, setIsCreatingSession] = useState(false);
 const [newSessionName, setNewSessionName] = useState('');

 useEffect(() => {
 fetchInitialData();
 }, []);

 useEffect(() => {
 if (selectedSession) {
 fetchExams(selectedSession);
 } else {
 setExams([]);
 }
 }, [selectedSession]);

 const fetchInitialData = async () => {
 try {
 setLoading(true);
 const res = await api.get('/sessions');
 const sessionList = res.data?.data || res.data || [];
 setSessions(sessionList);
 
 const current = sessionList.find(s => s.is_active);
 if (current) {
 setSelectedSession(current.id);
 setFormData(prev => ({ ...prev, sessionId: current.id }));
 } else if (sessionList.length > 0) {
 setSelectedSession(sessionList[0].id);
 setFormData(prev => ({ ...prev, sessionId: sessionList[0].id }));
 }
 } catch (err) {
 setError('Failed to load initial data.');
 } finally {
 setLoading(false);
 }
 };

 const fetchExams = async (sessionId) => {
 try {
 setLoading(true);
 const { data } = await api.get(`/exams`, { params: { session_id: sessionId } });
 setExams(data?.data || data || []);
 } catch (err) {
 setError('Failed to fetch exams.');
 } finally {
 setLoading(false);
 }
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 try {
 let finalSessionId = formData.sessionId;
 
 if (isCreatingSession && newSessionName.trim()) {
 // Auto-create the session first
 const sessionPayload = {
 name: newSessionName.trim(),
 start_date: formData.startDate || new Date().toISOString().split('T')[0],
 end_date: formData.endDate || new Date().toISOString().split('T')[0],
 is_current: true
 };
 const { data: newSessionRes } = await api.post('/sessions', sessionPayload);
 finalSessionId = newSessionRes?.data?.id || newSessionRes?.id;
 }

  const examPayload = {
    name: formData.name,
    session_id: finalSessionId
  };
  if (formData.startDate) examPayload.exam_date = formData.startDate;

  await api.post('/exams', examPayload);
 setShowModal(false);
 setFormData(prev => ({ ...prev, name: '', startDate: '', endDate: '' }));
 setNewSessionName('');
 setIsCreatingSession(false);
 fetchInitialData();
 } catch (err) {
 console.error("API Error:", err.response?.data || err.message);
 setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to create exam or session.');
 }
 };

 return (
 <div className="p-6 space-y-6">
 <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <h1 className="text-2xl font-bold flex items-center gap-3">
 <FileText className="w-6 h-6 text-purple-500" /> Exams
 </h1>
 
 <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
 <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-200">
 <Filter className="w-4 h-4 text-slate-500" />
 <select
 className="bg-transparent text-sm focus:outline-none w-full sm:w-auto"
 value={selectedSession}
 onChange={e => setSelectedSession(e.target.value)}
 >
 <option value="" disabled>Select Session</option>
 {sessions.map(s => (
 <option key={s.id} value={s.id} className="bg-white">{s.name} {s.isCurrent ? '(Current)' : ''}</option>
 ))}
 </select>
 </div>
 
 <button className="btn-primary flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center" onClick={() => setShowModal(true)}>
 <Plus className="w-4 h-4" /> Add Exam
 </button>
 </div>
 </div>

 {error && (
 <div className="bg-red-500/10 text-red-500 p-4 rounded-lg flex items-center gap-2 border border-red-500/20">
 <AlertCircle className="w-5 h-5" /> {error}
 </div>
 )}

 {loading ? (
 <div className="p-6 text-slate-500">Loading exams...</div>
 ) : (
 <div className="card overflow-x-auto">
 <table className="table w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-slate-200 bg-slate-50/50">
 <th className="p-4 font-medium text-slate-600">Exam Name</th>
 <th className="p-4 font-medium text-slate-600">Start Date</th>
 <th className="p-4 font-medium text-slate-600">End Date</th>
 <th className="p-4 font-medium text-slate-600">Status</th>
 </tr>
 </thead>
 <tbody>
 {exams.length > 0 ? (
 exams.map(exam => {
 const now = new Date();
 const start = new Date(exam.startDate);
 const end = new Date(exam.endDate);
 let status = 'Upcoming';
 let statusClass = 'bg-blue-500/20 text-blue-300';
 
 if (now > end) {
 status = 'Completed';
 statusClass = 'bg-green-500/20 text-green-300';
 } else if (now >= start && now <= end) {
 status = 'Ongoing';
 statusClass = 'bg-yellow-500/20 text-yellow-300';
 }

 return (
 <tr key={exam.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
 <td className="p-4 font-medium ">{exam.name}</td>
 <td className="p-4 text-sm text-slate-600">{start.toLocaleDateString()}</td>
 <td className="p-4 text-sm text-slate-600">{end.toLocaleDateString()}</td>
 <td className="p-4">
 <span className={`px-2 py-1 rounded text-xs font-medium ${statusClass}`}>
 {status}
 </span>
 </td>
 </tr>
 );
 })
 ) : (
 <tr>
 <td colSpan="4" className="p-8 text-center text-slate-400 italic">
 {selectedSession ? 'No exams scheduled for this session.' : 'Select a session to view exams.'}
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 )}

 {showModal && (
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="card p-6 w-full max-w-md shadow-xl border border-slate-200">
 <h2 className="text-xl font-bold mb-4 ">Add New Exam</h2>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Session</label>
 {isCreatingSession ? (
   <div className="flex items-center gap-2">
     <input
       type="text"
       className="input flex-1"
       value={newSessionName}
       onChange={e => setNewSessionName(e.target.value)}
       placeholder="e.g. 2024-2025"
       required
       autoFocus
     />
     <button type="button" onClick={() => setIsCreatingSession(false)} className="text-sm text-slate-500 hover:text-slate-700 px-2 py-1 bg-slate-100 rounded">Cancel</button>
   </div>
 ) : (
   <div className="flex items-center gap-2">
     <select
       className="input flex-1"
       value={formData.sessionId}
       onChange={e => setFormData({ ...formData, sessionId: e.target.value })}
       required
     >
       <option value="" disabled>Select Session</option>
       {sessions.map(s => (
         <option key={s.id} value={s.id}>{s.name}</option>
       ))}
     </select>
     <button type="button" onClick={() => setIsCreatingSession(true)} className="text-sm text-indigo-600 hover:text-indigo-700 font-bold px-2 py-2 bg-indigo-50 rounded-lg whitespace-nowrap">
       + New
     </button>
   </div>
 )}
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">Exam Name</label>
 <input
 type="text"
 className="input w-full"
 value={formData.name}
 onChange={e => setFormData({ ...formData, name: e.target.value })}
 required
 placeholder="e.g. Mid Term Examination"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm text-slate-500 mb-1">Start Date</label>
 <input
 type="date"
 className="input w-full"
 value={formData.startDate}
 onChange={e => setFormData({ ...formData, startDate: e.target.value })}
 required
 />
 </div>
 <div>
 <label className="block text-sm text-slate-500 mb-1">End Date</label>
 <input
 type="date"
 className="input w-full"
 value={formData.endDate}
 onChange={e => setFormData({ ...formData, endDate: e.target.value })}
 required
 />
 </div>
 </div>
 <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
 <button type="button" className="px-4 py-2 text-slate-500 hover: transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
 <button type="submit" className="btn-primary">Save Exam</button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
