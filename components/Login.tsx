import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  clearAuthHash,
  getCurrentUserProfile,
  isPasswordRecoveryMode,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  updatePassword,
} from '../services/authService';
import loginLogo from '../img/login.webp';

interface LoginProps {
  onLogin: (user: User) => void;
}

const roles: UserRole[] = ['Instructor', 'Table', 'Referee', 'Staff'];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => isPasswordRecoveryMode());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('Referee');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const toggleMode = () => {
    setIsRegister((prev) => !prev);
    setIsResetMode(false);
    setPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const openResetMode = () => {
    setIsRegister(false);
    setIsResetMode(true);
    setPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const closeResetMode = () => {
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
      if (isRecoveryMode) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
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
        setSuccessMessage('Password updated. Sign in with your new password.');
        return;
      }

      if (isResetMode) {
        await requestPasswordReset(email);
        setSuccessMessage('Password reset email has been sent. Check your inbox.');
        return;
      }

      const response = isRegister
        ? await registerUser({ email, password, fullName, role })
        : await loginUser({ email, password });

      onLogin(response.user);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed.');
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
              Azərbaycan Basketbol Liqası
            </div>
            <div className="mt-12 flex max-w-md flex-col items-center text-center">
              <img
                src={loginLogo}
                alt="ABL logo"
                className="w-[320px] max-w-full rounded-[32px] shadow-[0_24px_60px_rgba(0,0,0,0.25)]"
              />
              <h1 className="mt-10 text-5xl font-semibold leading-[0.95] tracking-tight">
                ABL Hakimlərin platforması
              </h1>
              <p className="mt-5 max-w-sm text-base leading-7 text-white/72">
                Secure nominations, reports, rankings and member administration for the ABL refereeing staff.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md space-y-8 text-center">
            <div>
              <div className="flex justify-center lg:hidden">
                <img
                  src={loginLogo}
                  alt="ABL logo"
                  className="w-[220px] max-w-full rounded-[28px] shadow-[0_18px_40px_rgba(87,19,27,0.18)]"
                />
              </div>
              <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#57131b]/55">
                ABL RefZone
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#57131b] sm:text-4xl">
                {isRecoveryMode ? 'Set New Password' : isResetMode ? 'Reset Password' : isRegister ? 'Create Official Account' : 'Sign In'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {isRecoveryMode
                  ? 'Enter your new password to complete the recovery process.'
                  : isResetMode
                    ? 'Enter your e-mail address and we will send you a password reset link.'
                    : isRegister
                  ? 'Registration is available only for e-mails and roles approved by Instructor.'
                  : 'Use your approved ABL account to access nominations, reports and rankings.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {isRegister && !isRecoveryMode && !isResetMode && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#581c1c]"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Role
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
                          {item}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      Registration works only for e-mails that were added to the allowed access list with the same role.
                    </p>
                  </div>
                </>
              )}

              {!isRecoveryMode && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#581c1c]"
                    placeholder="Email"
                  />
                </div>
              )}

              {!isResetMode && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Password
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
                  {(isRegister || isRecoveryMode) && (
                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      Minimum 10 characters. Use a mix of letters and numbers for better security.
                    </p>
                  )}
                </div>
              )}

              {isRecoveryMode && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Confirm Password
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
                  ? 'PROCESSING...'
                  : isRecoveryMode
                    ? 'UPDATE PASSWORD'
                    : isResetMode
                      ? 'SEND RESET EMAIL'
                      : isRegister
                        ? 'REGISTER'
                        : 'SIGN IN'}
              </button>
            </form>

            {!isRecoveryMode && (
              <div className="pt-2 space-y-3 text-center">
                {!isRegister && !isResetMode && (
                  <button
                    type="button"
                    onClick={openResetMode}
                    className="text-sm font-semibold text-[#57131b] transition-colors hover:text-[#f39200]"
                  >
                    Forgot password?
                  </button>
                )}
                <button
                  type="button"
                  onClick={isResetMode ? closeResetMode : toggleMode}
                  className="text-sm font-semibold text-[#f39200] transition-colors hover:text-[#581c1c]"
                >
                  {isResetMode
                    ? 'Back to sign in'
                    : isRegister
                      ? 'Already have an account? Sign in'
                      : 'New official? Request registration'}
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs leading-6 text-slate-500">
              Passwords are handled by Supabase Auth and are not readable from the application database.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
