import { NextResponse } from 'next/server';
import { getSources } from '@/lib/db/sources';
import { getOutreachStats, getTrackedLeadIds } from '@/lib/db/outreach-db';
import { getLeadCount } from '@/lib/db/source-db';

export async function GET() {
  try {
    const sources = getSources();
    
    // Add stats to each source
    const sourcesWithStats = sources.map(source => {
      const stats = getOutreachStats(source.id);
      const totalLeads = getLeadCount(source.id);
      const trackedLeads = getTrackedLeadIds(source.id).length;
      const untrackedPending = totalLeads - trackedLeads;
      
      return {
        ...source,
        stats: {
          ...stats,
          total: totalLeads,
          // Add untracked leads to pending count
          pending: stats.pending + untrackedPending,
        },
      };
    });
    
    return NextResponse.json({ sources: sourcesWithStats });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}
