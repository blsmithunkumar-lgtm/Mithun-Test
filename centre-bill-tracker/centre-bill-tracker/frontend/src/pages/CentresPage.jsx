import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import SearchInput from '../components/common/SearchInput';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
import CentreForm from '../components/centre/CentreForm';
import CentreTable from '../components/centre/CentreTable';
import * as centreApi from '../api/centre.api';

// Debounce delay for search-as-you-type against the API.
const SEARCH_DEBOUNCE_MS = 350;

export default function CentresPage() {
  const { isAdmin } = useAuth();

  const [centres, setCentres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCentre, setEditingCentre] = useState(null);

  const [statusTarget, setStatusTarget] = useState(null);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadCentres = useCallback(async (searchTerm) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await centreApi.getCentres({ search: searchTerm });
      setCentres(data);
    } catch (err) {
      setLoadError(err.message || 'Failed to load centres.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadCentres(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, loadCentres]);

  const openAddForm = () => {
    setEditingCentre(null);
    setIsFormOpen(true);
  };

  const openEditForm = (centre) => {
    setEditingCentre(centre);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values) => {
    if (editingCentre) {
      await centreApi.updateCentre(editingCentre.id, values);
    } else {
      await centreApi.createCentre(values);
    }
    setIsFormOpen(false);
    setEditingCentre(null);
    await loadCentres(search);
  };

  const confirmToggleStatus = async () => {
    if (!statusTarget) return;
    setIsStatusSubmitting(true);
    try {
      const nextStatus = statusTarget.status === 'Active' ? 'Inactive' : 'Active';
      await centreApi.updateCentreStatus(statusTarget.id, nextStatus);
      setStatusTarget(null);
      await loadCentres(search);
    } catch (err) {
      setLoadError(err.message || 'Failed to update centre status.');
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleteSubmitting(true);
    setDeleteError('');
    try {
      await centreApi.deleteCentre(deleteTarget.id);
      setDeleteTarget(null);
      await loadCentres(search);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete centre.');
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  return (
    <AppLayout title="Centre Management">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by centre name..." />
        {isAdmin && <Button onClick={openAddForm}>+ Add Centre</Button>}
      </div>

      <div className="mb-4">
        <Alert variant="error">{loadError}</Alert>
      </div>

      {isLoading ? <Loader label="Loading centres..." /> : (
        <CentreTable
          centres={centres}
          isAdmin={isAdmin}
          onEdit={openEditForm}
          onToggleStatus={setStatusTarget}
          onDelete={(centre) => {
            setDeleteError('');
            setDeleteTarget(centre);
          }}
        />
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCentre ? 'Edit Centre' : 'Add Centre'}
      >
        <CentreForm
          initialValues={editingCentre}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmToggleStatus}
        isLoading={isStatusSubmitting}
        title={statusTarget?.status === 'Active' ? 'Deactivate Centre' : 'Activate Centre'}
        message={
          statusTarget?.status === 'Active'
            ? `Mark "${statusTarget?.centreName}" as Inactive? It will remain in the system with its bill history intact.`
            : `Mark "${statusTarget?.centreName}" as Active again?`
        }
        confirmLabel={statusTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        variant={statusTarget?.status === 'Active' ? 'danger' : 'primary'}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleteSubmitting}
        title="Delete Centre"
        message={
          deleteError ||
          `Permanently delete "${deleteTarget?.centreName}"? This cannot be undone.`
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </AppLayout>
  );
}
