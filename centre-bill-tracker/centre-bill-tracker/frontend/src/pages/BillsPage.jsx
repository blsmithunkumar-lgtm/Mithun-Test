import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import SearchInput from '../components/common/SearchInput';
import Select from '../components/common/Select';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
import BillForm from '../components/bill/BillForm';
import BillTable from '../components/bill/BillTable';
import * as billApi from '../api/bill.api';

const SEARCH_DEBOUNCE_MS = 350;

export default function BillsPage() {
  const { isAdmin } = useAuth();

  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  const [statusChange, setStatusChange] = useState(null); // { bill, nextStatus }
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState('');

  const loadBills = useCallback(async (searchTerm, status) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await billApi.getBills({ search: searchTerm, status: status || undefined });
      setBills(data);
    } catch (err) {
      setLoadError(err.message || 'Failed to load bills.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadBills(search, statusFilter), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, statusFilter, loadBills]);

  const openAddForm = () => {
    setEditingBill(null);
    setIsFormOpen(true);
  };

  const openEditForm = (bill) => {
    setEditingBill(bill);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values) => {
    if (editingBill) {
      await billApi.updateBill(editingBill.id, values);
    } else {
      await billApi.createBill(values);
    }
    setIsFormOpen(false);
    setEditingBill(null);
    await loadBills(search, statusFilter);
  };

  const confirmStatusChange = async () => {
    if (!statusChange) return;
    setIsStatusSubmitting(true);
    setStatusError('');
    try {
      await billApi.updateBillStatus(statusChange.bill.id, statusChange.nextStatus);
      setStatusChange(null);
      await loadBills(search, statusFilter);
    } catch (err) {
      setStatusError(err.message || 'Failed to update bill status.');
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  return (
    <AppLayout title="Bill Management">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by centre name..." />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-40">
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Received">Received</option>
            <option value="Paid">Paid</option>
          </Select>
        </div>
        <Button onClick={openAddForm}>+ Add Bill</Button>
      </div>

      <div className="mb-4">
        <Alert variant="error">{loadError}</Alert>
      </div>

      {isLoading ? <Loader label="Loading bills..." /> : (
        <BillTable
          bills={bills}
          isAdmin={isAdmin}
          onEdit={openEditForm}
          onAdvanceStatus={(bill, nextStatus) => {
            setStatusError('');
            setStatusChange({ bill, nextStatus });
          }}
        />
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingBill ? 'Edit Bill' : 'Add Bill'}
        size="lg"
      >
        <BillForm
          initialValues={editingBill}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!statusChange}
        onClose={() => setStatusChange(null)}
        onConfirm={confirmStatusChange}
        isLoading={isStatusSubmitting}
        title={statusChange?.nextStatus === 'Paid' ? 'Mark Bill as Paid' : 'Mark Bill as Received'}
        message={
          statusError ||
          (statusChange?.nextStatus === 'Paid'
            ? `Mark the bill for "${statusChange?.bill?.centreName}" (${statusChange?.bill?.billMonth}) as Paid? Payment date will be set to today automatically.`
            : `Mark the bill for "${statusChange?.bill?.centreName}" (${statusChange?.bill?.billMonth}) as Received?`)
        }
        confirmLabel={statusChange?.nextStatus === 'Paid' ? 'Mark Paid' : 'Mark Received'}
      />
    </AppLayout>
  );
}
