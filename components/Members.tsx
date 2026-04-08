import React, { useEffect, useRef, useState } from 'react';
import Layout from './Layout';
import { User } from '../types';
import { deleteMember, getMembers, updateMemberProfile } from '../services/adminService';
import { Camera, Shield, Trash2 } from 'lucide-react';
import { getRoleLabel, useI18n } from '../i18n';

interface MembersProps {
  user: User;
  onBack: () => void;
  onCurrentUserUpdated: (user: User) => void;
}

const Members: React.FC<MembersProps> = ({ user, onBack, onCurrentUserUpdated }) => {
  const { language, t } = useI18n();
  const [members, setMembers] = useState<User[]>([]);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await getMembers(user.id);
        if (!isMounted) {
          return;
        }

        setMembers(response.members);
        const initialSelected = response.members[0] ?? null;
        setSelectedMember(initialSelected);
        setEmail(initialSelected?.email ?? '');
        setFullName(initialSelected?.fullName ?? '');
        setLicenseNumber(initialSelected?.licenseNumber ?? '');
        setPhotoUrl(initialSelected?.photoUrl ?? '');
        setErrorMessage('');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load members.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const handleSelectMember = (member: User) => {
    setSelectedMember(member);
    setEmail(member.email);
    setFullName(member.fullName);
    setLicenseNumber(member.licenseNumber);
    setPhotoUrl(member.photoUrl);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handlePhotoPick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedMember) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await updateMemberProfile({
        instructorId: user.id,
        memberId: selectedMember.id,
        email,
        fullName,
        licenseNumber,
        photoUrl,
      });

      setMembers((prev) => prev.map((member) => (member.id === response.member.id ? response.member : member)));
      setSelectedMember(response.member);
      setEmail(response.member.email);
      setFullName(response.member.fullName);
      setLicenseNumber(response.member.licenseNumber);
      setPhotoUrl(response.member.photoUrl);
      setSuccessMessage('Member profile updated.');

      if (response.member.id === user.id) {
        onCurrentUserUpdated(response.member);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update member.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await deleteMember({
        instructorId: user.id,
        memberId: selectedMember.id,
      });

      const nextMembers = members.filter((member) => member.id !== selectedMember.id);
      setMembers(nextMembers);
      const nextSelected = nextMembers[0] ?? null;
      setSelectedMember(nextSelected);
      setEmail(nextSelected?.email ?? '');
      setFullName(nextSelected?.fullName ?? '');
      setLicenseNumber(nextSelected?.licenseNumber ?? '');
      setPhotoUrl(nextSelected?.photoUrl ?? '');
      setSuccessMessage('Member deleted.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete member.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout title={t('members.title')} onBack={onBack}>
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

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-base font-bold text-slate-900 mb-4">{t('members.list')}</h3>
          {isLoading ? (
            <p className="text-sm text-slate-500">{t('members.loading')}</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-slate-500">{t('members.none')}</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleSelectMember(member)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedMember?.id === member.id ? 'border-[#581c1c] bg-[#581c1c]/5' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img src={member.photoUrl} alt={member.fullName} className="h-14 w-14 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{member.fullName}</div>
                      <div className="text-sm text-slate-500">{getRoleLabel(member.role, language)}</div>
                      <div className="text-xs text-slate-400 truncate">{member.email}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-base font-bold text-slate-900 mb-4">{t('members.miniProfile')}</h3>
          {!selectedMember ? (
            <p className="text-sm text-slate-500">{t('members.selectToEdit')}</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col items-center">
                <button type="button" onClick={handlePhotoPick} className="relative">
                  <img src={photoUrl || selectedMember.photoUrl} alt={selectedMember.fullName} className="h-32 w-32 rounded-2xl object-cover shadow-md" />
                  <span className="absolute bottom-2 right-2 rounded-full bg-[#581c1c] p-2 text-white">
                    <Camera size={16} />
                  </span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.emailAddress')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.fullName')}</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('common.license')}</label>
                <input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-[#f39200]" />
                  {getRoleLabel(selectedMember.role, language)}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
              >
                {isSaving ? t('common.saving') : t('members.saveProfile')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || selectedMember.id === user.id}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                <Trash2 size={16} />
                {isDeleting ? t('common.deleting') : selectedMember.id === user.id ? t('members.cannotDeleteSelf') : t('members.deleteMember')}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Members;
