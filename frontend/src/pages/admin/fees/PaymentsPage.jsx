import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Loader2, CreditCard } from 'lucide-react';
import api from '../../../lib/api';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../../../store/auth.store';

export default function PaymentsPage() {
    const { user } = useAuthStore();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchPayments = async () => {
            setLoading(true);
            try {
                const res = await api.get('/fees/payments');
                setPayments(res.data || []);
            } catch (err) {
                console.error("Failed to fetch payments:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPayments();
    }, []);

    const filteredPayments = payments.filter(p => {
        const s = search.toLowerCase();
        return (
            p.id?.toLowerCase().includes(s) ||
            p.fee_vouchers?.voucher_number?.toLowerCase().includes(s) ||
            p.students?.full_name?.toLowerCase().includes(s)
        );
    });

    const [showDailyReportModal, setShowDailyReportModal] = useState(false);
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyReportData, setDailyReportData] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);

    const fetchDailyReport = async (date) => {
        setLoadingReport(true);
        try {
            const res = await api.get('/fees/reports/daily', { params: { date } });
            setDailyReportData(res.data);
        } catch (err) {
            console.error("Failed to fetch daily report:", err);
            alert("Failed to load daily report.");
        } finally {
            setLoadingReport(false);
        }
    };

    const handleOpenReport = () => {
        setShowDailyReportModal(true);
        fetchDailyReport(reportDate);
    };

    const exportDailyReportToExcel = () => {
        if (!dailyReportData || !dailyReportData.payments) return;

        const aoa = [
            ['Sr No.', 'V.No', 'Roll No', 'Student Name', 'Father Name', 'Class/Section', 'Total Fee', 'Received', 'Balance']
        ];

        dailyReportData.payments.forEach((p, index) => {
            const voucher = p.fee_vouchers || {};
            const student = p.students || {};
            const className = student.classes?.name || '';
            const sectionName = student.sections?.name || '';
            const classSection = sectionName ? `${className}/${sectionName}` : className;

            const totalFee = voucher.total_payable || 0;
            const received = p.amount || 0;
            const balance = received - totalFee;

            aoa.push([
                index + 1,
                voucher.voucher_number?.split('-').pop() || '',
                student.roll_number || '',
                student.full_name || '',
                student.father_name || '',
                classSection,
                totalFee,
                received,
                balance !== 0 ? balance : ''
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);

        const colWidths = [
            { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 25 }, { wch: 20 },
            { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Report');
        XLSX.writeFile(wb, `Daily_Fee_Collection_${reportDate}.xlsx`);
    };

    const downloadPDF = () => {
        if (!dailyReportData?.payments) return;

        const payments = dailyReportData.payments;
        const dateStr = new Date(dailyReportData.date).toLocaleDateString('en-GB');
        const totalCollection = dailyReportData.totalCollection || 0;

        const rows = payments.map((p, i) => {
            const voucher = p.fee_vouchers || {};
            const student = p.students || {};
            const cls = student.classes?.name || '';
            const sec = student.sections?.name || '';
            const classSection = sec ? `${cls}/${sec}` : cls;
            const totalFee = Number(voucher.total_payable || 0);
            const received = Number(p.amount || 0);
            const balance = totalFee - received;
            return `<tr>
              <td>${i + 1}</td>
              <td>${voucher.voucher_number || ''}</td>
              <td>${student.roll_number || ''}</td>
              <td style="text-align:left;padding-left:6px">${student.full_name || ''}</td>
              <td>${student.father_name || ''}</td>
              <td>${classSection}</td>
              <td>${totalFee.toLocaleString()}</td>
              <td>${received.toLocaleString()}</td>
              <td style="color:${balance > 0 ? 'red' : 'green'}">${balance !== 0 ? balance.toLocaleString() : ''}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html>
<head>
  <title>Daily Fee Collection - ${dateStr}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
    h2 { text-align: center; font-size: 14px; margin-bottom: 4px; }
    .subtitle { text-align: center; font-size: 11px; margin-bottom: 12px; color: #444; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5c518; color: #c00; font-weight: bold; border: 1px solid black; padding: 4px 6px; text-align: center; }
    td { border: 1px solid black; padding: 3px 6px; text-align: center; font-weight: 600; }
    .footer { margin-top: 10px; text-align: right; font-weight: bold; font-size: 12px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h2>${user?.school?.name || "The Smart School"} ${user?.branch?.name || "Kahuta Campus"}</h2>
  <div class="subtitle">Daily Fee Collection Report &mdash; ${dateStr}</div>
  <table>
    <thead>
      <tr>
        <th>Sr No.</th><th>V.No</th><th>Roll No</th><th>Student Name</th>
        <th>Father Name</th><th>Class/Section</th><th>Total Fee</th><th>Received</th><th>Balance</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="9" style="text-align:center;font-style:italic">No transactions found for this date.</td></tr>'}</tbody>
  </table>
  <div class="footer">Total Collection: PKR ${totalCollection.toLocaleString()}</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
        } else {
            alert('Popup blocked. Please allow popups for this site to download the PDF.');
        }
    };

    return (
        <div className="p-6">
            <div className="page-header flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold ">Fee Payments</h1>
                <button onClick={handleOpenReport} className="btn-primary flex items-center gap-2">
                    <Filter size={18} /> Daily Report
                </button>
            </div>

            <div className="card p-4 mb-6 bg-white rounded-lg border border-slate-200">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                        <input
                            type="text"
                            className="input pl-10 w-full p-2 bg-slate-50 border border-slate-200 rounded "
                            placeholder="Search by Payment ID, Voucher ID or Student..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="card overflow-x-auto bg-white rounded-lg border border-slate-200">
                <table className="table w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                            <th className="p-4">Payment ID</th>
                            <th className="p-4">Voucher ID</th>
                            <th className="p-4">Student</th>
                            <th className="p-4">Paid</th>
                            <th className="p-4">Arrears</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Method</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="8" className="text-center p-8 text-slate-500">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                                    Loading payments...
                                </td>
                            </tr>
                        ) : filteredPayments.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="text-center p-8 text-slate-500">
                                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    No fee payments recorded yet.
                                </td>
                            </tr>
                        ) : (
                            filteredPayments.map(p => {
                                const totalPayable = Number(p.fee_vouchers?.total_payable || 0);
                                const amountPaid = Number(p.fee_vouchers?.amount_paid || 0);
                                const arrears = Math.max(0, totalPayable - amountPaid);
                                return (
                                    <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-mono text-xs text-slate-500">{p.id?.slice(0, 8)}…</td>
                                        <td className="p-4 font-medium text-blue-600">{p.fee_vouchers?.voucher_number || 'N/A'}</td>
                                        <td className="p-4 text-slate-600 font-medium">{p.students?.full_name || 'N/A'}</td>
                                        <td className="p-4 text-emerald-600 font-bold">PKR {p.amount?.toLocaleString()}</td>
                                        <td className="p-4 font-bold">
                                            {totalPayable > 0
                                                ? arrears > 0
                                                    ? <span className="text-rose-600 font-bold">PKR {arrears.toLocaleString()}</span>
                                                    : <span className="text-emerald-600 font-semibold">Cleared</span>
                                                : <span className="text-slate-400">—</span>
                                            }
                                        </td>
                                        <td className="p-4 text-slate-600">{new Date(p.payment_date).toLocaleDateString()}</td>
                                        <td className="p-4 text-slate-600 capitalize">{p.payment_method?.replace('_', ' ')}</td>
                                        <td className="p-4">
                                            <span className={`badge px-2.5 py-1 rounded-full text-xs font-semibold ${p.fee_vouchers?.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                                p.fee_vouchers?.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                                                    'bg-slate-100 text-slate-800'
                                                }`}>
                                                {p.fee_vouchers?.status === 'partial' ? 'PARTIAL PAID' : (p.fee_vouchers?.status || 'UNPAID').toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Daily Report Modal */}
            {showDailyReportModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 w-full max-w-2xl rounded-xl shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Daily Collection Report</h2>
                            <div className="flex gap-2 print:hidden">
                                <button onClick={exportDailyReportToExcel} className="btn-secondary flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors">
                                    <Download size={18} /> Export Excel
                                </button>
                                <button onClick={downloadPDF} className="btn-secondary flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors">
                                    <Download size={18} /> Download PDF
                                </button>
                            </div>
                        </div>

                        <div className="mb-6 print:hidden">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Select Date</label>
                            <input
                                type="date"
                                className="input w-full max-w-xs"
                                value={reportDate}
                                onChange={e => {
                                    setReportDate(e.target.value);
                                    fetchDailyReport(e.target.value);
                                }}
                            />
                        </div>

                        {loadingReport ? (
                            <div className="py-12 text-center">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
                                <p className="text-slate-500">Loading report...</p>
                            </div>
                        ) : dailyReportData && dailyReportData.payments ? (
                            <div id="daily-report-print-section" className="print-section bg-white p-4">
                                <div className="flex justify-end mb-2 font-bold text-sm">
                                    <span>Date: {new Date(dailyReportData.date).toLocaleDateString('en-GB')}</span>
                                </div>

                                <table className="w-full text-center text-[11px] border-collapse border border-black">
                                    <thead>
                                        <tr className="bg-yellow-300 text-red-600 font-bold border border-black">
                                            <th className="border border-black p-1">Sr No.</th>
                                            <th className="border border-black p-1">V.No</th>
                                            <th className="border border-black p-1">Roll No</th>
                                            <th className="border border-black p-1">Student Name</th>
                                            <th className="border border-black p-1">Father Name</th>
                                            <th className="border border-black p-1">Class/Section</th>
                                            <th className="border border-black p-1">Total Fee</th>
                                            <th className="border border-black p-1">Received</th>
                                            <th className="border border-black p-1">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dailyReportData.payments?.map((p, i) => {
                                            const voucher = p.fee_vouchers || {};
                                            const student = p.students || {};
                                            const className = student.classes?.name || '';
                                            const sectionName = student.sections?.name || '';
                                            const classSection = sectionName ? `${className}/${sectionName}` : className;

                                            const totalFee = Number(voucher.total_payable || 0);
                                            const received = Number(p.amount || 0);
                                            const balance = totalFee - received;

                                            return (
                                                <tr key={i} className="border border-black font-semibold">
                                                    <td className="border border-black p-1">{i + 1}</td>
                                                    <td className="border border-black p-1">{voucher.voucher_number?.split('-').pop()}</td>
                                                    <td className="border border-black p-1">{student.roll_number}</td>
                                                    <td className="border border-black p-1 text-left px-2">{student.full_name}</td>
                                                    <td className="border border-black p-1">{student.father_name}</td>
                                                    <td className="border border-black p-1">{classSection}</td>
                                                    <td className="border border-black p-1">{totalFee}</td>
                                                    <td className="border border-black p-1">{received}</td>
                                                    <td className={`border border-black p-1 ${balance < 0 ? 'text-red-600' : ''}`}>
                                                        {balance !== 0 ? balance : ''}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {(!dailyReportData.payments || dailyReportData.payments.length === 0) && (
                                            <tr>
                                                <td colSpan="9" className="border border-black p-4 text-center text-slate-500 italic">No transactions found for this date.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}

                        <div className="flex justify-end pt-6 mt-6 border-t border-slate-100 print:hidden">
                            <button
                                onClick={() => setShowDailyReportModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
