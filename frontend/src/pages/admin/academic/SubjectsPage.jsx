import React, { useState, useEffect } from 'react';
import { Plus, Edit, Book, AlertCircle } from 'lucide-react';
import api from '@/api';

export default function SubjectsPage() {
 const [subjects, setSubjects] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showModal, setShowModal] = useState(false);
 
 const [isEditing, setIsEditing] = useState(false);
 const [editId, setEditId] = useState(null);
 
 const [formData, setFormData] = useState({
 code: '',
 name: '',
 type: 'Core'
 });

 useEffect(() => {
 fetchSubjects();
 }, []);

 const fetchSubjects = async () => {
 try {
 setLoading(true);
 const { data } = await api.get('/academic/subjects');
 setSubjects(data || []);
 } catch (err) {
 setError('Failed to fetch subjects.');
 } finally {
 setLoading(false);
 }
 };

 const handleOpenAdd = () => {
 setIsEditing(false);
 setEditId(null);
 setFormData({ code: '', name: '', type: 'Core' });
 setShowModal(true);
 };

 const handleOpenEdit = (subject) => {
 setIsEditing(true);
 setEditId(subject.id);
 setFormData({ code: subject.code, name: subject.name, type: subject.type });
 setShowModal(true);
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 try {
 if (isEditing) {
 await api.put(`/academic/subjects/${editId}`, formData);
 } else {
 await api.post('/academic/subjects', formData);
 }
 setShowModal(false);
 fetchSubjects();
 } catch (err) {
 setError('Failed to save subject.');
 }
 };

 if (loading) return <div className="p-6 text-slate-500">Loading subjects...</div>;

 return (
 <div className="p-6 space-y-6">
 <div className="page-header flex justify-between items-center">
 <h1 className="text-2xl font-bold flex items-center gap-3">
 <Book className="w-6 h-6 text-indigo-500" /> Subjects
 </h1>
 <button className="btn-primary flex items-center gap-2" onClick={handleOpenAdd}>
 <Plus className="w-4 h-4" /> Add Subject
 </button>
 </div>

 {error && (
 <div className="bg-red-500/10 text-red-500 p-4 rounded-lg flex items-center gap-2 border border-red-500/20">
 <AlertCircle className="w-5 h-5" /> {error}
 </div>
 )}

 <div className="card overflow-x-auto">
 <table className="table w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-slate-200 bg-slate-50/50">
 <th className="p-4 font-medium text-slate-600">Code</th>
 <th className="p-4 font-medium text-slate-600">Subject Name</th>
 <th className="p-4 font-medium text-slate-600">Type</th>
 <th className="p-4 font-medium text-slate-600 text-right">Actions</th>
 </tr>
 </thead>
 <tbody>
 {subjects.length > 0 ? (
 subjects.map(subject => (
 <tr key={subject.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
 <td className="p-4 font-mono text-sm text-slate-600">{subject.code}</td>
 <td className="p-4 font-medium ">{subject.name}</td>
 <td className="p-4">
 <span className={`px-2 py-1 rounded text-xs font-medium ${
 subject.type === 'Core' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-500/20 text-slate-600'
 }`}>
 {subject.type}
 </span>
 </td>
 <td className="p-4 text-right">
 <button
 onClick={() => handleOpenEdit(subject)}
 className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors inline-flex items-center"
 title="Edit Subject"
 >
 <Edit className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan="4" className="p-8 text-center text-slate-400 italic">
 No subjects defined yet.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {showModal && (
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="card p-6 w-full max-w-md shadow-xl border border-slate-200">
 <h2 className="text-xl font-bold mb-4 ">
 {isEditing ? 'Edit Subject' : 'Add New Subject'}
 </h2>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm text-slate-500 mb-1">Subject Code</label>
 <input
 type="text"
 className="input w-full font-mono"
 value={formData.code}
 onChange={e => setFormData({ ...formData, code: e.target.value })}
 required
 placeholder="e.g. MAT101"
 />
 </div>
 <div>
 <label className="block text-sm text-slate-500 mb-1">Subject Name</label>
 <input
 type="text"
 className="input w-full"
 value={formData.name}
 onChange={e => setFormData({ ...formData, name: e.target.value })}
 required
 placeholder="e.g. Mathematics"
 />
 </div>
 <div>
 <label className="block text-sm text-slate-500 mb-1">Type</label>
 <select
 className="input w-full"
 value={formData.type}
 onChange={e => setFormData({ ...formData, type: e.target.value })}
 >
 <option value="Core">Core</option>
 <option value="Elective">Elective</option>
 <option value="Extracurricular">Extracurricular</option>
 </select>
 </div>
 <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
 <button type="button" className="px-4 py-2 text-slate-500 hover: transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
 <button type="submit" className="btn-primary">
 {isEditing ? 'Update Subject' : 'Save Subject'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
