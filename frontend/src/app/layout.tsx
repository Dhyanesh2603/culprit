import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Who Broke The Build? | Incident Intelligence & Attribution',
  description:
    'Engineering platform for investigating production failures, deployments, and root cause attribution.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-primary min-h-screen antialiased flex flex-col selection:bg-accent/30 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
