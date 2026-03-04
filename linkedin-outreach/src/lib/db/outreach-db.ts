import Database from 'better-sqlite3';
import path from 'path';
import type { OutreachRecord, OutreachStatus, ConversationMessage } from '@/types';

const DATA_DIR = process.env.DATA_DIR || './data';

let outreachDb: Database.Database | null = null;

export function getOutreachDb(): Database.Database {
  if (outreachDb) return outreachDb;
  
  const dbPath = path.join(process.cwd(), DATA_DIR, 'outreach.db');
  outreachDb = new Database(dbPath);
  
  // Initialize schema if needed
  outreachDb.exec(`
    CREATE TABLE IF NOT EXISTS outreach_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      lead_id INTEGER NOT NULL,
      outreach_status TEXT DEFAULT 'pending',
      outreach_date TEXT,
      conversation TEXT DEFAULT '[]',
      follow_up_date TEXT,
      follow_up_count INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_id, lead_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_outreach_source_lead ON outreach_record(source_id, lead_id);
    CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_record(source_id, outreach_status);
    CREATE INDEX IF NOT EXISTS idx_followup_due ON outreach_record(source_id, outreach_status, follow_up_date);
  `);
  
  return outreachDb;
}

export function getOutreachRecord(sourceId: string, leadId: number): OutreachRecord | null {
  const db = getOutreachDb();
  
  const stmt = db.prepare(`
    SELECT * FROM outreach_record WHERE source_id = ? AND lead_id = ?
  `);
  
  const record = stmt.get(sourceId, leadId) as (Omit<OutreachRecord, 'conversation'> & { conversation: string }) | undefined;
  
  if (!record) return null;
  
  return {
    ...record,
    conversation: JSON.parse(record.conversation || '[]') as ConversationMessage[]
  };
}

export function createOrUpdateOutreach(
  sourceId: string,
  leadId: number,
  data: {
    outreach_status?: OutreachStatus;
    outreach_date?: string;
    notes?: string;
    follow_up_date?: string;
    follow_up_count?: number;
  }
): OutreachRecord {
  const db = getOutreachDb();
  const now = new Date().toISOString();
  
  const existing = getOutreachRecord(sourceId, leadId);
  
  if (existing) {
    const updates: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];
    
    if (data.outreach_status !== undefined) {
      updates.push('outreach_status = ?');
      values.push(data.outreach_status);
    }
    if (data.outreach_date !== undefined) {
      updates.push('outreach_date = ?');
      values.push(data.outreach_date);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes);
    }
    if (data.follow_up_date !== undefined) {
      updates.push('follow_up_date = ?');
      values.push(data.follow_up_date);
    }
    if (data.follow_up_count !== undefined) {
      updates.push('follow_up_count = ?');
      values.push(data.follow_up_count);
    }
    
    values.push(sourceId, leadId);
    
    db.prepare(`
      UPDATE outreach_record 
      SET ${updates.join(', ')}
      WHERE source_id = ? AND lead_id = ?
    `).run(...values);
  } else {
    db.prepare(`
      INSERT INTO outreach_record (source_id, lead_id, outreach_status, outreach_date, notes, follow_up_date, follow_up_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sourceId,
      leadId,
      data.outreach_status || 'pending',
      data.outreach_date || null,
      data.notes || null,
      data.follow_up_date || null,
      data.follow_up_count || 0,
      now,
      now
    );
  }
  
  return getOutreachRecord(sourceId, leadId)!;
}

export function addMessageToConversation(
  sourceId: string,
  leadId: number,
  message: ConversationMessage
): OutreachRecord {
  const db = getOutreachDb();
  const record = getOutreachRecord(sourceId, leadId);
  const now = new Date().toISOString();
  
  const conversation = record?.conversation || [];
  conversation.push(message);
  
  if (record) {
    // If this is a lead reply, auto-change status to 'replied'
    const newStatus = message.role === 'lead' ? 'replied' : record.outreach_status;
    
    db.prepare(`
      UPDATE outreach_record 
      SET conversation = ?, outreach_status = ?, updated_at = ?
      WHERE source_id = ? AND lead_id = ?
    `).run(JSON.stringify(conversation), newStatus, now, sourceId, leadId);
  } else {
    const status = message.role === 'lead' ? 'replied' : 'pending';
    db.prepare(`
      INSERT INTO outreach_record (source_id, lead_id, conversation, outreach_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sourceId, leadId, JSON.stringify(conversation), status, now, now);
  }
  
  return getOutreachRecord(sourceId, leadId)!;
}

export function getLeadsWithStatus(
  sourceId: string,
  status: OutreachStatus,
  options: { page?: number; limit?: number } = {}
): { leadIds: number[]; total: number } {
  const db = getOutreachDb();
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;
  
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM outreach_record 
    WHERE source_id = ? AND outreach_status = ?
  `);
  const { count: total } = countStmt.get(sourceId, status) as { count: number };
  
  const stmt = db.prepare(`
    SELECT lead_id FROM outreach_record 
    WHERE source_id = ? AND outreach_status = ?
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `);
  
  const rows = stmt.all(sourceId, status, limit, offset) as { lead_id: number }[];
  
  return { leadIds: rows.map(r => r.lead_id), total };
}

export function getFollowUpsDue(sourceId: string): number[] {
  const db = getOutreachDb();
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    SELECT lead_id FROM outreach_record 
    WHERE source_id = ? 
      AND outreach_status = 'reached_out' 
      AND follow_up_date <= ?
      AND follow_up_count < 2
    ORDER BY follow_up_date ASC
  `);
  
  const rows = stmt.all(sourceId, now) as { lead_id: number }[];
  return rows.map(r => r.lead_id);
}

export function getPendingLeadIds(sourceId: string): number[] {
  const db = getOutreachDb();
  
  const stmt = db.prepare(`
    SELECT lead_id FROM outreach_record 
    WHERE source_id = ? AND outreach_status = 'pending'
    ORDER BY id ASC
  `);
  
  const rows = stmt.all(sourceId) as { lead_id: number }[];
  return rows.map(r => r.lead_id);
}

export function getTrackedLeadIds(sourceId: string): number[] {
  const db = getOutreachDb();
  
  const stmt = db.prepare(`
    SELECT lead_id FROM outreach_record WHERE source_id = ?
  `);
  
  const rows = stmt.all(sourceId) as { lead_id: number }[];
  return rows.map(r => r.lead_id);
}

export function getOutreachStats(sourceId: string): {
  pending: number;
  reached_out: number;
  replied: number;
  ignored: number;
  followups_due: number;
} {
  const db = getOutreachDb();
  const now = new Date().toISOString();
  
  const stats = { pending: 0, reached_out: 0, replied: 0, ignored: 0, followups_due: 0 };
  
  const countStmt = db.prepare(`
    SELECT outreach_status, COUNT(*) as count 
    FROM outreach_record 
    WHERE source_id = ?
    GROUP BY outreach_status
  `);
  
  const rows = countStmt.all(sourceId) as { outreach_status: string; count: number }[];
  
  for (const row of rows) {
    if (row.outreach_status in stats) {
      stats[row.outreach_status as keyof typeof stats] = row.count;
    }
  }
  
  // Count follow-ups due
  const followupStmt = db.prepare(`
    SELECT COUNT(*) as count FROM outreach_record 
    WHERE source_id = ? 
      AND outreach_status = 'reached_out' 
      AND follow_up_date <= ?
      AND follow_up_count < 2
  `);
  
  const { count: followups_due } = followupStmt.get(sourceId, now) as { count: number };
  stats.followups_due = followups_due;
  
  return stats;
}
