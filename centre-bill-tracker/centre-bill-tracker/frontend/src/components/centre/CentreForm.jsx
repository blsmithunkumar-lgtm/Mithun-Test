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
    defaultValues: initialValues || { centreName: '', vendorName: '', wifiId: '', accountNumber: '' },
  });

  useEffect(() => {
    if (initialValues) reset(initialValues);
  }, [initialValues, reset]);

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
