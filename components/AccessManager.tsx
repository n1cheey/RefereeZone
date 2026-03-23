import React, { useEffect, useState } from 'react';
import Layout from './Layout';
import { AllowedAccessItem, User, UserRole } from '../types';
import { addAllowedAccess, deleteAllowedAccess, getAllowedAccess } from '../services/adminService';
import { Trash2 } from 'lucide-react';

interface AccessManagerProps {
  user: User;
  onBack: () => void;
}

const roleOptions: UserRole[] = ['Instructor', 'Table', 'Referee', 'Staff'];
const ACCESS_REFRESH_INTERVAL_MS = 10000;

const AccessManager: React.FC<AccessManagerProps> = ({ user, onBack }) => {
  const [accessList, setAccessList] = useState<AllowedAccessItem[]>([]);
  const [email, setEmail] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [role, setRole] = useState<UserRole>('Referee');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async (showLoader: boolean) => {
      if (showLoader) {
        setIsLoading(true);
      }

      try {
        const response = await getAllowedAccess(user.id);
        if (isMounted) {
          setAccessList(response.accessList);
          setErrorMessage('');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load access list.');
        }
      } finally {
        if (isMounted && showLoader) {
          setIsLoading(false);
        }
      }
    };

    void load(true);
    const intervalId = window.setInterval(() => {
      void load(false);
    }, ACCESS_REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [user.id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await addAllowedAccess({
        instructorId: user.id,
        email,
        licenseNumber,
        role,
      });

      setAccessList((prev) => {
        const next = prev.filter((item) => item.id !== response.access.id);
        return [...next, response.access].sort((left, right) => left.email.localeCompare(right.email));
      });
      setEmail('');
      setLicenseNumber('');
      setRole('Referee');
      setSuccessMessage('Access added successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add access.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccess = async (accessId: string) => {
    setDeletingId(accessId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await deleteAllowedAccess({
        instructorId: user.id,
        accessId,
      });
      setAccessList((prev) => prev.filter((item) => item.id !== accessId));
      setSuccessMessage('Access deleted successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete access.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout title="Add Access" onBack={onBack}>
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Grant Registration Access</h3>
            <p className="mt-1 text-sm text-slate-500">The selected role becomes mandatory during registration.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
              placeholder="referee2@abl.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c] bg-white"
            >
              {roleOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">License</label>
            <input
              required
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
              placeholder="ABL-REF-0001"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
          >
            {isSaving ? 'Saving...' : 'Add Access'}
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-base font-bold text-slate-900 mb-4">Allowed Registration List</h3>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading access list...</p>
          ) : accessList.length === 0 ? (
            <p className="text-sm text-slate-500">No access entries found.</p>
          ) : (
            <div className="space-y-3">
              {accessList.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{item.email}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.role}</div>
                    <div className="text-xs text-slate-400">{item.licenseNumber || 'Pending'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccess(item.id)}
                    disabled={deletingId === item.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                    {deletingId === item.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AccessManager;
