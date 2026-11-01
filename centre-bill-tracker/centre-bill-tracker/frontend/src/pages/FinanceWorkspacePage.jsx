import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import BillFinancePanel from '../components/bill/BillFinancePanel';
import * as billApi from '../api/bill.api';
import * as phase2Api from '../api/phase2.api';
import { useAuth } from '../context/AuthContext';

const SECTIONS = [
  ['payments', 'Payment Tracker'], ['invoices', 'Invoice Uploads'], ['reports', 'Finance Reports'],
  ['tds', 'TDS & Reconciliation'], ['amortization', 'Amortization'], ['approvals', 'Approvals'], ['audit', 'Audit Logs'],
];
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));

export default function FinanceWorkspacePage() {
  const [params, setParams] = useSearchParams();
  const section = params.get('section') || 'payments';
  const { isAdmin } = useAuth();
  const [bills, setBills] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');
  const activeTitle = SECTIONS.find(([key]) => key === section)?.[1] || 'Payment Tracker';

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    billApi.getBills().then((data) => {
      if (!active) return;
      setBills(data);
      setSelectedId((current) => current || String(data[0]?.id || ''));
    }).catch((err) => { if (active) setError(err.message || 'Could not load bills.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (section !== 'reports') return;
    let active = true;
    ph...[truncated]