import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  BookOpen,
  KeyRound,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AuthSession, ErpDatabase, Role } from '../types/erp';
import { generateSalt, hashPassword, verifyPassword } from '../utils/crypto';

interface LoginScreenProps {
  db: ErpDatabase;
  onLogin: (session: AuthSession) => void;
  onUpdateDb: (nextDb: ErpDatabase) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  db,
  onLogin,
  onUpdateDb,
  darkMode,
  onToggleDarkMode,
}) => {
  const [role, setRole] = useState<Role>('ADMIN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotField1, setForgotField1] = useState('');
  const [forgotField2, setForgotField2] = useState('');
  const [forgotMessage, setForgotMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleRoleSwitch = (nextRole: Role) => {
    setRole(nextRole);
    setIdentifier('');
    setPassword('');
    setShowPassword(false);
    setError('');
    setForgotMode(false);
    setForgotField1('');
    setForgotField2('');
    setForgotMessage(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedId = identifier.trim();
    if (!trimmedId || !password) {
      setError('Please enter both credentials.');
      return;
    }

    setLoading(true);
    try {
      if (role === 'ADMIN') {
        if (trimmedId.toLowerCase() !== db.admin.username.toLowerCase()) {
          setError('Invalid admin username or password.');
          return;
        }
        const ok = await verifyPassword(
          password,
          db.admin.passwordSalt,
          db.admin.passwordHash
        );
        if (!ok) {
          setError('Invalid admin username or password.');
          return;
        }
        setShowPassword(false);
        onLogin({
          role: 'ADMIN',
          userId: 'admin',
          displayName: db.admin.displayName,
          subtitle: 'Controller of Examinations & ERP Admin',
        });
      } else if (role === 'FACULTY') {
        const fac = db.faculty.find(
          (f) => f.name.toLowerCase() === trimmedId.toLowerCase()
        );
        if (!fac) {
          setError('Faculty member not found. Check exact faculty name.');
          return;
        }
        const ok = await verifyPassword(
          password,
          fac.passwordSalt,
          fac.passwordHash
        );
        if (!ok) {
          setError('Incorrect faculty password.');
          return;
        }
        setShowPassword(false);
        onLogin({
          role: 'FACULTY',
          userId: fac.id,
          displayName: fac.name,
          subtitle: `Department of ${fac.department} · Faculty Portal`,
        });
      } else {
        const stu = db.students.find(
          (s) => s.registerNumber.toLowerCase() === trimmedId.toLowerCase()
        );
        if (!stu) {
          setError('Register number not found.');
          return;
        }
        const candidatePw = stu.isDefaultPassword
          ? password.trim().toUpperCase()
          : password;
        const ok = await verifyPassword(
          candidatePw,
          stu.passwordSalt,
          stu.passwordHash
        );
        if (!ok) {
          setError('Incorrect student password.');
          return;
        }
        setShowPassword(false);
        onLogin({
          role: 'STUDENT',
          userId: stu.id,
          displayName: stu.name,
          subtitle: `${stu.registerNumber} · ${stu.branch} · ${stu.year} · Sec ${stu.section}`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);
    const val1 = forgotField1.trim();
    const val2 = forgotField2.trim();

    if (!val1 || !val2) {
      setForgotMessage({
        type: 'error',
        text: 'Details do not match. Ask the admin to reset.',
      });
      return;
    }

    if (role === 'STUDENT') {
      const idx = db.students.findIndex(
        (s) =>
          s.registerNumber.toLowerCase() === val1.toLowerCase() &&
          s.name.toLowerCase() === val2.toLowerCase()
      );
      if (idx === -1) {
        setForgotMessage({
          type: 'error',
          text: 'Details do not match. Ask the admin to reset.',
        });
        return;
      }
      const student = db.students[idx];
      const newSalt = generateSalt();
      const newHash = await hashPassword(
        student.registerNumber.toUpperCase(),
        newSalt
      );
      const nextStudents = [...db.students];
      nextStudents[idx] = {
        ...student,
        passwordSalt: newSalt,
        passwordHash: newHash,
        isDefaultPassword: true,
      };
      onUpdateDb({ ...db, students: nextStudents });
      setForgotMessage({
        type: 'success',
        text: 'Log in and change your password',
      });
    } else if (role === 'FACULTY') {
      const idx = db.faculty.findIndex(
        (f) =>
          f.name.toLowerCase() === val1.toLowerCase() &&
          f.department.toLowerCase() === val2.toLowerCase()
      );
      if (idx === -1) {
        setForgotMessage({
          type: 'error',
          text: 'Details do not match. Ask the admin to reset.',
        });
        return;
      }
      const fac = db.faculty[idx];
      const newSalt = generateSalt();
      const newHash = await hashPassword(fac.name, newSalt);
      const nextFaculty = [...db.faculty];
      nextFaculty[idx] = {
        ...fac,
        passwordSalt: newSalt,
        passwordHash: newHash,
      };
      onUpdateDb({ ...db, faculty: nextFaculty });
      setForgotMessage({
        type: 'success',
        text: 'Log in and change your password',
      });
    }
  };

  const fillDemo = (targetRole: Role, idVal: string, passVal: string) => {
    setRole(targetRole);
    setForgotMode(false);
    setShowPassword(false);
    setError('');
    setForgotMessage(null);
    setIdentifier(idVal);
    setPassword(passVal);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F1F5F9] px-4 py-6">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-[#1E3A8A] dark:text-[#93C5FD]">
            RGMCET Attendance Portal
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="min-h-[44px] px-3 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#0F172A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 inline-flex items-center gap-2 transition-colors"
          aria-label="Toggle light or dark mode"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-8">
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight">
              Attendance Defaulter List Generator
            </h1>
            <p className="text-sm text-[#475569] dark:text-slate-400 mt-1">
              RGMCET · B.Tech CSE(AI&amp;ML), II Year I-Sem 2026-27
            </p>
          </div>

          {/* Role Segmented Switch */}
          <div
            className="grid grid-cols-3 gap-1 p-1 bg-[#F1F5F9] dark:bg-slate-800 rounded mb-6"
            role="tablist"
            aria-label="Select login role"
          >
            {(
              [
                { key: 'ADMIN', label: 'Admin', icon: ShieldCheck },
                { key: 'FACULTY', label: 'Faculty', icon: BookOpen },
                { key: 'STUDENT', label: 'Student', icon: GraduationCap },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const active = role === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleRoleSwitch(key)}
                  className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-[#1E3A8A] dark:text-[#93C5FD] border border-[#CBD5E1] dark:border-slate-700'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {!forgotMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
                >
                  {role === 'ADMIN'
                    ? 'Admin Username'
                    : role === 'FACULTY'
                    ? 'Faculty Name'
                    : 'Register (Roll) Number'}
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    role === 'ADMIN'
                      ? 'e.g. admin'
                      : role === 'FACULTY'
                      ? 'e.g. G Chandana Swathi'
                      : 'e.g. 25091A33B4'
                  }
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  autoComplete="username"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
                >
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full h-[44px] pl-3 pr-12 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-0 h-[44px] w-[44px] flex items-center justify-center text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-r"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Under password field: Forgot password? for Student & Faculty, or Admin notice */}
                <div className="mt-1.5 flex items-center justify-end">
                  {role === 'ADMIN' ? (
                    <span className="text-xs text-[#64748B] dark:text-slate-400 py-1">
                      Ask the developer/admin to reset
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true);
                        setShowPassword(false);
                        setError('');
                        setForgotMessage(null);
                      }}
                      className="min-h-[44px] px-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] dark:text-[#93C5FD] hover:underline"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Forgot password?
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded bg-[#FEF2F2] dark:bg-red-950/50 border border-[#FECACA] dark:border-red-800 text-xs text-[#B91C1C] dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[44px] px-4 py-2.5 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {loading
                  ? 'Verifying...'
                  : `Sign In as ${role.charAt(0) + role.slice(1).toLowerCase()}`}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="p-3 rounded bg-[#EFF4FF] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 text-xs text-[#1E3A8A] dark:text-slate-200">
                {role === 'STUDENT'
                  ? 'Enter your Register Number and Full Name to reset your password to your default Register Number.'
                  : 'Enter your Faculty Name and Department to reset your password to your default Faculty Name.'}
              </div>

              <div>
                <label
                  htmlFor="forgot-field-1"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
                >
                  {role === 'STUDENT' ? 'Register (Roll) Number' : 'Faculty Name'}
                </label>
                <input
                  id="forgot-field-1"
                  type="text"
                  value={forgotField1}
                  onChange={(e) => setForgotField1(e.target.value)}
                  placeholder={
                    role === 'STUDENT' ? 'e.g. 25091A33B4' : 'e.g. G Chandana Swathi'
                  }
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label
                  htmlFor="forgot-field-2"
                  className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
                >
                  {role === 'STUDENT' ? 'Full Name' : 'Department'}
                </label>
                <input
                  id="forgot-field-2"
                  type="text"
                  value={forgotField2}
                  onChange={(e) => setForgotField2(e.target.value)}
                  placeholder={
                    role === 'STUDENT' ? 'e.g. Divya Sree' : 'e.g. CSE(AI&ML)'
                  }
                  className="w-full h-[44px] px-3 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              {forgotMessage && (
                <div
                  className={`flex items-start gap-2 p-3 rounded border text-xs ${
                    forgotMessage.type === 'success'
                      ? 'bg-[#ECFDF5] dark:bg-emerald-950/50 border-[#A7F3D0] dark:border-emerald-800 text-[#047857] dark:text-emerald-300'
                      : 'bg-[#FEF2F2] dark:bg-red-950/50 border-[#FECACA] dark:border-red-800 text-[#B91C1C] dark:text-red-300'
                  }`}
                >
                  {forgotMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{forgotMessage.text}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setForgotMessage(null);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#1E3A8A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800"
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] px-4 py-2 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-slate-800">
            <div className="text-xs font-semibold text-[#475569] dark:text-slate-400 mb-2.5">
              Demo Accounts (Click to Fill):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('ADMIN', 'admin', 'rgmcet')}
                className="min-h-[44px] px-2.5 py-1.5 text-left rounded border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/60 hover:bg-[#EFF4FF] dark:hover:bg-slate-800 transition-colors"
              >
                <div className="text-xs font-bold text-[#1E3A8A] dark:text-[#93C5FD]">
                  Admin
                </div>
                <div className="font-mono text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                  admin / rgmcet
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  fillDemo('FACULTY', 'G Chandana Swathi', 'G Chandana Swathi')
                }
                className="min-h-[44px] px-2.5 py-1.5 text-left rounded border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/60 hover:bg-[#EFF4FF] dark:hover:bg-slate-800 transition-colors"
              >
                <div className="text-xs font-bold text-[#1E3A8A] dark:text-[#93C5FD]">
                  Faculty (OOPJ)
                </div>
                <div className="font-mono text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                  G Chandana Swathi
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  fillDemo('STUDENT', '25091A33B4', '25091A33B4')
                }
                className="min-h-[44px] px-2.5 py-1.5 text-left rounded border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/60 hover:bg-[#EFF4FF] dark:hover:bg-slate-800 transition-colors"
              >
                <div className="text-xs font-bold text-[#1E3A8A] dark:text-[#93C5FD]">
                  Student (Sec B)
                </div>
                <div className="font-mono text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                  25091A33B4
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[#64748B] dark:text-slate-500">
        RGMCET Academic Attendance &amp; Defaulter Governance · Offline-Ready Browser Storage
      </div>
    </div>
  );
};
