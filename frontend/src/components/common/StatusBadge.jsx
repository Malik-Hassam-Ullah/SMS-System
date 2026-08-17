import React from 'react';

export default function StatusBadge({ status, className = '' }) {
 if (!status) return null;
 
 const s = status.toString().toLowerCase();
 let badgeClass = 'badge-default';

 switch (s) {
 case 'paid':
 case 'present':
 case 'active':
 case 'sent':
 badgeClass = 'badge-success';
 break;
 case 'unpaid':
 case 'late':
 case 'warning':
 badgeClass = 'badge-warning';
 break;
 case 'overdue':
 case 'absent':
 case 'inactive':
 case 'failed':
 badgeClass = 'badge-danger';
 break;
 case 'partial':
 case 'leave':
 case 'leaving':
 case 'info':
 badgeClass = 'badge-info';
 break;
 case 'character':
 case 'primary':
 badgeClass = 'badge-primary';
 break;
 default:
 badgeClass = 'badge-default';
 }

 const label = s.charAt(0).toUpperCase() + s.slice(1);

 return (
 <span className={`${badgeClass} ${className}`}>
 {label}
 </span>
 );
}
