import { NextRequest, NextResponse } from 'next/server';
import { getLeads, parseLeadProfile } from '@/lib/db/source-db';
import { getOutreachRecord, getTrackedLeadIds } from '@/lib/db/outreach-db';
import type { LeadWithOutreach, OutreachStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get('sourceId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') as OutreachStatus | 'all' | null;
    
    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId is required' },
        { status: 400 }
      );
    }
    
    // Get all leads from source
    const { leads, total } = getLeads(sourceId, { page, limit, search });
    
    // Enhance with outreach data and parsed profiles
    const leadsWithOutreach: LeadWithOutreach[] = leads.map(lead => {
      const outreach = getOutreachRecord(sourceId, lead.id);
      const profile = parseLeadProfile(lead);
      
      return {
        ...lead,
        profile,
        outreach,
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
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
