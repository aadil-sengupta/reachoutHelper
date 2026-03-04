'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSource } from '../layout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import type { LeadWithOutreach, OutreachStatus } from '@/types';

export default function LeadsPage() {
  const { sourceId } = useSource();
  const [leads, setLeads] = useState<LeadWithOutreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OutreachStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLead, setSelectedLead] = useState<LeadWithOutreach | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!sourceId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        sourceId,
        page: page.toString(),
        limit: '25',
      });
      
      if (filter !== 'all') {
        params.set('status', filter);
      }
      if (search) {
        params.set('search', search);
      }

      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();

      setLeads(data.leads || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [sourceId, page, filter, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const updateStatus = async (leadId: number, status: OutreachStatus) => {
    try {
      await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          leadId,
          action: 'update_status',
          status,
        }),
      });
      fetchLeads();
    } catch (err) {
      console.error('Failed to update status:', err);
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
      {/* Filters bar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or company..."
              className="w-full h-10 pl-10 pr-4 text-sm rounded-lg"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Status:</span>
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as OutreachStatus | 'all')}
                className="h-10 pl-3 pr-8 text-sm rounded-lg appearance-none cursor-pointer"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="reached_out">Reached Out</option>
                <option value="replied">Replied</option>
                <option value="ignored">Ignored</option>
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Refresh button */}
          <Button variant="ghost" size="sm" onClick={fetchLeads}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            No leads found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider hidden md:table-cell">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-[hsl(var(--muted))]/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-[hsl(var(--foreground))]">
                        {lead.profile?.full_name || `${lead.first_name} ${lead.last_name}`}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-[hsl(var(--muted-foreground))] max-w-[200px] truncate">
                        {lead.profile?.headline || lead.title || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        {lead.company_name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        {lead.profile?.location_name || lead.city_name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={lead.outreach?.outreach_status || 'pending'} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {lead.profile?.url && (
                          <a
                            href={lead.profile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[hsl(var(--primary))] hover:underline"
                          >
                            LinkedIn
                          </a>
                        )}
                        <div className="relative">
                          <select
                            value={lead.outreach?.outreach_status || 'pending'}
                            onChange={(e) => updateStatus(lead.id, e.target.value as OutreachStatus)}
                            className="h-8 pl-2 pr-6 text-xs rounded-lg appearance-none cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="pending">Pending</option>
                            <option value="reached_out">Reached Out</option>
                            <option value="replied">Replied</option>
                            <option value="ignored">Ignored</option>
                          </select>
                          <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[hsl(var(--muted-foreground))] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lead detail modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          sourceId={sourceId}
          onClose={() => setSelectedLead(null)}
          onUpdate={fetchLeads}
        />
      )}
    </div>
  );
}

function LeadDetailModal({
  lead,
  sourceId,
  onClose,
  onUpdate,
}: {
  lead: LeadWithOutreach;
  sourceId: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const profile = lead.profile;

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Modal */}
      <div
        className="relative bg-[hsl(var(--card))] rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-[hsl(var(--border))] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[hsl(var(--border))] sticky top-0 bg-[hsl(var(--card))]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] truncate">
                {profile?.full_name || `${lead.first_name} ${lead.last_name}`}
              </h2>
              <p className="text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
                {profile?.headline || lead.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Company" value={lead.company_name} />
            <InfoItem label="Location" value={profile?.location_name || lead.city_name} />
            <InfoItem label="Status">
              <StatusBadge status={lead.outreach?.outreach_status || 'pending'} />
            </InfoItem>
            {lead.outreach?.outreach_date && (
              <InfoItem 
                label="Reached out" 
                value={new Date(lead.outreach.outreach_date).toLocaleDateString()} 
              />
            )}
          </div>

          {/* Summary */}
          {profile?.summary && (
            <div>
              <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
                About
              </h3>
              <p className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                {profile.summary}
              </p>
            </div>
          )}

          {/* LinkedIn link */}
          {profile?.url && (
            <a
              href={profile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[hsl(var(--primary))] hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on LinkedIn
            </a>
          )}

          {/* Conversation */}
          {lead.outreach?.conversation && lead.outreach.conversation.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                Conversation
              </h3>
              <div className="space-y-3">
                {lead.outreach.conversation.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] ml-8'
                        : 'bg-[hsl(var(--muted))] mr-8'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-medium ${
                        msg.role === 'user' 
                          ? 'text-[hsl(var(--primary-foreground))]/70' 
                          : 'text-[hsl(var(--muted-foreground))]'
                      }`}>
                        {msg.role === 'user' ? 'You' : profile?.first_name || 'Lead'}
                      </span>
                      <span className={`text-xs ${
                        msg.role === 'user' 
                          ? 'text-[hsl(var(--primary-foreground))]/50' 
                          : 'text-[hsl(var(--muted-foreground))]/70'
                      }`}>
                        {new Date(msg.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-[hsl(var(--muted-foreground))]">{label}</span>
      <div className="mt-0.5 text-sm text-[hsl(var(--foreground))]">
        {children || value || '-'}
      </div>
    </div>
  );
}
