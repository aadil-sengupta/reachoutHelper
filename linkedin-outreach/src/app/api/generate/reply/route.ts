import { NextRequest, NextResponse } from 'next/server';
import { getLead, parseLeadProfile, getCampaign } from '@/lib/db/source-db';
import { getOutreachRecord } from '@/lib/db/outreach-db';
import { generateReplyMessage } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, leadId, replyPrompt } = body;
    
    if (!sourceId || !leadId || !replyPrompt) {
      return NextResponse.json(
        { error: 'sourceId, leadId, and replyPrompt are required' },
        { status: 400 }
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
    const conversation = outreach?.conversation || [];
    
    const campaign = getCampaign(sourceId);
    const message = await generateReplyMessage(profile, conversation, replyPrompt, campaign);
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error generating reply:', error);
    return NextResponse.json(
      { error: 'Failed to generate reply' },
      { status: 500 }
    );
  }
}
