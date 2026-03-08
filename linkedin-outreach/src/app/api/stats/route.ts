import { NextRequest, NextResponse } from 'next/server';
import { getOutreachDb } from '@/lib/db/outreach-db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get('sourceId');
    
    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId is required' }, { status: 400 });
    }
    
    const db = getOutreachDb();
    
    // Get messages sent today
    const today = new Date().toISOString().split('T')[0];
    const messagesToday = db.prepare(`
      SELECT COUNT(*) as count FROM outreach_record 
      WHERE source_id = ? 
      AND outreach_status = 'reached_out' 
      AND date(outreach_date) = ?
    `).get(sourceId, today) as { count: number };
    
    // Get total pending
    const totalPending = db.prepare(`
      SELECT COUNT(*) as count FROM outreach_record 
      WHERE source_id = ? AND outreach_status = 'pending'
    `).get(sourceId) as { count: number };
    
    return NextResponse.json({
      messages_today: messagesToday.count,
      pending_total: totalPending.count
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}