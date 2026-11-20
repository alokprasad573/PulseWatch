'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { LogOut, User as UserIcon } from 'lucide-react';

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-[#151617]/80 backdrop-blur border-b border-[#30302E] px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <span className="text-xs uppercase tracking-widest text-[#77756F]">PulseWatch v1.0</span>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1B1C1E] border border-[#30302E] flex items-center justify-center text-[#D6BD91]">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-[#F4F1EA]">{user.name}</div>
              <div className="text-xs text-[#77756F]">{user.email}</div>
            </div>
          </div>
        )}

        <button
          onClick={() => logout()}
          className="p-2 text-[#77756F] hover:text-[#E05D5D] transition-colors rounded hover:bg-[#1B1C1E]"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
