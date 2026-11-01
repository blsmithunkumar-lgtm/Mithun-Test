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

const SECTIONS = [['payments','Payment Tracker'],['invoices','Invoice Uploads'],['reports','Finance Reports'],['tds','TDS & Reconciliation'],['amortization','Amortization'],['approvals','Approvals'],['audit','Audit Logs']];
const money = (v) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(v||0));

export default function FinanceWorkspacePage() {
  const [params,setParams] = useSearchParams();
  const section = params.get('section') || 'payments';
  const {isAdmin} = useAuth();
  const [bills,setBills] = useState([]);
  const [selectedId,setSelectedId] = useState('');
  const [summary,setSummary] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [exporting,setExporting] = useState('');
  const title = SECTIONS.find(([key])=>key===section)?.[1] || 'Payment Tracker';
  useEffect(()=>{ let active=true; billApi.getBills().then(data=>{if(active){setBills(data);setSelectedId(v=>v||String(data[0]?.id||''));}}).catch(e=>{if(active)setError(e.message||'Could not load bills.');}).finally(()=>{if(active)setLoading(false);}); return ()=>{active=false;}; },[]);
  useEffect(()=>{ if(section!=='reports') return undefined; let active=true; phase2Api.getFinanceSummary().then(data=>{if(active)setSummary(data);}).catch(e=>{if(active)setError(e.message||'Could not load reports.');}); return ()=>{active=false;}; },[section]);
  const selectedBill = useMemo(()=>bills.find(b=>String(b.id)===String(selectedId)),[bills,selectedId]);
  const exportCsv = async kind => { setExporting(kind);setError('');try{const response=kind==='payments'?await phase2Api.exportPaymentsCsv():await phase2Api.exportBillReportCsv();const url=URL.createObjectURL(new Blob([response.data],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=kind==='payments'?'centre-bill-payments.csv':'centre-bill-report.csv';document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e.message||'CSV export failed.');}finally{setExporting('');}};
  return <AppLayout title={title}><div className='space-y-5'>
    <div className='flex flex-wrap gap-2'>{SECTIONS.filter(([k])=>k!=='audit'||isAdmin).map(([k,label])=><button key={k} type='button' onClick={()=>setParams({section:k})} className={'rounded-lg border px-3 py-2 text-sm '+(section===k?'border-brand-500 bg-brand-50 text-brand-700':'border-surface-border bg-white text-ink-700')}>{label}</button>)}</div>
    {error&&<Alert variant='error'>{error}</Alert>}
    {loading?<Loader label='Loading finance workspace...'/>:section==='reports'?<><div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>{summary&&[['Total bills',summary.totalBills],['Total billed',money(summary.totalBilled)],['Bank payments',money(summary.amountPaid)],['TDS withheld',money(summary.tdsAmount)],['Total settled',money(summary.settledAmount)],['Outstanding',money(summary.outstandingBalance)]].map(([label,value])=><div key={label} className='rounded-xl border border-surface-border bg-white p-4'><p className='text-sm text-ink-500'>{label}</p><p className='mt-2 text-xl font-semibold text-ink-900'>{value}</p></div>)}</div>
      <section className='rounded-xl border border-surface-border bg-white p-4'><h2 className='mb-3 font-semibold text-ink-900'>Bill bifurcation totals</h2>{(summary?.categories||[]).map(item=><div key={item.category} className='flex justify-between border-t border-surface-border py-3 text-sm'><span>{item.category}</span><strong>{money(item.amount)}</strong></div>)}</section>
      <div className='flex flex-wrap gap-3'><Button onClick={()=>exportCsv('bills')} disabled={!!exporting}>{exporting==='bills'?'Exporting...':'Export Bill Report CSV'}</Button><Button onClick={()=>exportCsv('payments')} disabled={!!exporting}>{exporting==='payments'?'Exporting...':'Export Payments CSV'}</Button></div></>:<><div className='rounded-xl border border-surface-border bg-white p-4'><label htmlFor='finance-bill' className='mb-2 block text-sm font-medium'>Select bill</label><select id='finance-bill' value={selectedId} onChange={e=>setSelectedId(e.target.value)} className='w-full max-w-xl rounded-lg border border-surface-border bg-white px-3 py-2 text-sm'>{bills.map(b=><option key={b.id} value={b.id}>{b.invoice_number} — {b.centre_name} — {money(b.amount)}</option>)}</select></div>{selectedBill?<BillFinancePanel bill={selectedBill} isAdmin={isAdmin}/>:<Alert variant='info'>No bills available yet. Create a bill first to use this finance section.</Alert>}</>}
  </div></AppLayout>;
}
