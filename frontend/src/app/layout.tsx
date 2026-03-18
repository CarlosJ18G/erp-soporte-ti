import type { Metadata } from 'next';
import { Public_Sans } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

const publicSans = Public_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Soporte Técnico ERP',
  description: 'Sistema de gestión de soporte técnico',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={publicSans.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
