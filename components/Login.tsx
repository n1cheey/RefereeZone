import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { generateRefereeLogo } from '../services/geminiService';
import { loginUser, registerUser } from '../services/authService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const roles: UserRole[] = ['Instructor', 'Table', 'Referee', 'Stuff'];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('Referee');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function fetchLogo() {
      setIsGeneratingLogo(true);
      try {
        const url = await generateRefereeLogo();
        setLogoUrl(url);
      } catch {
        setLogoUrl(null);
      } finally {
        setIsGeneratingLogo(false);
      }
    }

    fetchLogo();
  }, []);

  const toggleMode = () => {
    setIsRegister((prev) => !prev);
    setPassword('');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = isRegister
        ? await registerUser({ email, password, fullName, role })
        : await loginUser({ email, password });

      onLogin(response.user);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Произошла ошибка авторизации.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative w-36 h-36 rounded-full border-4 border-[#581c1c] overflow-hidden shadow-2xl bg-white flex items-center justify-center">
              {isGeneratingLogo ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-[#f39200] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-bold text-[#581c1c] uppercase animate-pulse">Creating Identity...</span>
                </div>
              ) : logoUrl ? (
                <img src={logoUrl} alt="Azerbaijan Basketball Referees" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#f39200] border-2 border-[#581c1c] relative overflow-hidden flex items-center justify-center">
                    <div className="absolute w-full h-0.5 bg-[#581c1c] top-1/2 -translate-y-1/2"></div>
                    <div className="absolute h-full w-0.5 bg-[#581c1c] left-1/2 -translate-x-1/2"></div>
                    <div className="absolute w-full h-full border-[3px] border-[#581c1c] rounded-full -left-1/2"></div>
                    <div className="absolute w-full h-full border-[3px] border-[#581c1c] rounded-full -right-1/2"></div>
                  </div>
                  <div className="absolute top-2 text-[6px] font-black text-[#581c1c] tracking-widest uppercase">Azerbaijan</div>
                  <div className="absolute bottom-2 text-[5px] font-black text-[#581c1c] tracking-tighter uppercase leading-none">Referees Committee</div>
                </div>
              )}
            </div>
          </div>
          <h2 className="text-3xl font-black text-[#581c1c] tracking-tight">REFZONE</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Official Azerbaijan Referees Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#581c1c] focus:border-transparent transition-all outline-none"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                <select
                  required
                  size={4}
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#581c1c] focus:border-transparent transition-all outline-none bg-white"
                >
                  {roles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-400">
                  Зарегистрироваться смогут только e-mail, которые добавлены в отдельную базу разрешённых адресов.
                </p>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#581c1c] focus:border-transparent transition-all outline-none"
              placeholder="Email"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#581c1c] focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#581c1c] text-white py-4 px-4 rounded-xl font-black shadow-lg shadow-[#581c1c]/20 hover:bg-[#4a1717] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'PROCESSING...' : isRegister ? 'REGISTER' : 'SIGN IN'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={toggleMode}
            className="text-sm font-bold text-[#f39200] hover:text-[#581c1c] transition-colors"
          >
            {isRegister ? 'Already have an account? Sign in' : 'New official? Request registration'}
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Azerbaijan Basketball Referees Union
      </div>
    </div>
  );
};

export default Login;
