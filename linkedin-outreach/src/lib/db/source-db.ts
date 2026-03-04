import Database from 'better-sqlite3';
import type { Lead, Campaign, LinkedInProfile } from '@/types';
import { getSource } from './sources';

// Cache for database connections
const dbCache = new Map<string, Database.Database>();

export function getSourceDb(sourceId: string): Database.Database {
  // Check cache first
  if (dbCache.has(sourceId)) {
    return dbCache.get(sourceId)!;
  }
  
  const source = getSource(sourceId);
  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }
  
  const db = new Database(source.path, { readonly: true });
  dbCache.set(sourceId, db);
  return db;
}

export function getLeads(
  sourceId: string,
  options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}
): { leads: Lead[]; total: number } {
  const db = getSourceDb(sourceId);
  const { page = 1, limit = 50, search } = options;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE disqualified = 0';
  const params: (string | number)[] = [];
  
  if (search) {
    whereClause += ` AND (first_name LIKE ? OR last_name LIKE ? OR company_name LIKE ? OR title LIKE ?)`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }
  
  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM crm_lead ${whereClause}`);
  const { count: total } = countStmt.get(...params) as { count: number };
  
  // Get leads
  const stmt = db.prepare(`
    SELECT 
      id, creation_date, update_date, first_name, middle_name, last_name,
      title, email, phone, city_name, company_name, website, description, disqualified
    FROM crm_lead 
    ${whereClause}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `);
  
  const leads = stmt.all(...params, limit, offset) as Lead[];
  
  return { leads, total };
}

export function getLead(sourceId: string, leadId: number): Lead | null {
  const db = getSourceDb(sourceId);
  
  const stmt = db.prepare(`
    SELECT 
      id, creation_date, update_date, first_name, middle_name, last_name,
      title, email, phone, city_name, company_name, website, description, disqualified
    FROM crm_lead 
    WHERE id = ?
  `);
  
  const lead = stmt.get(leadId) as Lead | undefined;
  return lead || null;
}

export function parseLeadProfile(lead: Lead): LinkedInProfile | null {
  if (!lead.description) return null;
  
  try {
    return JSON.parse(lead.description) as LinkedInProfile;
  } catch {
    return null;
  }
}

export function getCampaign(sourceId: string): Campaign | null {
  const db = getSourceDb(sourceId);
  
  // Get the first campaign (assuming single campaign per source)
  const stmt = db.prepare(`
    SELECT id, product_docs, campaign_objective, followup_template, booking_link
    FROM linkedin_campaign
    LIMIT 1
  `);
  
  const campaign = stmt.get() as Campaign | undefined;
  return campaign || null;
}

export function getLeadCount(sourceId: string): number {
  const db = getSourceDb(sourceId);
  const stmt = db.prepare('SELECT COUNT(*) as count FROM crm_lead WHERE disqualified = 0');
  const { count } = stmt.get() as { count: number };
  return count;
}
