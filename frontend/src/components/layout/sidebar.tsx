'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, AlertTriangle, LayoutDashboard } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Monitors', href: '/monitors', icon: Activity },
  { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#151617] border-r border-[#30302E] flex flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none">
      <div>
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#30302E]">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#1B1C1E] border border-[#30302E] flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D6BD91] animate-pulse"></span>
            </div>
            <span className="font-semibold text-lg tracking-wider text-[#F4F1EA]">
              PULSE<span className="text-[#D6BD91]">WATCH</span>
            </span>
          </Link>
        </div>

        {/* Navigation links */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1B1C1E] text-[#D6BD91] border border-[#30302E]'
                    : 'text-[#A5A29B] hover:text-[#F4F1EA] hover:bg-[#1B1C1E]/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#D6BD91]' : 'text-[#77756F]'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#30302E]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#57A97A]"></span>
          <span className="text-xs text-[#A5A29B]">Engine: Active &bull; UTC</span>
        </div>
      </div>
    </aside>
  );
}
