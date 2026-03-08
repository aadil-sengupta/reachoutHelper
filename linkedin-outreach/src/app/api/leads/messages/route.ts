import { NextRequest, NextResponse } from 'next/server';
import { getLead, parseLeadProfile } from '@/lib/db/source-db';
import { getLeadMessages, saveLeadMessages, hasLeadMessages } from '@/lib/db/outreach-db';
import { getSource } from '@/lib/db/sources';
import { generateConnectionMessages } from '@/lib/llm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get('sourceId');
    const leadId = searchParams.get('leadId');

    if (!sourceId || !leadId) {
      return NextResponse.json(
        { error: 'sourceId and leadId are required' },
        { status: 400 }
      );
    }

    const leadIdNum = parseInt(leadId);
    const messages = getLeadMessages(sourceId, leadIdNum);

    if (messages) {
      return NextResponse.json({ messages });
    }

    return NextResponse.json({ messages: null });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, leadId } = body;

    if (!sourceId || !leadId) {
      return NextResponse.json(
        { error: 'sourceId and leadId are required' },
        { status: 400 }
      );
    }

    const leadIdNum = parseInt(leadId);

    // Check if messages already exist - return existing if so
    const existing = getLeadMessages(sourceId, leadIdNum);
    if (existing) {
      return NextResponse.json({ messages: existing, existing: true });
    }

    // Get the source config to get connectionPrompt
    const source = getSource(sourceId);
    if (!source?.connectionPrompt) {
      return NextResponse.json(
        { error: 'No connectionPrompt configured for this source' },
        { status: 400 }
      );
    }

    // Get the lead and parse profile
    const lead = getLead(sourceId, leadIdNum);
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    const profile = parseLeadProfile(lead);
    if (!profile) {
      return NextResponse.json(
        { error: 'Failed to parse lead profile' },
        { status: 400 }
      );
    }

    // Generate messages using the campaign-specific prompt
    const generated = await generateConnectionMessages(profile, source.connectionPrompt);

    // Save to database
    const saved = saveLeadMessages(sourceId, leadIdNum, {
      ...generated,
      prompt_used: source.connectionPrompt,
    });

    return NextResponse.json({ messages: saved, existing: false });
  } catch (error) {
    console.error('Error generating messages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate messages' },
      { status: 500 }
    );
  }
}