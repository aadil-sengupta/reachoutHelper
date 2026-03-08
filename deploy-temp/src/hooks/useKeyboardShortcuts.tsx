'use client';

import { useCallback, useEffect } from 'react';

interface KeyboardShortcuts {
  onCopy?: () => void;
  onOpenLinkedIn?: () => void;
  onMarkAndNext?: () => void;
  onSkip?: () => void;
  onNext?: () => void;
  onShowHelp?: () => void;
}

export function useKeyboardShortcuts({
  onCopy,
  onOpenLinkedIn,
  onMarkAndNext,
  onSkip,
  onNext,
  onShowHelp,
}: KeyboardShortcuts) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore if modifier keys are pressed (except for specific combos)
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'c':
          event.preventDefault();
          onCopy?.();
          break;
        case 'o':
          event.preventDefault();
          onOpenLinkedIn?.();
          break;
        case 'm':
          event.preventDefault();
          onMarkAndNext?.();
          break;
        case 's':
          event.preventDefault();
          onSkip?.();
          break;
        case 'n':
          event.preventDefault();
          onNext?.();
          break;
        case '?':
          event.preventDefault();
          onShowHelp?.();
          break;
      }
    },
    [onCopy, onOpenLinkedIn, onMarkAndNext, onSkip, onNext, onShowHelp]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Keyboard shortcuts help modal component
export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-backdrop"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Modal */}
      <div
        className="relative bg-[hsl(var(--card))] rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 border border-[hsl(var(--border))] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-3">
          <ShortcutRow shortcut="C" description="Copy message to clipboard" />
          <ShortcutRow shortcut="O" description="Open LinkedIn profile" />
          <ShortcutRow shortcut="M" description="Mark as sent & next lead" />
          <ShortcutRow shortcut="S" description="Skip this lead" />
          <ShortcutRow shortcut="N" description="Next lead (no action)" />
          <div className="border-t border-[hsl(var(--border))] my-3" />
          <ShortcutRow shortcut="?" description="Show this help" />
          <ShortcutRow shortcut="Esc" description="Close dialogs" />
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[hsl(var(--muted-foreground))]">{description}</span>
      <kbd className="min-w-[28px] h-7 px-2 inline-flex items-center justify-center bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-md text-xs font-mono text-[hsl(var(--foreground))]">
        {shortcut}
      </kbd>
    </div>
  );
}
