'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="h-screen w-screen bg-[#101112] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#D6BD91] border-t-transparent animate-spin"></div>
    </div>
  );
}
