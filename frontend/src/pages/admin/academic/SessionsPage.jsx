import React, { useState, useEffect } from 'react';
import { Plus, Calendar, CheckCircle, AlertCircle, CalendarCheck } from 'lucide-react';
import api from '@/api';

export default function SessionsPage() {
 const [sessions, setSessions] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showModal, setShowModal] = useState(false);
 
 const [formData, setFormData] = useState({
 name: '',
 startDate: '',
 endDate: ''
 });

 useEffect(() => {
 fetchSessions();
 }, []);

 const fetchSessions = async () => {
 try {
 setLoading(true);
 const { data } = await api.get('/academic/sessions');
 setSessions(data || []);
 } catch (err) {
 setError('Failed to fetch academic sessions.');
 } finally {
 setLoading(false);
 }
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 try {
 await api.post('/academic/sessions', formData);
 setShowModal(false);
 setFormData({ name: '', startDate: '', endDate: '' });
 fetchSessions();
 } catch (err) {
 setError('Failed to create session.');
 }
 };

 const handleSetCurrent = async (id) => {
 try {
 await api.put(`/academic/sessions/${id}/current`);
 fetchSessions();
 } catch (err) {
 setError('Failed to update current session status.');
 }
 };

 if (loading) return <div className="p-6 text-slate-500">Loading sessions...</div>;

 return (
 <div className="p-6 space-y-6">
 <div className="page-header flex justify-between items-center">
 <h1 className="text-2xl font-bold flex items-center gap-3">
 <Calendar className="w-6 h-6 text-green-500" /> Academic Sessions
 </h1>
 <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
 <Plus className="w-4 h-4" /> Add Session
 </button>
 </div>

 {error && (
 <div className="bg-red-500/10 text-red-500 p-4 rounded-lg flex items-center gap-2 border border-red-500/20">
 <AlertCircle className="w-5 h-5" /> {error}
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {sessions.length > 0 ? (
 sessions.map(session => (
 <div key={session.id} className={`card p-5 border-t-4 flex flex-col ${session.isCurrent ? 'border-t-green-500 bg-green-500/5' : 'border-t-gray-600'}`}>
 <div className="flex justify-between items-start mb-4">
 <div>
 <h3 className="text-xl font-bold ">{session.name}</h3>
 <p className="text-sm text-slate-500 mt-1">
 {new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}
 </p>
 </div>
 {session.isCurrent && (
 <span className="badge-success px-2 py-1 rounded text-xs flex items-center gap-1 font-medium bg-green-500/20 text-green-400">
 <CheckCircle className="w-3 h-3" /> Current
 </span>
 )}
 </div>
 
 <div className="mt-auto pt-4 border-t border-slate-200 flex justify-end">
 {!session.isCurrent ? (
 <button 
 onClick={() => handleSetCurrent(session.id)}
 className="text-sm px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-600 hover: transition-colors flex items-center gap-2 border border-slate-200"
 >
 <CalendarCheck className="w-4 h-4" /> Set as Current
 </button>
 ) : (
 <span className="text-sm text-green-500/70 italic flex items-center gap-1">
 Active Session
 </span>
 )}
 </div>
 </div>
 ))
 ) : (
 <div className="col-span-full card p-8 text-center text-slate-400 border-dashed border-2 border-slate-200">
 No academic sessions found. Create one to start managing the school year.
 </div>
 )}
 </div>

 {showModal && (
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="card p-6 w-full max-w-md shadow-xl border border-slate-200">
 <h2 className="text-xl font-bold mb-4 ">Add Academic Session</h2>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm text-slate-500 mb-1">Session Name / Year</label>
 <input
 type="text"
 className="input w-full"
 value={formData.name}
 onChange={e => setFormData({ ...formData, name: e.target.value })}
 required
 placeholder="e.g. 2023-2024"
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
 <button type="submit" className="btn-primary">Save Session</button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
