'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await register(name, email, password);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101112] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded bg-[#1B1C1E] border border-[#30302E] items-center justify-center mb-3">
            <span className="w-3.5 h-3.5 rounded-full bg-[#D6BD91] animate-pulse"></span>
          </div>
          <h1 className="text-2xl font-semibold tracking-wider text-[#F4F1EA]">
            PULSE<span className="text-[#D6BD91]">WATCH</span>
          </h1>
          <p className="text-sm text-[#A5A29B] mt-1">Create your monitoring account</p>
        </div>

        {/* Register Card */}
        <div className="bg-[#1B1C1E] border border-[#30302E] rounded-lg p-8 shadow-xl">
          {error && (
            <div className="mb-6 p-3 bg-[#E05D5D]/10 border border-[#E05D5D]/30 rounded text-sm text-[#E05D5D]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#A5A29B] mb-2 font-medium">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-[#101112] border border-[#30302E] rounded px-3 py-2.5 text-sm text-[#F4F1EA] placeholder-[#77756F] focus:outline-none focus:border-[#D6BD91] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#A5A29B] mb-2 font-medium">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full bg-[#101112] border border-[#30302E] rounded px-3 py-2.5 text-sm text-[#F4F1EA] placeholder-[#77756F] focus:outline-none focus:border-[#D6BD91] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#A5A29B] mb-2 font-medium">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters (uppercase, lowercase, number)"
                className="w-full bg-[#101112] border border-[#30302E] rounded px-3 py-2.5 text-sm text-[#F4F1EA] placeholder-[#77756F] focus:outline-none focus:border-[#D6BD91] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#D6BD91] hover:bg-[#C2A77A] text-[#101112] font-semibold py-2.5 rounded text-sm transition-colors mt-2 disabled:opacity-50"
            >
              {submitting ? 'Creating Account...' : 'Get Started'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#30302E] text-center text-xs text-[#A5A29B]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#D6BD91] hover:underline font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
