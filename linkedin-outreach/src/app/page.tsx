'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSource } from './layout';
import { LeadCard } from '@/components/leads/LeadCard';
import { MessageGenerator } from '@/components/outreach/MessageGenerator';
import { ConversationPanel } from '@/components/outreach/ConversationPanel';
import { Button } from '@/components/ui/Button';
import { useKeyboardShortcuts, ShortcutsHelp } from '@/hooks/useKeyboardShortcuts';
import type { LeadWithOutreach } from '@/types';

export default function QueuePage() {
  const { sourceId } = useSource();
  const [lead, setLead] = useState<LeadWithOutreach | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  const fetchNextLead = useCallback(async () => {
    if (!sourceId) return;
    
    setLoading(true);
    setError(null);
    setCurrentMessage('');
    
    try {
      const res = await fetch(`/api/leads/next?sourceId=${sourceId}`);
      const data = await res.json();
      
      if (data.lead) {
        setLead(data.lead);
      } else {
        setLead(null);
        setError('No pending leads in queue');
      }
    } catch (err) {
      setError('Failed to load lead');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    fetchNextLead();
  }, [fetchNextLead]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const copyMessage = useCallback(async () => {
    if (!currentMessage) {
      showToast('Generate a message first');
      return;
    }
    try {
      await navigator.clipboard.writeText(currentMessage);
      showToast('Copied to clipboard');
    } catch (err) {
      console.error(err);
    }
  }, [currentMessage]);

  const openLinkedIn = useCallback(() => {
    if (!lead?.profile?.url) {
      showToast('No LinkedIn URL');
      return;
    }
    window.open(lead.profile.url, '_blank');
    showToast('Opened LinkedIn');
  }, [lead]);

  const markAndNext = useCallback(async () => {
    if (!lead || !sourceId) return;
    
    setActionLoading(true);
    try {
      await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          leadId: lead.id,
          action: 'mark_sent',
          message: currentMessage,
        }),
      });
      showToast('Marked as sent');
      fetchNextLead();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }, [lead, sourceId, currentMessage, fetchNextLead]);

  const skipLead = useCallback(async () => {
    if (!lead || !sourceId) return;
    
    setActionLoading(true);
    try {
      await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          leadId: lead.id,
          action: 'skip',
        }),
      });
      showToast('Skipped');
      fetchNextLead();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }, [lead, sourceId, fetchNextLead]);

  useKeyboardShortcuts({
    onCopy: copyMessage,
    onOpenLinkedIn: openLinkedIn,
    onMarkAndNext: markAndNext,
    onSkip: skipLead,
    onNext: fetchNextLead,
    onShowHelp: () => setShowHelp(true),
  });

  if (!sourceId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-[hsl(var(--muted-foreground))]">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading sources...
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <svg className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-[hsl(var(--muted-foreground))]">Loading next lead...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-6">
          <span className="text-4xl">🎉</span>
        </div>
        <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))] mb-2">Queue Empty</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-8">{error || 'No pending leads to process'}</p>
        <Button onClick={fetchNextLead} variant="outline">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Queue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              Queue Mode
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyMessage}
              disabled={!currentMessage}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Copy</span>
              <kbd className="hidden sm:inline ml-1 px-1 py-0.5 text-[10px] bg-[hsl(var(--muted))] rounded">C</kbd>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={openLinkedIn}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="hidden sm:inline">Open</span>
              <kbd className="hidden sm:inline ml-1 px-1 py-0.5 text-[10px] bg-[hsl(var(--muted))] rounded">O</kbd>
            </Button>
            
            <div className="w-px h-6 bg-[hsl(var(--border))] hidden sm:block" />
            
            <Button
              variant="default"
              size="sm"
              onClick={markAndNext}
              disabled={actionLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="hidden sm:inline">Mark & Next</span>
              <kbd className="hidden sm:inline ml-1 px-1 py-0.5 text-[10px] bg-white/20 rounded">M</kbd>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={skipLead}
              disabled={actionLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              <span className="hidden sm:inline">Skip</span>
              <kbd className="hidden sm:inline ml-1 px-1 py-0.5 text-[10px] bg-[hsl(var(--muted))] rounded">S</kbd>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchNextLead}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
              <span className="hidden sm:inline">Next</span>
              <kbd className="hidden sm:inline ml-1 px-1 py-0.5 text-[10px] bg-[hsl(var(--muted))] rounded">N</kbd>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content - two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Lead info */}
        <div>
          <LeadCard lead={lead} />
        </div>

        {/* Right: Message generation */}
        <div className="space-y-6">
          <MessageGenerator
            lead={lead}
            sourceId={sourceId}
            onMessageGenerated={setCurrentMessage}
          />
          
          <ConversationPanel
            lead={lead}
            sourceId={sourceId}
            onUpdate={fetchNextLead}
          />
        </div>
      </div>

      {/* Help modal */}
      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-[hsl(var(--foreground))] text-[hsl(var(--background))] px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
