import type { Metadata } from 'next';
import './globals.css';
import ThemeRegistry from './ThemeRegistry';
import NextAuthProvider from '@/components/auth/NextAuthProvider'; // Added this import

export const metadata: Metadata = {
  title: 'ERMS - GIPC',
  description: 'Electronic Record Management System',
};

export default function RootLayout({
  children,
}: { // Changed from Readonly<{ ... }> to { ... }
  children: React.ReactNode;
}) {
  // Assuming 'inter' is not defined in the original context,
  // I will not add `className={inter.className}` to avoid a syntax error.
  // The primary instruction was to wrap children with NextAuthProvider.
  // The provided snippet also implies removing `options={{ key: 'mui' }}` from ThemeRegistry.
  return (
    <html lang="en">
      <body>
        <ThemeRegistry options={{ key: 'mui' }}>
          <NextAuthProvider>
            {children}
          </NextAuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
