import { NextRequest, NextResponse } from 'next/server';
import { getLeads, parseLeadProfile } from '@/lib/db/source-db';
import { getOutreachRecord, getTrackedLeadIds, getLeadScore, hasScores } from '@/lib/db/outreach-db';
import type { LeadWithOutreach, OutreachStatus, SortOption } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get('sourceId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') as OutreachStatus | 'all' | null;
    const sortBy = searchParams.get('sortBy') as SortOption || 'score_desc';
    
    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId is required' },
        { status: 400 }
      );
    }
    
    // Check if ML scores are available for this source
    const scoresAvailable = hasScores(sourceId);
    
    // If sorting by score but no scores available, fall back to date_asc
    const effectiveSortBy = (sortBy === 'score_desc' || sortBy === 'score_asc') && !scoresAvailable
      ? 'date_asc'
      : sortBy;
    
    // Get all leads from source with sorting
    const { leads, total } = getLeads(sourceId, { page, limit, search, sortBy: effectiveSortBy });
    
    // Enhance with outreach data, parsed profiles, and ML scores
    const leadsWithOutreach: LeadWithOutreach[] = leads.map(lead => {
      const outreach = getOutreachRecord(sourceId, lead.id);
      const profile = parseLeadProfile(lead);
      const mlScore = getLeadScore(sourceId, lead.id) ?? undefined;
      
      return {
        ...lead,
        profile,
        outreach,
        mlScore,
      };
    });
    
    // Filter by status if specified
    let filtered = leadsWithOutreach;
    if (status && status !== 'all') {
      filtered = leadsWithOutreach.filter(lead => {
        const currentStatus = lead.outreach?.outreach_status || 'pending';
        return currentStatus === status;
      });
    }
    
    return NextResponse.json({
      leads: filtered,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      sortBy: effectiveSortBy,
      scoresAvailable,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
