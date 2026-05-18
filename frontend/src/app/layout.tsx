import './globals.css';
import Script from 'next/script';
import { ThemeProvider } from '@/lib/theme-context';
import { ReactNode } from 'react';

export const metadata = { title: 'App' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function () {
            try {
              var theme = localStorage.getItem('theme');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              var shouldUseDark = theme ? theme === 'dark' : prefersDark;
              var root = document.documentElement;
              root.classList.toggle('dark', shouldUseDark);
              root.style.colorScheme = shouldUseDark ? 'dark' : 'light';
            } catch (error) {}
          })();
        `}</Script>
      </head>
      <body className="bg-surface-canvas text-ink transition-colors duration-300">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
