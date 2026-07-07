import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LifeLedger',
  description: 'FHIR-first health wallet with consent-scoped access.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
