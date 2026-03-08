import { NextRequest, NextResponse } from 'next/server';
import { getLead, parseLeadProfile } from '@/lib/db/source-db';
import { refineMessage } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, leadId, currentMessage, refinementPrompt } = body;
    
    if (!sourceId || !leadId || !currentMessage || !refinementPrompt) {
      return NextResponse.json(
        { error: 'sourceId, leadId, currentMessage, and refinementPrompt are required' },
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
    
    const message = await refineMessage(currentMessage, refinementPrompt, profile);
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error refining message:', error);
    return NextResponse.json(
      { error: 'Failed to refine message' },
      { status: 500 }
    );
  }
}
