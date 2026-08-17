import React, { useState, useEffect } from 'react';
import { Mail, Search, Plus, Calendar, User, Eye, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/api';

const MessagesPage = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await api.get('/messages');
            // Backend returns: { success: true, data: [...] }
            // Axios interceptor unwraps it to: res.data = [...]
            setMessages(res.data || res || []);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const filteredMessages = messages.filter(msg =>
        (msg.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (msg.recipient_type || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 p-6">
            <div className="page-header flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Mail className="h-6 w-6 text-blue-500" />
                        Messages
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">View and manage all sent messages</p>
                </div>
                <Link to="/admin/messages/compose" className="btn-primary flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold">
                    <Plus className="h-4 w-4" />
                    Compose Message
                </Link>
            </div>

            <div className="card bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            className="input w-full pl-10 border border-slate-200 rounded-lg py-2 focus:outline-none focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-500 border-b border-slate-200 text-xs uppercase bg-slate-50">
                                <th className="p-3 font-semibold">Subject</th>
                                <th className="p-3 font-semibold">Platform</th>
                                <th className="p-3 font-semibold">Recipients</th>
                                <th className="p-3 font-semibold">Sender</th>
                                <th className="p-3 font-semibold">Date</th>
                                <th className="p-3 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                                        Loading messages...
                                    </td>
                                </tr>
                            ) : filteredMessages.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        No messages found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredMessages.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3">
                                            <div className="font-semibold text-slate-800">{msg.subject}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-xs">{msg.body}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="badge bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">
                                                {msg.message_type}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <User className="h-4 w-4 text-slate-400" />
                                                <span className="capitalize">{msg.recipient_type}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-slate-600">
                                            {msg.sent_by_user?.full_name || 'System'}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                {new Date(msg.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`badge px-2.5 py-1 rounded-full text-xs font-semibold ${msg.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {msg.status.toUpperCase()}
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

export default MessagesPage;
