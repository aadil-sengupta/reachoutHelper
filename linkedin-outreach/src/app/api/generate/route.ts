import { NextRequest, NextResponse } from 'next/server';
import { getLead, parseLeadProfile, getCampaign } from '@/lib/db/source-db';
import { getSource } from '@/lib/db/sources';
import { generateInitialMessage, applyTemplate } from '@/lib/llm';

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
    
    let message: string;
    
    if (type === 'simple') {
      // Use simple template
      message = applyTemplate(source.templates.simple, profile);
    } else {
      // Use LLM
      const campaign = getCampaign(sourceId);
      message = await generateInitialMessage(profile, campaign);
    }
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error generating message:', error);
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    );
  }
}
