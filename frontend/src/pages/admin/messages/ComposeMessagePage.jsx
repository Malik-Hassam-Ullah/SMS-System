import React, { useState, useEffect } from 'react';
import { Send, Users, ArrowLeft, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';

const ComposeMessagePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialClass = searchParams.get('class') || '';
  const initialSection = searchParams.get('section') || '';

  const [formData, setFormData] = useState({
    recipientType: initialClass ? 'class' : 'all',
    classId: initialClass,
    sectionId: initialSection,
    subject: '',
    message: '',
    type: 'sms'
  });

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [cls, sec] = await Promise.all([
          api.get('/classes').catch(() => ({ data: [] })),
          api.get('/classes/sections/all').catch(() => ({ data: [] }))
        ]);
        setClasses(cls.data || []);
        setSections(sec.data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchLookups();
  }, []);

  const availableSections = formData.classId
    ? sections.filter(s => s.class_id === formData.classId)
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const recipient_filter = {};
      if (formData.recipientType === 'class') {
        recipient_filter.class_id = formData.classId;
        if (formData.sectionId) recipient_filter.section_id = formData.sectionId;
      }

      // 1. Create Message
      const createRes = await api.post('/messages', {
        subject: formData.subject,
        body: formData.message,
        message_type: formData.type,
        recipient_type: formData.recipientType,
        recipient_filter
      });

      const msgId = createRes.data?.data?.id;
      if (!msgId) throw new Error("Failed to create message draft");

      // 2. Send Message (Server handles pushing to recipients and marking as sent)
      await api.post(`/messages/${msgId}/send`);

      navigate('/admin/messages');
    } catch (err) {
      console.error('Failed to send message', err);
      setError(err.response?.data?.message || 'An error occurred while sending the message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset section if class changes
      ...(name === 'classId' && { sectionId: '' })
    }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4">
        <Link to={initialClass ? -1 : "/admin/messages"} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Send className="h-6 w-6 text-blue-500" /> Compose Message
          </h1>
          <p className="text-slate-500 text-sm mt-1">Send bulk messages to students</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Message Platform
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="input w-full bg-slate-50 border-slate-200"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="push">Push Notification</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Recipients
            </label>
            <select
              name="recipientType"
              value={formData.recipientType}
              onChange={handleChange}
              className="input w-full bg-slate-50 border-slate-200"
            >
              <option value="all">All Students</option>
              <option value="class">Specific Class</option>
            </select>
          </div>

          {formData.recipientType === 'class' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Select Class <span className="text-rose-500">*</span></label>
                <select
                  name="classId"
                  value={formData.classId}
                  onChange={handleChange}
                  className="input w-full"
                  required
                >
                  <option value="">Select Class...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Select Section (Optional)</label>
                <select
                  name="sectionId"
                  value={formData.sectionId}
                  onChange={handleChange}
                  className="input w-full"
                  disabled={!formData.classId}
                >
                  <option value="">All Sections</option>
                  {availableSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Subject / Title</label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="e.g. Important Notice Regarding Upcoming Exams"
            className="input w-full"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Message Content</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Type your message here..."
            className="input w-full min-h-[160px] resize-y"
            required
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-bold mb-1">Notice</p>
            <p className="text-blue-700">This action will dispatch messages immediately and cannot be undone. Currently, messages are logged internally and real SMS/Email dispatching will be added later.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Link to={initialClass ? -1 : "/admin/messages"} className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || (formData.recipientType === 'class' && !formData.classId)}
            className="btn-primary flex items-center gap-2 px-8 py-2.5 text-base"
          >
            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
            {isSubmitting ? 'Dispatching...' : 'Send Message'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ComposeMessagePage;
