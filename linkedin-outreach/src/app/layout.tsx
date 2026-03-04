'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './globals.css';

// Source context for sharing selected source across the app
interface SourceContextType {
  sourceId: string;
  setSourceId: (id: string) => void;
  sources: { id: string; name: string; stats?: { pending: number; reached_out: number; replied: number; ignored: number } }[];
}

export const SourceContext = createContext<SourceContextType>({
  sourceId: '',
  setSourceId: () => {},
  sources: [],
});

export function useSource() {
  return useContext(SourceContext);
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sourceId, setSourceId] = useState<string>('');
  const [sources, setSources] = useState<SourceContextType['sources']>([]);

  useEffect(() => {
    fetch('/api/sources')
      .then((res) => res.json())
      .then((data) => {
        setSources(data.sources || []);
        if (data.sources?.length > 0 && !sourceId) {
          setSourceId(data.sources[0].id);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[hsl(var(--background))]">
        <SourceContext.Provider value={{ sourceId, setSourceId, sources }}>
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </SourceContext.Provider>
      </body>
    </html>
  );
}

function Header() {
  const { sourceId, setSourceId, sources } = useSource();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background))]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center">
                <svg className="w-4 h-4 text-[hsl(var(--primary-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="font-semibold text-[hsl(var(--foreground))]">Outreach</span>
            </Link>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink href="/" label="Queue" active={pathname === '/'} />
              <NavLink href="/leads" label="All Leads" active={pathname === '/leads'} />
              <NavLink href="/followups" label="Follow-ups" active={pathname === '/followups'} />
            </nav>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Source selector */}
            <div className="relative">
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="h-9 pl-3 pr-8 text-sm rounded-lg border-[hsl(var(--input))] bg-[hsl(var(--background))] appearance-none cursor-pointer"
              >
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                    {source.stats && ` (${source.stats.pending} pending)`}
                  </option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {/* Keyboard shortcuts hint */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 bg-[hsl(var(--muted))] rounded text-[hsl(var(--muted-foreground))] font-mono text-[10px]">?</kbd>
              <span>for shortcuts</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile nav */}
      <div className="md:hidden border-t border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-1 py-2">
            <NavLink href="/" label="Queue" active={pathname === '/'} />
            <NavLink href="/leads" label="Leads" active={pathname === '/leads'} />
            <NavLink href="/followups" label="Follow-ups" active={pathname === '/followups'} />
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
          : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]'
      }`}
    >
      {label}
    </Link>
  );
}
