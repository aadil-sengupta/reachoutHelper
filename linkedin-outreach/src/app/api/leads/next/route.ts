import { NextRequest, NextResponse } from 'next/server';
import { getLeads, getLead, parseLeadProfile } from '@/lib/db/source-db';
import { getOutreachRecord, getTrackedLeadIds, getPendingLeadIdsSortedByScore, getLeadScore, hasScores } from '@/lib/db/outreach-db';
import type { LeadWithOutreach, SortOption } from '@/types';

// Get the next pending lead for queue mode
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get('sourceId');
    const afterId = searchParams.get('afterId');
    const sortBy = searchParams.get('sortBy') as SortOption || 'score_desc';
    
    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId is required' },
        { status: 400 }
      );
    }
    
    // Check if ML scores are available
    const scoresAvailable = hasScores(sourceId);
    
    // Determine effective sort order
    const effectiveSortBy = (sortBy === 'score_desc' || sortBy === 'score_asc') && !scoresAvailable
      ? 'date_asc'
      : sortBy;
    
    // Get leads sorted appropriately
    const { leads } = getLeads(sourceId, { page: 1, limit: 1000, sortBy: effectiveSortBy });
    
    // Get tracked lead IDs (ones we've already processed)
    const trackedIds = new Set(getTrackedLeadIds(sourceId));
    
    // Find the next pending lead
    // If afterId is specified, start after that lead in the sorted list
    let foundAfter = !afterId;
    
    for (const lead of leads) {
      if (afterId && lead.id === parseInt(afterId)) {
        foundAfter = true;
        continue;
      }
      
      if (!foundAfter) continue;
      
      const outreach = getOutreachRecord(sourceId, lead.id);
      const status = outreach?.outreach_status || 'pending';
      
      if (status === 'pending') {
        const profile = parseLeadProfile(lead);
        const mlScore = getLeadScore(sourceId, lead.id) ?? undefined;
        
        const leadWithOutreach: LeadWithOutreach = {
          ...lead,
          profile,
          outreach,
          mlScore,
        };
        
        return NextResponse.json({ 
          lead: leadWithOutreach,
          sortBy: effectiveSortBy,
          scoresAvailable,
        });
      }
    }
    
    // No more pending leads
    return NextResponse.json({ 
      lead: null, 
      message: 'No more pending leads',
      sortBy: effectiveSortBy,
      scoresAvailable,
    });
  } catch (error) {
    console.error('Error fetching next lead:', error);
    return NextResponse.json(
      { error: 'Failed to fetch next lead' },
      { status: 500 }
    );
  }
}
