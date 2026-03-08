// Lead data from crm_lead table
export interface Lead {
  id: number;
  creation_date: string;
  update_date: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  title: string | null;
  email: string;
  phone: string;
  city_name: string;
  company_name: string;
  website: string;
  description: string; // JSON string with LinkedIn profile data
  disqualified: boolean;
}

// Parsed LinkedIn profile from lead.description JSON
export interface LinkedInProfile {
  url: string;
  urn: string;
  full_name: string;
  first_name: string;
  last_name: string;
  headline: string;
  summary: string | null;
  public_identifier: string;
  location_name: string;
  geo?: {
    countryUrn: string;
    defaultLocalizedName: string;
  };
  industry?: {
    name: string;
  };
  positions: Position[];
  educations: Education[];
  country_code: string;
  connection_distance: string | null;
}

export interface Position {
  title: string;
  company_name: string;
  company_urn: string | null;
  location: string | null;
  date_range: {
    start: { year: number; month?: number } | null;
    end: { year: number; month?: number } | null;
  };
  description: string | null;
  urn: string;
}

export interface Education {
  school_name: string;
  degree_name: string | null;
  field_of_study: string | null;
  date_range: {
    start: { year: number; month?: number } | null;
    end: { year: number; month?: number } | null;
  };
  urn: string;
}

// Outreach tracking
export type OutreachStatus = 'pending' | 'reached_out' | 'replied' | 'ignored';

export interface OutreachRecord {
  id: number;
  source_id: string;
  lead_id: number;
  outreach_status: OutreachStatus;
  outreach_date: string | null;
  conversation: ConversationMessage[];
  follow_up_date: string | null;
  follow_up_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'lead';
  content: string;
  date: string;
}

// Source configuration
export interface Source {
  id: string;
  name: string;
  path: string;
  templates: {
    simple: string;
    followup1: string;
    followup2: string;
  };
  llmEnabled: boolean;
  followUpDays: number;
  maxFollowUps: number;
}

export interface SourcesConfig {
  sources: Source[];
}

// Campaign data from linkedin_campaign
export interface Campaign {
  id: number;
  product_docs: string;
  campaign_objective: string;
  followup_template: string;
  booking_link: string;
}

// Combined lead with outreach data
export interface LeadWithOutreach extends Lead {
  profile: LinkedInProfile | null;
  outreach: OutreachRecord | null;
  mlScore?: number; // ML ranking score (0.0 to 1.0)
}

// ============================================================================
// Sorting and ML Score Types
// ============================================================================

// Sort options for leads
export type SortOption = 
  | 'score_desc'      // ML Score (High to Low) - DEFAULT
  | 'score_asc'       // ML Score (Low to High)
  | 'date_asc'        // Date Added (Oldest First)
  | 'date_desc'       // Date Added (Newest First)
  | 'location_asc'    // Location (A-Z by state)
  | 'location_desc';  // Location (Z-A by state)

// ML Score record from lead_scores table
export interface LeadScoreRecord {
  id: number;
  source_id: string;
  lead_id: number;
  ml_score: number;        // 0.0 to 1.0
  ml_label: number | null; // 0=disqualified, 1=qualified, null=pending
  public_identifier: string | null;
  model_file: string | null;
  computed_at: string;
}
