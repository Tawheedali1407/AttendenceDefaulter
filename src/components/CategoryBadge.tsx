import React from 'react';
import { AttendanceCategory } from '../types/erp';

interface CategoryBadgeProps {
  category: AttendanceCategory;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  if (category === 'REGULAR') {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] bg-[#ECFDF5] dark:bg-emerald-950 text-[#047857] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800 whitespace-nowrap shrink-0">
        Regular
      </span>
    );
  }
  if (category === 'CONDONATION') {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] bg-[#FFFBEB] dark:bg-amber-950 text-[#B45309] dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800 whitespace-nowrap shrink-0">
        Condonation
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] bg-[#FEF2F2] dark:bg-red-950 text-[#B91C1C] dark:text-red-300 border border-[#FECACA] dark:border-red-800 whitespace-nowrap shrink-0">
      Detained
    </span>
  );
};
