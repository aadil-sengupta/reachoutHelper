'use client';

import { useState } from 'react';
import type { LeadWithOutreach, Position, Education } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ScoreBadge } from '@/components/ui/ScoreBadge';

function formatDateRange(range: { start: { year: number; month?: number } | null; end: { year: number; month?: number } | null } | null): string {
  if (!range) return '';
  
  const formatPart = (part: { year: number; month?: number } | null) => {
    if (!part) return 'Present';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (part.month) {
      return `${months[part.month - 1]} ${part.year}`;
    }
    return part.year.toString();
  };
  
  return `${formatPart(range.start)} - ${formatPart(range.end)}`;
}

function calculateDuration(range: { start: { year: number; month?: number } | null; end: { year: number; month?: number } | null } | null): string {
  if (!range || !range.start) return '';
  
  const startDate = new Date(range.start.year, (range.start.month || 1) - 1);
  const endDate = range.end 
    ? new Date(range.end.year, (range.end.month || 1) - 1)
    : new Date();
  
  const months = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years > 0 && remainingMonths > 0) {
    return `${years} yr ${remainingMonths} mo`;
  } else if (years > 0) {
    return `${years} yr${years > 1 ? 's' : ''}`;
  } else {
    return `${remainingMonths} mo`;
  }
}

interface LeadCardProps {
  lead: LeadWithOutreach;
  expanded?: boolean;
  showScore?: boolean;
}

export function LeadCard({ lead, expanded = false, showScore = true }: LeadCardProps) {
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showAllPositions, setShowAllPositions] = useState(false);
  const profile = lead.profile;
  const status = lead.outreach?.outreach_status || 'pending';
  
  if (!profile) {
    return (
      <div className="card p-6">
        <p className="text-[hsl(var(--muted-foreground))]">Could not load profile data</p>
      </div>
    );
  }

  const summaryLength = profile.summary?.length || 0;
  const shouldTruncateSummary = summaryLength > 500 && !showFullSummary;
  const positionsToShow = showAllPositions ? profile.positions : profile.positions?.slice(0, 3);
  
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[hsl(var(--border))]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] truncate">
                {profile.full_name}
              </h2>
              {profile.url && (
                <a
                  href={profile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0A66C2] flex items-center justify-center hover:opacity-90 transition-opacity"
                  title="View on LinkedIn"
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              )}
            </div>
            <p className="text-[hsl(var(--muted-foreground))] mt-2 leading-relaxed">
              {profile.headline}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              {profile.location_name && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {profile.location_name}
                </span>
              )}
              {profile.industry && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {profile.industry.name}
                </span>
              )}
              {profile.connection_distance && (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  {profile.connection_distance === 'DISTANCE_2' ? '2nd' : 
                   profile.connection_distance === 'DISTANCE_3' ? '3rd' : 
                   profile.connection_distance === 'OUT_OF_NETWORK' ? '3rd+' : profile.connection_distance}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {showScore && <ScoreBadge score={lead.mlScore} />}
            <StatusBadge status={status} />
          </div>
        </div>
      </div>
      
      {/* Summary */}
      {profile.summary && (
        <div className="p-6 border-b border-[hsl(var(--border))]">
          <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
            About
          </h3>
          <div className="relative">
            <p className={`text-sm text-[hsl(var(--foreground))] leading-relaxed whitespace-pre-wrap ${shouldTruncateSummary ? 'line-clamp-6' : ''}`}>
              {profile.summary}
            </p>
            {summaryLength > 500 && (
              <button
                onClick={() => setShowFullSummary(!showFullSummary)}
                className="mt-2 text-sm font-medium text-[hsl(var(--primary))] hover:underline"
              >
                {showFullSummary ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Experience */}
      {profile.positions && profile.positions.length > 0 && (
        <div className="p-6 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              Experience
            </h3>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {profile.positions.length} position{profile.positions.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-5">
            {positionsToShow?.map((position: Position, idx: number) => (
              <div key={idx} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[hsl(var(--foreground))]">{position.title}</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{position.company_name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <span>{formatDateRange(position.date_range)}</span>
                    {position.date_range && (
                      <>
                        <span>·</span>
                        <span>{calculateDuration(position.date_range)}</span>
                      </>
                    )}
                    {position.location && (
                      <>
                        <span>·</span>
                        <span>{position.location}</span>
                      </>
                    )}
                  </div>
                  {position.description && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2 leading-relaxed line-clamp-3">
                      {position.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {profile.positions.length > 3 && (
            <button
              onClick={() => setShowAllPositions(!showAllPositions)}
              className="mt-4 text-sm font-medium text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
            >
              {showAllPositions ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7-7 7 7" />
                  </svg>
                  Show less
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                  Show {profile.positions.length - 3} more positions
                </>
              )}
            </button>
          )}
        </div>
      )}
      
      {/* Education */}
      {profile.educations && profile.educations.length > 0 && (
        <div className="p-6">
          <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-4">
            Education
          </h3>
          <div className="space-y-4">
            {profile.educations.map((edu: Education, idx: number) => (
              <div key={idx} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[hsl(var(--muted-foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[hsl(var(--foreground))]">{edu.school_name}</p>
                  {(edu.degree_name || edu.field_of_study) && (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {[edu.degree_name, edu.field_of_study].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {edu.date_range && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {formatDateRange(edu.date_range)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick contact info if available */}
      {(lead.email || lead.phone || lead.website) && (
        <div className="px-6 py-4 bg-[hsl(var(--muted))]/30 border-t border-[hsl(var(--border))]">
          <div className="flex flex-wrap gap-4 text-sm">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {lead.email}
              </a>
            )}
            {lead.phone && (
              <span className="inline-flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {lead.phone}
              </span>
            )}
            {lead.website && (
              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Website
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
