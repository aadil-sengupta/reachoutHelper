import fs from 'fs';
import path from 'path';
import type { Source, SourcesConfig } from '@/types';

const DATA_DIR = process.env.DATA_DIR || './data';

export function getSourcesConfig(): SourcesConfig {
  const sourcesPath = path.join(process.cwd(), DATA_DIR, 'sources.json');
  const data = fs.readFileSync(sourcesPath, 'utf-8');
  return JSON.parse(data) as SourcesConfig;
}

export function getSources(): Source[] {
  return getSourcesConfig().sources;
}

export function getSource(id: string): Source | undefined {
  return getSources().find(s => s.id === id);
}
