'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSource } from '../layout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { MessageGenerator } from '@/components/outreach/MessageGenerator';
import type { LeadWithOutreach } from '@/types';

interface FollowUpLead extends LeadWithOutreach {
  daysSinceOutreach: number;
}

export default function FollowupsPage() {
  const { sourceId } = useSource();
  const [leads, setLeads] = useState<FollowUpLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<FollowUpLead | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const fetchFollowups = useCallback(async () => {
    if (!sourceId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/leads/followups?sourceId=${sourceId}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const copyMessage = async () => {
    if (!currentMessage) return;
    try {
      await navigator.clipboard.writeText(currentMessage);
      showToast('Copied to clipboard');
    } catch (err) {
      console.error(err);
    }
  };

  const markFollowupSent = async (lead: FollowUpLead) => {
    try {
      await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          leadId: lead.id,
          action: 'followup_sent',
          message: currentMessage,
        }),
      });
      showToast('Follow-up marked as sent');
      setSelectedLead(null);
      setCurrentMessage('');
      fetchFollowups();
    } catch (err) {
      console.error(err);
    }
  };

  const markIgnored = async (lead: FollowUpLead) => {
    try {
      await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          leadId: lead.id,
          action: 'update_status',
          status: 'ignored',
        }),
      });
      showToast('Marked as ignored');
      setSelectedLead(null);
      fetchFollowups();
    } catch (err) {
      console.error(err);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[hsl(var(--foreground))]">Follow-ups Due</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
              Leads that haven't replied after 7+ days
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--muted))] rounded-full">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                {leads.length}
              </span>
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                need follow-up
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchFollowups}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : leads.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">No Follow-ups Due</h2>
            <p className="text-[hsl(var(--muted-foreground))]">All caught up! Check back later.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: List */}
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => {
                  setSelectedLead(lead);
                  setCurrentMessage('');
                }}
                className={`card p-4 cursor-pointer transition-all ${
                  selectedLead?.id === lead.id
                    ? 'ring-2 ring-[hsl(var(--ring))]'
                    : 'hover:border-[hsl(var(--ring))]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-medium text-[hsl(var(--foreground))] truncate">
                      {lead.profile?.full_name || `${lead.first_name} ${lead.last_name}`}
                    </h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                      {lead.profile?.headline || lead.title}
                    </p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                      {lead.company_name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 border border-amber-200">
                      <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium text-amber-700">
                        {lead.daysSinceOutreach}d ago
                      </span>
                    </div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
                      Follow-up #{(lead.outreach?.follow_up_count || 0) + 1}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Selected lead actions */}
          <div>
            {selectedLead ? (
              <div className="space-y-6 sticky top-24">
                {/* Lead info card */}
                <div className="card p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[hsl(var(--foreground))] truncate">
                        {selectedLead.profile?.full_name}
                      </h3>
                      <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">
                        {selectedLead.profile?.headline}
                      </p>
                    </div>
                    <StatusBadge status={selectedLead.outreach?.outreach_status || 'pending'} />
                  </div>

                  {/* Previous messages */}
                  {selectedLead.outreach?.conversation &&
                    selectedLead.outreach.conversation.length > 0 && (
                      <div className="pt-4 border-t border-[hsl(var(--border))]">
                        <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                          Previous Messages
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {selectedLead.outreach.conversation.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`text-sm p-3 rounded-lg ${
                                msg.role === 'user'
                                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] ml-4'
                                  : 'bg-[hsl(var(--muted))] mr-4'
                              }`}
                            >
                              <span className={`text-xs ${
                                msg.role === 'user' 
                                  ? 'text-[hsl(var(--primary-foreground))]/70' 
                                  : 'text-[hsl(var(--muted-foreground))]'
                              }`}>
                                {msg.role === 'user' ? 'You' : selectedLead.profile?.first_name}
                              </span>
                              <p className="mt-1 line-clamp-3">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-[hsl(var(--border))]">
                    {selectedLead.profile?.url && (
                      <a
                        href={selectedLead.profile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => markIgnored(selectedLead)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Mark Ignored
                    </Button>
                  </div>
                </div>

                {/* Follow-up message generator */}
                <MessageGenerator
                  lead={selectedLead}
                  sourceId={sourceId}
                  isFollowUp={true}
                  onMessageGenerated={setCurrentMessage}
                />

                {/* Send follow-up actions */}
                {currentMessage && (
                  <div className="card p-4">
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={copyMessage}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => markFollowupSent(selectedLead)}
                        className="flex-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Mark Follow-up Sent
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card">
                <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
                  <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  <p className="text-sm">Select a lead to send a follow-up</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
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
