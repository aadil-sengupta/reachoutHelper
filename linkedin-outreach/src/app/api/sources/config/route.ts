import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';

export async function GET() {
  try {
    const sourcesPath = path.join(process.cwd(), DATA_DIR, 'sources.json');
    const content = fs.readFileSync(sourcesPath, 'utf-8');
    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read sources.json' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    const sourcesPath = path.join(process.cwd(), DATA_DIR, 'sources.json');
    
    JSON.parse(content);
    
    fs.writeFileSync(sourcesPath, content, 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save sources.json' }, { status: 500 });
  }
}