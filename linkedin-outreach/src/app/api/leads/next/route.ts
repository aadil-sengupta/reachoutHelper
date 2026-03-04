import { NextRequest, NextResponse } from 'next/server';
import { getLeads, getLead, parseLeadProfile } from '@/lib/db/source-db';
import { getOutreachRecord, getTrackedLeadIds } from '@/lib/db/outreach-db';
import type { LeadWithOutreach } from '@/types';

// Get the next pending lead for queue mode
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get('sourceId');
    const afterId = searchParams.get('afterId');
    
    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId is required' },
        { status: 400 }
      );
    }
    
    // Get tracked lead IDs (ones we've already processed)
    const trackedIds = new Set(getTrackedLeadIds(sourceId));
    
    // Get leads from source, paginated
    const { leads } = getLeads(sourceId, { page: 1, limit: 500 });
    
    // Find the first lead that:
    // 1. Is not tracked OR has status 'pending'
    // 2. Is after afterId if specified
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
        const leadWithOutreach: LeadWithOutreach = {
          ...lead,
          profile,
          outreach,
        };
        
        return NextResponse.json({ lead: leadWithOutreach });
      }
    }
    
    // No more pending leads
    return NextResponse.json({ lead: null, message: 'No more pending leads' });
  } catch (error) {
    console.error('Error fetching next lead:', error);
    return NextResponse.json(
      { error: 'Failed to fetch next lead' },
      { status: 500 }
    );
  }
}
