import { NextRequest, NextResponse } from 'next/server';
import { getLead, parseLeadProfile, getCampaign } from '@/lib/db/source-db';
import { getSource } from '@/lib/db/sources';
import { getOutreachRecord } from '@/lib/db/outreach-db';
import { generateFollowUpMessage, applyTemplate } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, leadId, type } = body;
    
    if (!sourceId || !leadId) {
      return NextResponse.json(
        { error: 'sourceId and leadId are required' },
        { status: 400 }
      );
    }
    
    const source = getSource(sourceId);
    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }
    
    const lead = getLead(sourceId, leadId);
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    const profile = parseLeadProfile(lead);
    if (!profile) {
      return NextResponse.json(
        { error: 'Could not parse lead profile' },
        { status: 400 }
      );
    }
    
    const outreach = getOutreachRecord(sourceId, leadId);
    const followUpCount = outreach?.follow_up_count || 0;
    
    let message: string;
    
    if (type === 'simple') {
      // Use simple template based on follow-up count
      const template = followUpCount === 0 
        ? source.templates.followup1 
        : source.templates.followup2;
      message = applyTemplate(template, profile);
    } else {
      // Use LLM
      const campaign = getCampaign(sourceId);
      message = await generateFollowUpMessage(profile, followUpCount, campaign);
    }
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error generating follow-up:', error);
    return NextResponse.json(
      { error: 'Failed to generate follow-up' },
      { status: 500 }
    );
  }
}
