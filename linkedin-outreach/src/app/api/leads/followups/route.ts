import { NextRequest, NextResponse } from 'next/server';
import { getLead, parseLeadProfile } from '@/lib/db/source-db';
import { getFollowUpsDue, getOutreachRecord } from '@/lib/db/outreach-db';
import type { LeadWithOutreach } from '@/types';

// Get leads that need follow-up
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get('sourceId');
    
    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId is required' },
        { status: 400 }
      );
    }
    
    const followUpLeadIds = getFollowUpsDue(sourceId);
    
    const leads: LeadWithOutreach[] = [];
    
    for (const leadId of followUpLeadIds) {
      const lead = getLead(sourceId, leadId);
      if (!lead) continue;
      
      const outreach = getOutreachRecord(sourceId, leadId);
      const profile = parseLeadProfile(lead);
      
      leads.push({
        ...lead,
        profile,
        outreach,
      });
    }
    
    return NextResponse.json({
      leads,
      total: leads.length,
    });
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups' },
      { status: 500 }
    );
  }
}
