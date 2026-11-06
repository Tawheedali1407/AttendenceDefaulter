import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { AuthSession, ErpDatabase } from '../types/erp';
import { generateSalt, hashPassword, verifyPassword } from '../utils/crypto';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AuthSession;
  db: ErpDatabase;
  onUpdateDb: (nextDb: ErpDatabase) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  session,
  db,
  onUpdateDb,
}) => {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!currentPw || !newPw || !confirmPw) {
      setStatus({ type: 'error', text: 'All password fields are required.' });
      return;
    }
    if (newPw.trim().length === 0) {
      setStatus({ type: 'error', text: 'Password cannot be empty.' });
      return;
    }
    if (newPw !== confirmPw) {
      setStatus({
        type: 'error',
        text: 'New password and confirmation do not match.',
      });
      return;
    }

    if (session.role === 'ADMIN') {
      const ok = await verifyPassword(
        currentPw,
        db.admin.passwordSalt,
        db.admin.passwordHash
      );
      if (!ok) {
        setStatus({ type: 'error', text: 'Current password is incorrect.' });
        return;
      }
      const salt = generateSalt();
      const hash = await hashPassword(newPw, salt);
      onUpdateDb({
        ...db,
        admin: { ...db.admin, passwordSalt: salt, passwordHash: hash },
      });
    } else if (session.role === 'FACULTY') {
      const idx = db.faculty.findIndex((f) => f.id === session.userId);
      if (idx === -1) return;
      const fac = db.faculty[idx];
      const ok = await verifyPassword(
        currentPw,
        fac.passwordSalt,
        fac.passwordHash
      );
      if (!ok) {
        setStatus({ type: 'error', text: 'Current password is incorrect.' });
        return;
      }
      const salt = generateSalt();
      const hash = await hashPassword(newPw, salt);
      const nextFaculty = [...db.faculty];
      nextFaculty[idx] = { ...fac, passwordSalt: salt, passwordHash: hash };
      onUpdateDb({ ...db, faculty: nextFaculty });
    } else {
      const idx = db.students.findIndex((s) => s.id === session.userId);
      if (idx === -1) return;
      const stu = db.students[idx];
      const candidateCurrent = stu.isDefaultPassword
        ? currentPw.trim().toUpperCase()
        : currentPw;
      const ok = await verifyPassword(
        candidateCurrent,
        stu.passwordSalt,
        stu.passwordHash
      );
      if (!ok) {
        setStatus({ type: 'error', text: 'Current password is incorrect.' });
        return;
      }
      const salt = generateSalt();
      const hash = await hashPassword(newPw, salt);
      const nextStudents = [...db.students];
      nextStudents[idx] = {
        ...stu,
        passwordSalt: salt,
        passwordHash: hash,
        isDefaultPassword: false,
      };
      onUpdateDb({ ...db, students: nextStudents });
    }

    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setStatus({
      type: 'success',
      text: 'Password updated and hashed successfully.',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-pw-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg border border-[#CBD5E1] dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between bg-[#F8FAFC] dark:bg-slate-800/50">
          <h2
            id="change-pw-title"
            className="text-base font-bold text-[#0F172A] dark:text-white"
          >
            Change Password
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-[#475569] dark:text-slate-400 hover:bg-[#E2E8F0] dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label
              htmlFor="cp-current"
              className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
            >
              Current Password
            </label>
            <div className="relative flex items-center">
              <input
                id="cp-current"
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full h-[44px] pl-3 pr-12 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((p) => !p)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                className="absolute right-0 top-0 h-[44px] w-[44px] flex items-center justify-center text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
              >
                {showCurrent ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="cp-new"
              className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
            >
              New Password
            </label>
            <div className="relative flex items-center">
              <input
                id="cp-new"
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full h-[44px] pl-3 pr-12 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
              <button
                type="button"
                onClick={() => setShowNew((p) => !p)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                className="absolute right-0 top-0 h-[44px] w-[44px] flex items-center justify-center text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
              >
                {showNew ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="cp-confirm"
              className="block text-xs font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
            >
              Confirm New Password
            </label>
            <div className="relative flex items-center">
              <input
                id="cp-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full h-[44px] pl-3 pr-12 text-sm rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-950 text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="absolute right-0 top-0 h-[44px] w-[44px] flex items-center justify-center text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white"
              >
                {showConfirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {status && (
            <div
              className={`flex items-center gap-2 p-3 rounded border text-xs ${
                status.type === 'success'
                  ? 'bg-[#ECFDF5] dark:bg-emerald-950/50 border-[#A7F3D0] dark:border-emerald-800 text-[#047857] dark:text-emerald-300'
                  : 'bg-[#FEF2F2] dark:bg-red-950/50 border-[#FECACA] dark:border-red-800 text-[#B91C1C] dark:text-red-300'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{status.text}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded border border-[#CBD5E1] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#1E3A8A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-800"
            >
              Close
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold transition-colors"
            >
              Save New Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
