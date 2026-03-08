import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateOutreach, addMessageToConversation, getOutreachRecord } from '@/lib/db/outreach-db';
import { getSource } from '@/lib/db/sources';
import type { OutreachStatus, ConversationMessage } from '@/types';

// Update outreach status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, leadId, action, message, notes } = body;
    
    if (!sourceId || !leadId || !action) {
      return NextResponse.json(
        { error: 'sourceId, leadId, and action are required' },
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
    
    const now = new Date();
    
    switch (action) {
      case 'mark_sent': {
        // Mark as reached out and set follow-up date
        const followUpDate = new Date(now.getTime() + source.followUpDays * 24 * 60 * 60 * 1000);
        
        const record = createOrUpdateOutreach(sourceId, leadId, {
          outreach_status: 'reached_out',
          outreach_date: now.toISOString(),
          follow_up_date: followUpDate.toISOString(),
          follow_up_count: 0,
          notes: notes || undefined,
        });
        
        // Add message to conversation if provided
        if (message) {
          const msg: ConversationMessage = {
            role: 'user',
            content: message,
            date: now.toISOString(),
          };
          addMessageToConversation(sourceId, leadId, msg);
        }
        
        return NextResponse.json({ success: true, record: getOutreachRecord(sourceId, leadId) });
      }
      
      case 'mark_followup_sent': {
        // Increment follow-up count
        const existing = getOutreachRecord(sourceId, leadId);
        const newCount = (existing?.follow_up_count || 0) + 1;
        
        // Set next follow-up date if under max
        let nextFollowUpDate: string | undefined;
        if (newCount < source.maxFollowUps) {
          const followUpDate = new Date(now.getTime() + source.followUpDays * 24 * 60 * 60 * 1000);
          nextFollowUpDate = followUpDate.toISOString();
        }
        
        const record = createOrUpdateOutreach(sourceId, leadId, {
          follow_up_count: newCount,
          follow_up_date: nextFollowUpDate,
          notes: notes || undefined,
        });
        
        // Add message to conversation
        if (message) {
          const msg: ConversationMessage = {
            role: 'user',
            content: message,
            date: now.toISOString(),
          };
          addMessageToConversation(sourceId, leadId, msg);
        }
        
        return NextResponse.json({ success: true, record: getOutreachRecord(sourceId, leadId) });
      }
      
      case 'add_reply': {
        // Add lead's reply to conversation (auto-changes status to 'replied')
        if (!message) {
          return NextResponse.json(
            { error: 'message is required for add_reply' },
            { status: 400 }
          );
        }
        
        const msg: ConversationMessage = {
          role: 'lead',
          content: message,
          date: now.toISOString(),
        };
        const record = addMessageToConversation(sourceId, leadId, msg);
        
        return NextResponse.json({ success: true, record });
      }
      
      case 'add_sent_message': {
        // Add a message we sent to conversation
        if (!message) {
          return NextResponse.json(
            { error: 'message is required for add_sent_message' },
            { status: 400 }
          );
        }
        
        const msg: ConversationMessage = {
          role: 'user',
          content: message,
          date: now.toISOString(),
        };
        const record = addMessageToConversation(sourceId, leadId, msg);
        
        return NextResponse.json({ success: true, record });
      }
      
      case 'mark_ignored': {
        const record = createOrUpdateOutreach(sourceId, leadId, {
          outreach_status: 'ignored',
          notes: notes || undefined,
        });
        
        return NextResponse.json({ success: true, record });
      }
      
      case 'update_notes': {
        const record = createOrUpdateOutreach(sourceId, leadId, {
          notes: notes || '',
        });
        
        return NextResponse.json({ success: true, record });
      }
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating outreach:', error);
    return NextResponse.json(
      { error: 'Failed to update outreach' },
      { status: 500 }
    );
  }
}
