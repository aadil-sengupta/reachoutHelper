import Database from 'better-sqlite3';
import type { Lead, Campaign, LinkedInProfile, SortOption, LeadWithOutreach } from '@/types';
import { getSource } from './sources';
import { getAllScores } from './outreach-db';

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

/**
 * Extract state from location string.
 * Examples:
 *   "Austin, Texas, United States" -> "Texas"
 *   "Los Angeles Metropolitan Area" -> "Los Angeles Metropolitan Area"
 *   "Seattle, Washington" -> "Washington"
 */
function extractState(location: string): string {
  if (!location) return '';
  const parts = location.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    // For "City, State, Country" -> return State
    // For "City, State" -> return State
    return parts[parts.length - 2];
  }
  return location;
}

/**
 * Sort leads based on the specified sort option
 */
function sortLeads(
  leads: Lead[],
  sortBy: SortOption,
  scoresMap: Map<number, number>
): Lead[] {
  const sorted = [...leads];
  
  switch (sortBy) {
    case 'score_desc':
      sorted.sort((a, b) => {
        const scoreA = scoresMap.get(a.id) ?? -1;
        const scoreB = scoresMap.get(b.id) ?? -1;
        return scoreB - scoreA;
      });
      break;
    case 'score_asc':
      sorted.sort((a, b) => {
        const scoreA = scoresMap.get(a.id) ?? 2; // Put unscored at end
        const scoreB = scoresMap.get(b.id) ?? 2;
        return scoreA - scoreB;
      });
      break;
    case 'date_asc':
      sorted.sort((a, b) => 
        new Date(a.creation_date).getTime() - new Date(b.creation_date).getTime()
      );
      break;
    case 'date_desc':
      sorted.sort((a, b) => 
        new Date(b.creation_date).getTime() - new Date(a.creation_date).getTime()
      );
      break;
    case 'location_asc':
      sorted.sort((a, b) => 
        extractState(a.city_name).localeCompare(extractState(b.city_name))
      );
      break;
    case 'location_desc':
      sorted.sort((a, b) => 
        extractState(b.city_name).localeCompare(extractState(a.city_name))
      );
      break;
  }
  
  return sorted;
}

export function getLeads(
  sourceId: string,
  options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: SortOption;
  } = {}
): { leads: Lead[]; total: number } {
  const db = getSourceDb(sourceId);
  const { page = 1, limit = 50, search, sortBy = 'score_desc' } = options;
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
  
  // For score-based sorting, we need to fetch all leads first then sort in memory
  // For other sorts, we can do it in SQL
  const needsMemorySort = sortBy === 'score_desc' || sortBy === 'score_asc';
  
  if (needsMemorySort) {
    // Fetch all matching leads (will sort and paginate in memory)
    const stmt = db.prepare(`
      SELECT 
        id, creation_date, update_date, first_name, middle_name, last_name,
        title, email, phone, city_name, company_name, website, description, disqualified
      FROM crm_lead 
      ${whereClause}
    `);
    
    const allLeads = stmt.all(...params) as Lead[];
    
    // Get scores for sorting
    const scoresMap = getAllScores(sourceId);
    
    // Sort all leads
    const sortedLeads = sortLeads(allLeads, sortBy, scoresMap);
    
    // Paginate
    const leads = sortedLeads.slice(offset, offset + limit);
    
    return { leads, total };
  } else {
    // Use SQL sorting for non-score sorts
    let orderBy = 'id DESC';
    switch (sortBy) {
      case 'date_asc':
        orderBy = 'creation_date ASC';
        break;
      case 'date_desc':
        orderBy = 'creation_date DESC';
        break;
      case 'location_asc':
        orderBy = 'city_name ASC';
        break;
      case 'location_desc':
        orderBy = 'city_name DESC';
        break;
    }
    
    const stmt = db.prepare(`
      SELECT 
        id, creation_date, update_date, first_name, middle_name, last_name,
        title, email, phone, city_name, company_name, website, description, disqualified
      FROM crm_lead 
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `);
    
    const leads = stmt.all(...params, limit, offset) as Lead[];
    
    return { leads, total };
  }
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
