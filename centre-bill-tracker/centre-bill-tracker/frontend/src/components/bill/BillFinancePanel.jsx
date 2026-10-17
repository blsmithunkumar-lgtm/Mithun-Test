import { useCallback, useEffect, useState } from 'react';
import Button from '../common/Button';
import Alert from '../common/Alert';
import * as phase2Api from '../../api/phase2.api';

const CATEGORIES = ['Base Amount', 'Internet', 'Static IP', 'Late Fee', 'GST'];
const METHODS = ['Bank Transfer', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Other'];
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
const today = () => new Date().toISOString().slice(0, 10);

export default function BillFinancePanel({ bill, isAdmin }) {
  const [items, setItems] = useState(CATEGORIES.map((category) => ({ category, amount: '0.00' })));
  const [summary, setSummary] = useState({ billAmount: Number(bill.amount), amountPaid: 0, tdsAmount: 0, settledAmount: 0, outstandingBalance: Number(bill.amount) });
  const [payments, setPayments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [amortization, setAmortization] = useState([]);
  const [amortizationMonths, setAmortizationMonths] = useState('3');
  const [startMonth, setStartMonth] = useState(today().slice(0, 7));
  const [approval, setApproval] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [payment, setPayment] = useState({
    paymentDate: today(), amountPaid: '', tdsAmount: '0', paymentMethod: 'Bank Transfer',
    transactionReference: '', reconciliationStatus: 'Pending', remarks: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [breakdown, paymentData, attachmentData, amortizationData, approvalData] = await Promise.all([
        phase2Api.getBreakdown(bill.id),
        phase2Api.getPayments(bill.id),
        phase2Api.getAttachments(bill.id),
        phase2Api.getAmortization(bill.id),
        phase2Api.getApproval(bill.id),
      ]);
      setItems(CATEGORIES.map((category) => {
        const found = breakdown.items.find((item) => item.category === category);
        return { category, amount: found ? String(found.amount) : '0.00' };
      }));
      setPayments(paymentData.payments);
      setSummary(paymentData.summary);
      setAttachments(attachmentData.attachments);
      setAmortization(amortizationData.schedule);
      setApproval(approvalData.approval);
    } catch (err) {
      setError(err.message || 'Unable to load bill finance details.');
    }
  }, [bill.id]);

  useEffect(() => { load(); }, [load]);

  const updateItem = (category, amount) => {
    setItems((current) => current.map((item) => item.category === category ? { ...item, amount } : item));
  };

  const saveItems = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await phase2Api.saveBreakdown(bill.id, items.map((item) => ({ ...item, amount: Number(item.amount || 0) })));
      setNotice('Bill breakdown saved.');
      await load();
    } catch (err) { setError(err.message || 'Could not save bill breakdown.'); }
    finally { setBusy(false); }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await phase2Api.recordPayment(bill.id, {
        ...payment, amountPaid: Number(payment.amountPaid), tdsAmount: Number(payment.tdsAmount || 0),
      });
      setPayment({ paymentDate: today(), amountPaid: '', tdsAmount: '0', paymentMethod: 'Bank Transfer', transactionReference: '', reconciliationStatus: 'Pending', remarks: '' });
      setNotice('Payment recorded successfully.');
      await load();
    } catch (err) { setError(err.message || 'Could not record payment.'); }
    finally { setBusy(false); }
  };

  const uploadInvoice = async (event) => {
    event.preventDefault();
    if (!selectedFile) { setError('Choose an invoice file first.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await phase2Api.uploadAttachment(bill.id, selectedFile);
      setSelectedFile(null);
      event.target.reset();
      setNotice('Invoice uploaded successfully.');
      await load();
    } catch (err) { setError(err.message || 'Invoice upload failed.'); }
    finally { setBusy(false); }
  };

  const previewInvoice = async (attachment) => {
    setError('');
    try {
      const response = await phase2Api.downloadAttachment(bill.id, attachment.id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { setError(err.message || 'Unable to open invoice.'); }
  };


  const saveAmortization = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await phase2Api.saveAmortization(bill.id, Number(amortizationMonths), startMonth);
      setNotice('Prepaid amortization schedule saved.'); await load();
    } catch (err) { setError(err.message || 'Could not save amortization schedule.'); }
    finally { setBusy(false); }
  };

  const submitApprovalRequest = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await phase2Api.requestApproval(bill.id, requestNote);
      setApproval(result.approval); setNotice('Approval request submitted.');
    } catch (err) { setError(err.message || 'Could not submit approval request.'); }
    finally { setBusy(false); }
  };

  const reviewApproval = async (status) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await phase2Api.reviewApproval(bill.id, status, reviewNote);
      setApproval(result.approval); setNotice(`Bill ${status.toLowerCase()}.`);
    } catch (err) { setError(err.message || 'Could not update approval.'); }
    finally { setBusy(false); }
  };

  const categoryTotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary label="Bill total" value={money(summary.billAmount)} />
        <Summary label="Bank paid" value={money(summary.amountPaid)} />
        <Summary label="TDS withheld" value={money(summary.tdsAmount)} />
        <Summary label="Outstanding" value={money(summary.outstandingBalance)} />
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <section className="rounded-lg border border-surface-border p-4">
        <h3 className="mb-3 font-display font-semibold text-ink-900">Bill bifurcation</h3>
        <p className="mb-3 text-xs text-ink-500">The category amounts must add up to the bill total ({money(bill.amount)}).</p>
        <form onSubmit={saveItems} className="space-y-3">
          {items.map((item) => (
            <label key={item.category} className="grid grid-cols-2 items-center gap-3 text-sm">
              <span className="text-ink-700">{item.category}</span>
              <input type="number" min="0" step="0.01" required value={item.amount}
                onChange={(event) => updateItem(item.category, event.target.value)}
                className="w-full rounded-lg border border-surface-border px-3 py-2 text-right" />
            </label>
          ))}
          <div className="flex items-center justify-between border-t border-surface-border pt-3 text-sm font-semibold">
            <span>Category total</span><span>{money(categoryTotal)}</span>
          </div>
          <Button type="submit" disabled={busy}>Save breakdown</Button>
        </form>
      </section>

      <section className="rounded-lg border border-surface-border p-4">
        <h3 className="mb-3 font-display font-semibold text-ink-900">Record payment</h3>
        <p className="mb-3 text-xs text-ink-500">Enter the bank amount and TDS separately. Both count toward settling the invoice; no TDS rate is assumed.</p>
        <form onSubmit={submitPayment} className="grid gap-3 sm:grid-cols-2">
          <Field label="Payment date"><input type="date" required value={payment.paymentDate} onChange={(e) => setPayment({ ...payment, paymentDate: e.target.value })} /></Field>
          <Field label="Bank amount paid (₹)"><input type="number" min="0.01" step="0.01" required value={payment.amountPaid} onChange={(e) => setPayment({ ...payment, amountPaid: e.target.value })} /></Field>
          <Field label="TDS withheld (₹)"><input type="number" min="0" step="0.01" value={payment.tdsAmount} onChange={(e) => setPayment({ ...payment, tdsAmount: e.target.value })} /></Field>
          <Field label="Payment method"><select value={payment.paymentMethod} onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })}>{METHODS.map((method) => <option key={method}>{method}</option>)}</select></Field>
          <Field label="Transaction reference"><input maxLength="120" value={payment.transactionReference} onChange={(e) => setPayment({ ...payment, transactionReference: e.target.value })} /></Field>
          <Field label="Bank reconciliation"><select value={payment.reconciliationStatus} onChange={(e) => setPayment({ ...payment, reconciliationStatus: e.target.value })}><option>Pending</option><option>Matched</option><option>Mismatch</option></select></Field>
          <div className="sm:col-span-2"><Field label="Remarks"><input maxLength="1000" value={payment.remarks} onChange={(e) => setPayment({ ...payment, remarks: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Button type="submit" disabled={busy || summary.outstandingBalance <= 0}>Record payment</Button></div>
        </form>
      </section>

      <section className="rounded-lg border border-surface-border p-4">
        <h3 className="mb-3 font-display font-semibold text-ink-900">Payment history</h3>
        {payments.length === 0 ? <p className="text-sm text-ink-500">No payments recorded yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-ink-500"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Bank paid</th><th className="py-2 pr-3">TDS</th><th className="py-2 pr-3">Method / Ref</th><th className="py-2">Reconciliation</th></tr></thead>
            <tbody>{payments.map((entry) => <tr key={entry.id} className="border-b border-surface-border"><td className="py-2 pr-3">{entry.paymentDate}</td><td className="py-2 pr-3">{money(entry.amountPaid)}</td><td className="py-2 pr-3">{money(entry.tdsAmount)}</td><td className="py-2 pr-3">{entry.paymentMethod}{entry.transactionReference ? ` / ${entry.transactionReference}` : ''}</td><td className="py-2">{entry.reconciliationStatus}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>

      <section className="rounded-lg border border-surface-border p-4">
        <h3 className="mb-3 font-display font-semibold text-ink-900">Prepaid amortization</h3>
        <p className="mb-3 text-xs text-ink-500">Spread this bill evenly over 3 or 6 months. Any paise remainder is distributed so the schedule equals the bill total.</p>
        <form onSubmit={saveAmortization} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block text-sm text-ink-700">Duration
            <select value={amortizationMonths} onChange={(e) => setAmortizationMonths(e.target.value)} className="mt-1 block w-full rounded-lg border border-surface-border px-3 py-2"><option value="3">3 months</option><option value="6">6 months</option></select>
          </label>
          <label className="block text-sm text-ink-700">Start month
            <input type="month" required value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="mt-1 block w-full rounded-lg border border-surface-border px-3 py-2" />
          </label>
          <Button type="submit" disabled={busy}>Generate schedule</Button>
        </form>
        {amortization.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-ink-500"><th className="py-2">Month</th><th className="py-2 text-right">Expense amount</th></tr></thead><tbody>{amortization.map((entry) => <tr key={entry.month} className="border-b border-surface-border"><td className="py-2">{entry.month}</td><td className="py-2 text-right">{money(entry.amount)}</td></tr>)}</tbody><tfoot><tr className="font-semibold"><td className="py-2">Total</td><td className="py-2 text-right">{money(amortization.reduce((sum, entry) => sum + Number(entry.amount), 0))}</td></tr></tfoot></table></div> : <p className="text-sm text-ink-500">No amortization schedule created.</p>}
      </section>

      <section className="rounded-lg border border-surface-border p-4">
        <h3 className="mb-2 font-display font-semibold text-ink-900">Approval workflow</h3>
        <p className="mb-3 text-sm text-ink-600">Current status: <strong>{approval?.approval_status || 'Not requested'}</strong></p>
        {approval?.request_note && <p className="mb-2 text-sm text-ink-500">Request note: {approval.request_note}</p>}
        {approval?.review_note && <p className="mb-3 text-sm text-ink-500">Review note: {approval.review_note}</p>}
        {(!approval || approval.approval_status === 'Rejected') && (
          <form onSubmit={submitApprovalRequest} className="space-y-3">
            <label className="block text-sm text-ink-700">Approval request note
              <textarea maxLength={1000} rows={2} value={requestNote} onChange={(e) => setRequestNote(e.target.value)} className="mt-1 block w-full rounded-lg border border-surface-border px-3 py-2" />
            </label>
            <Button type="submit" disabled={busy}>Request approval</Button>
          </form>
        )}
        {isAdmin && approval?.approval_status === 'Pending' && (
          <div className="space-y-3">
            <label className="block text-sm text-ink-700">Reviewer note
              <textarea maxLength={1000} rows={2} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} className="mt-1 block w-full rounded-lg border border-surface-border px-3 py-2" />
            </label>
            <div className="flex gap-2"><Button type="button" disabled={busy} onClick={() => reviewApproval('Approved')}>Approve</Button><Button type="button" variant="danger" disabled={busy} onClick={() => reviewApproval('Rejected')}>Reject</Button></div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-surface-border p-4">
        <h3 className="mb-3 font-display font-semibold text-ink-900">Invoice files</h3>
        <p className="mb-3 text-xs text-ink-500">PDF, JPG, PNG or WEBP; maximum 4 MB per file.</p>
        <form onSubmit={uploadInvoice} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="min-w-0 flex-1 text-sm" />
          <Button type="submit" disabled={busy || !selectedFile}>Upload invoice</Button>
        </form>
        {attachments.length > 0 && <ul className="mt-3 divide-y divide-surface-border">{attachments.map((file) => <li key={file.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate">{file.filename} <span className="text-xs text-ink-500">({Math.ceil(file.fileSize / 1024)} KB)</span></span><button type="button" className="shrink-0 text-brand-500 hover:underline" onClick={() => previewInvoice(file)}>Preview / download</button></li>)}</ul>}
      </section>
    </div>
  );
}

function Summary({ label, value }) {
  return <div className="rounded-lg bg-surface-muted p-3"><p className="text-xs text-ink-500">{label}</p><p className="mt-1 text-sm font-semibold text-ink-900">{value}</p></div>;
}
function Field({ label, children }) {
  return <label className="block text-sm text-ink-700"><span className="mb-1 block">{label}</span>{children && <div className="[&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-surface-border [&_input]:px-3 [&_input]:py-2 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-surface-border [&_select]:px-3 [&_select]:py-2">{children}</div>}</label>;
}
