import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import Alert from '../common/Alert';
import MonthYearPicker from './MonthYearPicker';
import * as centreApi from '../../api/centre.api';
import { parseLabelToYearMonth } from '../../utils/dateUtils';

const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

const billSchema = z.object({
  centreId: z.coerce.number({ required_error: 'Centre is required' }).int().positive('Please select a centre'),
  billMonth: z.string().regex(yearMonthRegex, 'Please select a bill month'),
  invoiceNumber: z.string().trim().min(1, 'Invoice number is required').max(100, 'Max 100 characters'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  amount: z.coerce.number({ required_error: 'Amount is required' }).positive('Amount must be greater than 0'),
  remarks: z.string().trim().max(2000, 'Max 2000 characters').optional(),
});

function toFormValues(bill) {
  if (!bill) {
    return { centreId: '', billMonth: '', invoiceNumber: '', invoiceDate: '', dueDate: '', amount: '', remarks: '' };
  }
  return {
    centreId: bill.centreId,
    billMonth: parseLabelToYearMonth(bill.billMonth),
    invoiceNumber: bill.invoiceNumber,
    invoiceDate: bill.invoiceDate,
    dueDate: bill.dueDate,
    amount: bill.amount,
    remarks: bill.remarks || '',
  };
}

export default function BillForm({ initialValues, onSubmit, onCancel }) {
  const [serverError, setServerError] = useState('');
  const [centres, setCentres] = useState([]);
  const [isLoadingCentres, setIsLoadingCentres] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(billSchema),
    defaultValues: toFormValues(initialValues),
  });

  useEffect(() => {
    reset(toFormValues(initialValues));
  }, [initialValues, reset]);

  // Bills can only be raised against an Active centre. When editing a bill
  // that already points at a centre later marked Inactive, that centre is
  // still included so its name doesn't silently disappear from the form.
  useEffect(() => {
    const loadCentres = async () => {
      setIsLoadingCentres(true);
      try {
        const activeCentres = await centreApi.getCentres({ status: 'Active' });
        if (initialValues && !activeCentres.some((c) => c.id === initialValues.centreId)) {
          activeCentres.push({ id: initialValues.centreId, centreName: `${initialValues.centreName} (Inactive)` });
        }
        setCentres(activeCentres);
      } catch {
        setServerError('Failed to load centres for selection.');
      } finally {
        setIsLoadingCentres(false);
      }
    };
    loadCentres();
  }, [initialValues]);

  const submitHandler = async (values) => {
    setServerError('');
    try {
      await onSubmit(values);
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="flex flex-col gap-4" noValidate>
      <Alert variant="error">{serverError}</Alert>

      <Select id="centreId" label="Centre" error={errors.centreId?.message} disabled={isLoadingCentres} {...register('centreId')}>
        <option value="">{isLoadingCentres ? 'Loading centres...' : 'Select a centre'}</option>
        {centres.map((c) => (
          <option key={c.id} value={c.id}>{c.centreName}</option>
        ))}
      </Select>

      <Controller
        name="billMonth"
        control={control}
        render={({ field }) => (
          <MonthYearPicker id="billMonth" error={errors.billMonth?.message} {...field} />
        )}
      />

      <Input
        id="invoiceNumber"
        label="Invoice Number"
        placeholder="e.g. INV-2026-0142"
        error={errors.invoiceNumber?.message}
        {...register('invoiceNumber')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="invoiceDate"
          label="Invoice Date"
          type="date"
          error={errors.invoiceDate?.message}
          {...register('invoiceDate')}
        />
        <Input
          id="dueDate"
          label="Due Date"
          type="date"
          error={errors.dueDate?.message}
          {...register('dueDate')}
        />
      </div>

      <Input
        id="amount"
        label="Amount (₹)"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0.00"
        error={errors.amount?.message}
        {...register('amount')}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="remarks" className="text-sm font-medium text-ink-700">Remarks (optional)</label>
        <textarea
          id="remarks"
          rows={3}
          placeholder="Any additional notes about this bill"
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 ${
            errors.remarks ? 'border-status-overdue' : 'border-surface-border'
          }`}
          {...register('remarks')}
        />
        {errors.remarks && <p className="text-xs text-status-overdue">{errors.remarks.message}</p>}
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initialValues ? 'Save Changes' : 'Add Bill'}
        </Button>
      </div>
    </form>
  );
}
