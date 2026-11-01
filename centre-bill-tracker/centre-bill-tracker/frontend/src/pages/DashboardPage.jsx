import { useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import Alert from '../components/common/Alert';
import SummaryCard from '../components/dashboard/SummaryCard';
import LatestBillsTable from '../components/dashboard/LatestBillsTable';
import * as dashboardApi from '../api/dashboard.api';

const ICONS = {
  centres: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m-1 4h1m4-4h1m-1 4h1" />
    </svg>
  ),
  received: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  pending: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  dueSoon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  overdue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [latestBills, setLatestBills] = useState([]);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingBills, setIsLoadingBills] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setError('');
      try {
        const [summaryData, billsData, financeData] = await Promise.all([
          dashboardApi.getSummary().finally(() => setIsLoadingSummary(false)),
          dashboardApi.getLatestBills().finally(() => setIsLoadingBills(false)),
          dashboardApi.getFinanceSummary(),
        ]);
        setSummary(summaryData);
        setLatestBills(billsData);
        setFinanceSummary(financeData);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.');
      }
    };
    load();
  }, []);

  const hasOverdue = summary?.overdueBills > 0;

  return (
    <AppLayout title="Dashboard">
      <div className="mb-4">
        <Alert variant="error">{error}</Alert>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Total Centres" value={summary?.totalCentres ?? 0} tone="neutral" icon={ICONS.centres} isLoading={isLoadingSummary} />
        <SummaryCard label="Bills Received" value={summary?.billsReceived ?? 0} tone="received" icon={ICONS.received} isLoading={isLoadingSummary} />
        <SummaryCard label="Bills Pending" value={summary?.billsPending ?? 0} tone="pending" icon={ICONS.pending} isLoading={isLoadingSummary} />
        <SummaryCard label="Due in Next 7 Days" value={summary?.dueInSevenDays ?? 0} tone="dueSoon" icon={ICONS.dueSoon} isLoading={isLoadingSummary} />
        <SummaryCard
          label={(
            <span className="inline-flex items-center gap-1.5">
              Overdue Bills
              {hasOverdue && <span className="h-1.5 w-1.5 rounded-full bg-status-overdue" aria-hidden="true" />}
            </span>
          )}
          value={summary?.overdueBills ?? 0}
          tone="overdue"
          icon={ICONS.overdue}
          isLoading={isLoadingSummary}
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-base font-semibold text-ink-900">Finance Overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Outstanding Balance" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(financeSummary?.totalOutstanding ?? 0)} tone="pending" icon={ICONS.pending} isLoading={!financeSummary} />
          <SummaryCard label="Bank Payments Recorded" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(financeSummary?.totalBankPaid ?? 0)} tone="received" icon={ICONS.received} isLoading={!financeSummary} />
          <SummaryCard label="TDS Withheld" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(financeSummary?.totalTdsWithheld ?? 0)} tone="neutral" icon={ICONS.received} isLoading={!financeSummary} />
          <SummaryCard label="Bills Awaiting Approval" value={financeSummary?.awaitingApproval ?? 0} tone="dueSoon" icon={ICONS.dueSoon} isLoading={!financeSummary} />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-base font-semibold text-ink-900">Latest Bills</h2>
        <LatestBillsTable bills={latestBills} isLoading={isLoadingBills} />
      </div>
    </AppLayout>
  );
}
