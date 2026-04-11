import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  clearAuthHash,
  getCurrentUserProfile,
  isPasswordRecoveryMode,
  isPasswordResetPage,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  updatePassword,
} from '../services/authService';
import { getRoleLabel, useI18n } from '../i18n';

interface LoginProps {
  onLogin: (user: User) => void;
}

const roles: UserRole[] = ['Instructor', 'TO Supervisor', 'TO', 'Referee', 'Staff'];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { language, setLanguage, t } = useI18n();
  const [isRegister, setIsRegister] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => isPasswordRecoveryMode());
  const [isResetPage] = useState(() => isPasswordResetPage());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('Referee');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const toggleMode = () => {
    if (isResetPage) {
      return;
    }

    setIsRegister((prev) => !prev);
    setIsResetMode(false);
    setPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const openResetMode = () => {
    if (isResetPage) {
      return;
    }

    setIsRegister(false);
    setIsResetMode(true);
    setPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const closeResetMode = () => {
    if (isResetPage) {
      return;
    }

    setIsResetMode(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isRecoveryMode || isResetPage) {
        if (password !== confirmPassword) {
          throw new Error(t('login.passwordsMismatch'));
        }

        await updatePassword(password);
        clearAuthHash();
        setIsRecoveryMode(false);

        try {
          const user = await getCurrentUserProfile();
          if (user) {
            onLogin(user);
            return;
          }
        } catch {
          await logoutUser().catch(() => undefined);
        }

        setPassword('');
        setConfirmPassword('');
        setSuccessMessage(t('login.passwordUpdated'));
        return;
      }

      if (isResetMode) {
        await requestPasswordReset(email);
        setSuccessMessage(t('login.passwordResetSent'));
        return;
      }

      const response = isRegister
        ? await registerUser({ email, password, fullName, role })
        : await loginUser({ email, password });

      onLogin(response.user);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('login.authenticationFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-abf min-h-screen bg-[radial-gradient(circle_at_top,#f7dfc0_0%,#f4f6fa_32%,#edf2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white/70 shadow-[0_30px_90px_rgba(52,23,28,0.15)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-[#57131b] p-10 text-white lg:flex lg:flex-col lg:justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,160,68,0.24),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_34%)]" />
          <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
            <div className="inline-flex rounded-full border border-white/15 bg-white/8 px-5 py-2 text-base font-semibold tracking-[0.12em] text-white/85">
              {t('login.leagueName')}
            </div>
            <div className="mt-12 flex max-w-md flex-col items-center text-center">
              <img
                src="/img/Login.jpg"
                alt={t('login.logoAlt')}
                className="w-[320px] max-w-full rounded-[32px] shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
              />
              <h1 className="mt-10 text-5xl font-semibold leading-[0.95] tracking-tight">
                {t('login.platformTitle')}
              </h1>
              <p className="mt-5 max-w-sm text-base leading-7 text-white/72">
                {t('login.securePlatform')}
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md space-y-8 text-center">
            <div className="flex justify-center">
              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                {(['az', 'en', 'ru'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLanguage(item)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      language === item ? 'bg-[#57131b] text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {t(`language.${item}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-center lg:hidden">
                <img
                  src="/img/Login.jpg"
                  alt={t('login.logoAlt')}
                  className="w-[220px] max-w-full rounded-[28px] shadow-[0_18px_40px_rgba(87,19,27,0.18)]"
                />
              </div>
              <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#57131b]/55">
                {isResetPage ? t('login.passwordRecovery') : t('login.brandBadge')}
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#57131b] sm:text-4xl">
                {isRecoveryMode
                  ? t('login.setNewPassword')
                  : isResetPage
                    ? t('login.resetYourPassword')
                    : isResetMode
                      ? t('login.resetPassword')
                      : isRegister
                        ? t('login.createOfficialAccount')
                        : t('login.signIn')}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {isRecoveryMode
                  ? t('login.recoveryHelp')
                  : isResetPage
                    ? t('login.resetPageHelp')
                    : isResetMode
                      ? t('login.resetHelp')
                      : isRegister
                        ? t('login.registerHelp')
                        : t('login.signInHelp')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {isRegister && !isRecoveryMode && !isResetMode && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      {t('common.fullName')}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#581c1c]"
                      placeholder={t('login.fullNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      {t('common.role')}
                    </label>
                    <select
                      required
                      size={4}
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#581c1c]"
                    >
                      {roles.map((item) => (
                        <option key={item} value={item}>
                          {getRoleLabel(item, language)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {t('login.registrationRoleHelp')}
                    </p>
                  </div>
                </>
              )}

              {!isRecoveryMode && !isResetPage && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {t('common.emailAddress')}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#581c1c]"
                    placeholder={t('login.emailPlaceholder')}
                  />
                </div>
              )}

              {(!isResetMode || isResetPage) && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {t('common.password')}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={10}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={isRegister || isRecoveryMode ? 'new-password' : 'current-password'}
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#581c1c]"
                    placeholder=".........."
                  />
                  {(isRegister || isRecoveryMode || isResetPage) && (
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {t('login.passwordHelp')}
                    </p>
                  )}
                </div>
              )}

              {(isRecoveryMode || isResetPage) && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {t('common.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={10}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#581c1c]"
                    placeholder=".........."
                  />
                </div>
              )}

              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[#57131b] px-4 py-4 text-sm font-semibold tracking-[0.04em] text-white shadow-lg shadow-[#57131b]/20 transition-all hover:bg-[#481016] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? t('login.processing')
                  : isRecoveryMode || isResetPage
                    ? t('login.updatePassword')
                    : isResetMode
                      ? t('login.sendResetEmail')
                      : isRegister
                        ? t('login.register')
                        : t('login.signInButton')}
              </button>
            </form>

            {!isRecoveryMode && !isResetPage && (
              <div className="flex flex-col items-center gap-3 pt-2 text-center">
                {!isRegister && !isResetMode && (
                  <button
                    type="button"
                    onClick={openResetMode}
                    className="block text-sm font-semibold text-[#57131b] transition-colors hover:text-[#f39200]"
                  >
                    {t('login.forgotPassword')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={isResetMode ? closeResetMode : toggleMode}
                  className="block text-sm font-semibold text-[#f39200] transition-colors hover:text-[#581c1c]"
                >
                  {isResetMode
                    ? t('login.backToSignIn')
                    : isRegister
                      ? `${t('login.haveAccount')} ${t('login.signInNow')}`
                      : `${t('login.needAccount')} ${t('login.registerNow')}`}
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs leading-6 text-slate-500">
              {t('login.passwordSecurityNote')}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
