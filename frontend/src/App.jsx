import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import ThemeProvider from './components/ThemeProvider';

// ─── Lazy load ALL pages ────────────────────────────────────────
// Auth
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const PublicVoucherPage = lazy(() => import('./pages/public/PublicVoucherPage'));

// Layout
const AppLayout = lazy(() => import('./components/layout/AppLayout'));

// CEO
const CeoDashboard = lazy(() => import('./pages/ceo/CeoDashboard'));
const BranchesPage = lazy(() => import('./pages/ceo/BranchesPage'));
const CreateAdminPage = lazy(() => import('./pages/ceo/CreateAdminPage'));
const CeoPayrollPage = lazy(() => import('./pages/ceo/CeoPayrollPage'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const StudentsPage = lazy(() => import('./pages/admin/students/StudentsPage'));
const StudentDetailPage = lazy(() => import('./pages/admin/students/StudentDetailPage'));
const AddStudentPage = lazy(() => import('./pages/admin/students/AddStudentPage'));
const EditStudentPage = lazy(() => import('./pages/admin/students/EditStudentPage'));
const ImportStudentsPage = lazy(() => import('./pages/admin/students/ImportStudentsPage'));
const TeachersPage = lazy(() => import('./pages/admin/teachers/TeachersPage'));
const TeacherDetailPage = lazy(() => import('./pages/admin/teachers/TeacherDetailPage'));
const ClassesPage = lazy(() => import('./pages/admin/academic/ClassesPage'));
const SectionDetailsPage = lazy(() => import('./pages/admin/academic/SectionDetailsPage'));
const SubjectsPage = lazy(() => import('./pages/admin/academic/SubjectsPage'));
const SessionsPage = lazy(() => import('./pages/admin/academic/SessionsPage'));
const ExamsPage = lazy(() => import('./pages/admin/academic/ExamsPage'));
const MarksViewPage = lazy(() => import('./pages/admin/marks/MarksViewPage'));
const AttendancePage = lazy(() => import('./pages/admin/attendance/AttendancePage'));
const StaffAttendancePage = lazy(() => import('./pages/admin/attendance/StaffAttendancePage'));
const VouchersPage = lazy(() => import('./pages/admin/fees/VouchersPage'));
const GenerateVoucherPage = lazy(() => import('./pages/admin/fees/GenerateVoucherPage'));
const CollectFeePage = lazy(() => import('./pages/admin/fees/CollectFeePage'));
const VoucherDetailPage = lazy(() => import('./pages/admin/fees/VoucherDetailPage'));
const PaymentsPage = lazy(() => import('./pages/admin/fees/PaymentsPage'));
const OutstandingPage = lazy(() => import('./pages/admin/fees/OutstandingPage'));
const FeeReportsPage = lazy(() => import('./pages/admin/fees/FeeReportsPage'));
const FeeStructuresPage = lazy(() => import('./pages/admin/fees/FeeStructuresPage'));
const MessagesPage = lazy(() => import('./pages/admin/messages/MessagesPage'));
const ComposeMessagePage = lazy(() => import('./pages/admin/messages/ComposeMessagePage'));
const WhatsAppSettingsPage = lazy(() => import('./pages/admin/WhatsAppSettingsPage'));
const CertificatesPage = lazy(() => import('./pages/admin/certificates/CertificatesPage'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));

// Accountant
const AccountantDashboard = lazy(() => import('./pages/accountant/AccountantDashboard'));
const AccountantStudentsPage = lazy(() => import('./pages/accountant/AccountantStudentsPage'));
const AccountantVouchersPage = lazy(() => import('./pages/accountant/fees/AccountantVouchersPage'));
const AccountantPaymentsPage = lazy(() => import('./pages/accountant/fees/AccountantPaymentsPage'));
const AccountantOutstandingPage = lazy(() => import('./pages/accountant/fees/AccountantOutstandingPage'));
const AccountantReportsPage = lazy(() => import('./pages/accountant/fees/AccountantReportsPage'));

// Teacher
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const MarksEntryPage = lazy(() => import('./pages/teacher/MarksEntryPage'));
const TeacherMarksReport = lazy(() => import('./pages/teacher/TeacherMarksReport'));
const TeacherAttendance = lazy(() => import('./pages/teacher/TeacherAttendance'));

// ─── Loading fallback ───────────────────────────────────────────
const PageLoader = () => (
    <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
    </div>
);

// ─── Error Boundary ─────────────────────────────────────────────
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-screen bg-slate-50">
                    <div className="card max-w-md w-full text-center">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h2>
                        <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3 text-left font-mono mb-4 break-all">
                            {this.state.error?.message || 'Unknown error'}
                        </p>
                        <button
                            className="btn-primary"
                            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/login'; }}
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// ─── Route Guards ───────────────────────────────────────────────
const ProtectedRoute = ({ children, roles }) => {
    const { user, token } = useAuthStore();
    if (!token || !user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}/dashboard`} replace />;
    return children;
};

const PublicRoute = ({ children }) => {
    const { token, user } = useAuthStore();
    if (token && user) return <Navigate to={`/${user.role}/dashboard`} replace />;
    return children;
};

// ─── App ────────────────────────────────────────────────────────
export default function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* Public */}
                        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
                        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
                        <Route path="/public/vouchers/:id" element={<PublicVoucherPage />} />

                        {/* CEO */}
                        <Route path="/ceo" element={
                            <ProtectedRoute roles={['ceo']}>
                                <Suspense fallback={<PageLoader />}><AppLayout /></Suspense>
                            </ProtectedRoute>
                        }>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><CeoDashboard /></Suspense>} />
                            <Route path="branches" element={<Suspense fallback={<PageLoader />}><BranchesPage /></Suspense>} />
                            <Route path="create-admin" element={<Suspense fallback={<PageLoader />}><CreateAdminPage /></Suspense>} />
                            <Route path="teachers" element={<Suspense fallback={<PageLoader />}><TeachersPage /></Suspense>} />
                            <Route path="teachers/:id" element={<Suspense fallback={<PageLoader />}><TeacherDetailPage /></Suspense>} />
                            <Route path="payroll" element={<Suspense fallback={<PageLoader />}><CeoPayrollPage /></Suspense>} />
                            <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
                        </Route>

                        {/* Admin */}
                        <Route path="/admin" element={
                            <ProtectedRoute roles={['admin']}>
                                <Suspense fallback={<PageLoader />}><AppLayout /></Suspense>
                            </ProtectedRoute>
                        }>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
                            <Route path="students" element={<Suspense fallback={<PageLoader />}><StudentsPage /></Suspense>} />
                            <Route path="students/new" element={<Suspense fallback={<PageLoader />}><AddStudentPage /></Suspense>} />
                            <Route path="students/import" element={<Suspense fallback={<PageLoader />}><ImportStudentsPage /></Suspense>} />
                            <Route path="students/:id/edit" element={<Suspense fallback={<PageLoader />}><EditStudentPage /></Suspense>} />
                            <Route path="students/:id" element={<Suspense fallback={<PageLoader />}><StudentDetailPage /></Suspense>} />
                            <Route path="teachers" element={<Suspense fallback={<PageLoader />}><TeachersPage /></Suspense>} />
                            <Route path="teachers/:id" element={<Suspense fallback={<PageLoader />}><TeacherDetailPage /></Suspense>} />
                            <Route path="academic/classes" element={<Suspense fallback={<PageLoader />}><ClassesPage /></Suspense>} />
                            <Route path="classes/:classId/sections/:sectionId" element={<Suspense fallback={<PageLoader />}><SectionDetailsPage /></Suspense>} />
                            <Route path="academic/subjects" element={<Suspense fallback={<PageLoader />}><SubjectsPage /></Suspense>} />
                            <Route path="academic/sessions" element={<Suspense fallback={<PageLoader />}><SessionsPage /></Suspense>} />
                            <Route path="academic/exams" element={<Suspense fallback={<PageLoader />}><ExamsPage /></Suspense>} />
                            <Route path="marks" element={<Suspense fallback={<PageLoader />}><MarksViewPage /></Suspense>} />
                            <Route path="attendance" element={<Suspense fallback={<PageLoader />}><AttendancePage /></Suspense>} />
                            <Route path="staff-attendance" element={<Suspense fallback={<PageLoader />}><StaffAttendancePage /></Suspense>} />
                            <Route path="fees/vouchers" element={<Suspense fallback={<PageLoader />}><VouchersPage /></Suspense>} />
                            <Route path="fees/vouchers/generate" element={<Suspense fallback={<PageLoader />}><GenerateVoucherPage /></Suspense>} />
                            <Route path="fees/collect" element={<Suspense fallback={<PageLoader />}><CollectFeePage /></Suspense>} />
                            <Route path="fees/vouchers/:id" element={<Suspense fallback={<PageLoader />}><VoucherDetailPage /></Suspense>} />
                            <Route path="fees/payments" element={<Suspense fallback={<PageLoader />}><PaymentsPage /></Suspense>} />
                            <Route path="fees/outstanding" element={<Suspense fallback={<PageLoader />}><OutstandingPage /></Suspense>} />
                            <Route path="fees/reports" element={<Suspense fallback={<PageLoader />}><FeeReportsPage /></Suspense>} />
                            <Route path="fees/structures" element={<Suspense fallback={<PageLoader />}><FeeStructuresPage /></Suspense>} />
                            <Route path="messages" element={<Suspense fallback={<PageLoader />}><MessagesPage /></Suspense>} />
                            <Route path="messages/compose" element={<Suspense fallback={<PageLoader />}><ComposeMessagePage /></Suspense>} />
                            <Route path="whatsapp-settings" element={<Suspense fallback={<PageLoader />}><WhatsAppSettingsPage /></Suspense>} />
                            <Route path="certificates" element={<Suspense fallback={<PageLoader />}><CertificatesPage /></Suspense>} />
                            <Route path="audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogsPage /></Suspense>} />
                            <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
                        </Route>

                        {/* Accountant */}
                        <Route path="/accountant" element={
                            <ProtectedRoute roles={['accountant']}>
                                <Suspense fallback={<PageLoader />}><AppLayout /></Suspense>
                            </ProtectedRoute>
                        }>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><AccountantDashboard /></Suspense>} />
                            <Route path="students" element={<Suspense fallback={<PageLoader />}><AccountantStudentsPage /></Suspense>} />
                            <Route path="fees/vouchers" element={<Suspense fallback={<PageLoader />}><AccountantVouchersPage /></Suspense>} />
                            <Route path="fees/payments" element={<Suspense fallback={<PageLoader />}><AccountantPaymentsPage /></Suspense>} />
                            <Route path="fees/outstanding" element={<Suspense fallback={<PageLoader />}><AccountantOutstandingPage /></Suspense>} />
                            <Route path="fees/reports" element={<Suspense fallback={<PageLoader />}><AccountantReportsPage /></Suspense>} />
                            <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
                        </Route>

                        {/* Teacher */}
                        <Route path="/teacher" element={
                            <ProtectedRoute roles={['teacher']}>
                                <Suspense fallback={<PageLoader />}><AppLayout /></Suspense>
                            </ProtectedRoute>
                        }>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><TeacherDashboard /></Suspense>} />
                            <Route path="marks/entry" element={<Suspense fallback={<PageLoader />}><MarksEntryPage /></Suspense>} />
                            <Route path="marks/report" element={<Suspense fallback={<PageLoader />}><TeacherMarksReport /></Suspense>} />
                            <Route path="attendance" element={<Suspense fallback={<PageLoader />}><TeacherAttendance /></Suspense>} />
                            <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
                        </Route>

                        {/* Fallback */}
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </Suspense>
            </ThemeProvider>
        </ErrorBoundary>
    );
}
