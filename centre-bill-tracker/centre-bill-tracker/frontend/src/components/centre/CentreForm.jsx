import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const centreSchema = z.object({
  centreName: z.string().trim().min(1, 'Centre name is required').max(200, 'Max 200 characters'),
  vendorName: z.string().trim().max(200, 'Max 200 characters').optional(),
  wifiId: z.string().trim().max(150, 'Max 150 characters').optional(),
  accountNumber: z.string().trim().max(150, 'Max 150 characters').optional(),
  serviceType: z.union([z.enum(['', 'Firewall', 'Leased Line', 'Broadband', 'Managed Service']), z.null()]).optional(),
  contractExpiryDate: z.union([z.string(), z.null()]).optional(),
});

export default function CentreForm({ initialValues, onSubmit, onCancel }) {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(centreSchema),
    defaultValues: initialValues || { centreName: '', vendorName: '', wifiId: '', accountNumber: '', serviceType: '', contractExpiryDate: '' },
  });

  useEffect(() => {
    if (initialValues) reset(initialValues);
  }, [initialValues, reset]);

  const submitHandler = async (values) => {
    setServerError('');
    try {
      await onSubmit({ ...values, serviceType: values.serviceType || null, contractExpiryDate: values.contractExpiryDate || null });
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="flex flex-col gap-4" noValidate>
      <Alert variant="error">{serverError}</Alert>

      <Input
        id="centreName"
        label="Centre Name"
        placeholder="e.g. Delhi Rohini Centre"
        error={errors.centreName?.message}
        {...register('centreName')}
      />
      <Input
        id="vendorName"
        label="Vendor Name"
        placeholder="e.g. Airtel, Jio"
        error={errors.vendorName?.message}
        {...register('vendorName')}
      />
      <Input
        id="wifiId"
        label="WiFi ID"
        placeholder="Leave blank if not available"
        error={errors.wifiId?.message}
        {...register('wifiId')}
      />
      <Input
        id="accountNumber"
        label="Account Number"
        placeholder="ISP account number"
        error={errors.accountNumber?.message}
        {...register('accountNumber')}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="serviceType" className="text-sm font-medium text-ink-700">Service Type</label>
        <select
          id="serviceType"
          className="w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink-900"
          {...register('serviceType')}
        >
          <option value="">Select service type</option>
          <option value="Firewall">Firewall</option>
          <option value="Leased Line">Leased Line</option>
          <option value="Broadband">Broadband</option>
          <option value="Managed Service">Managed Service</option>
        </select>
        {errors.serviceType?.message && <p className="text-xs text-status-overdue">{errors.serviceType.message}</p>}
      </div>

      <Input
        id="contractExpiryDate"
        label="Contract / Lease Expiry Date"
        type="date"
        error={errors.contractExpiryDate?.message}
        {...register('contractExpiryDate')}
      />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {initialValues ? 'Save Changes' : 'Add Centre'}
        </Button>
      </div>
    </form>
  );
        }
