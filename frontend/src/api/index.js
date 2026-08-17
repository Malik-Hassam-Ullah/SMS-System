// Named exports — individual API functions
export * from './students.api';
export * from './fees.api';
export * from './marks.api';
export * from './teachers.api';
export * from './classes.api';
export * from './subjects.api';
export * from './sessions.api';
export * from './exams.api';
export * from './attendance.api';
export * from './messages.api';
export * from './certificates.api';
export * from './audit.api';
export * from './dashboard.api';
export * from './ceo.api';


// Default export — raw axios instance so pages can do: import api from '../../api'
export { default } from '../lib/api';
