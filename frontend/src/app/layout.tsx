import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'PulseWatch — Developer API Monitoring & Incident Management',
  description: 'Enterprise-grade uptime monitoring, response time analytics, and incident alerting.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#101112] text-[#F4F1EA] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
