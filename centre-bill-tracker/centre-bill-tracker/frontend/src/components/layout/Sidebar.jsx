import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    ),
  },
  {
    to: '/centres',
    label: 'Centres',
    adminOnly: true, // SRD section 2: Operations has no Centre Management permission
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m-1 4h1m4-4h1m-1 4h1m-6 8v-4a2 2 0 012-2 2 2 0 012 2v4" />
      </svg>
    ),
  },
  {
    to: '/bills',
    label: 'Bills',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
      </svg>
    ),
  },
  { to: '/finance?section=payments', label: 'Payment Tracker', icon: <span className="text-sm font-bold">₹</span> },
  { to: '/finance?section=invoices', label: 'Invoice Uploads', icon: <span className="text-sm">▤</span> },
  { to: '/finance?section=reports', label: 'Finance Reports', icon: <span className="text-sm">▥</span> },
  { to: '/finance?section=tds', label: 'TDS & Reconciliation', icon: <span className="text-sm">%</span> },
  { to: '/finance?section=amortization', label: 'Amortization', icon: <span className="text-sm">◷</span> },
  { to: '/finance?section=approvals', label: 'Approvals', icon: <span className="text-sm">✓</span> },
  { to: '/finance?section=audit', label: 'Audit Logs', adminOnly: true, icon: <span className="text-sm">≡</span> },
];

export default function Sidebar({ isOpen,...[truncated]