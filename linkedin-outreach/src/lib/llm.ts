import type { LinkedInProfile, Campaign, ConversationMessage } from '@/types';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://litellm:4000/v1/';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'kimi-k2-5';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callLLM(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${LLM_BASE_URL}chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function generateInitialMessage(
  profile: LinkedInProfile,
  campaign: Campaign | null
): Promise<string> {
  const systemPrompt = `You are a professional networker reaching out on LinkedIn.

Write a **short, friendly connection message** (2-4 sentences, max 400 characters) to ${profile.full_name}, who works as ${profile.headline || 'a professional'} at ${profile.positions?.[0]?.company_name || 'their company'} in ${profile.location_name || 'their location'}.

${campaign?.product_docs ? `About the product/service:\n${campaign.product_docs}\n` : ''}

Guidelines:
- Reference their recent role or company
- Naturally mention how your product/service could be relevant to them, without being salesy
- Keep it natural, warm, and professional
- End with a soft call-to-action (e.g., coffee chat, quick call, or "happy to connect further")
- Do NOT use placeholders like [Your Name] or [Company]
- Do NOT sign the message with any name at the end

The message must end with the call-to-action sentence itself.`;

  const userPrompt = `Generate a LinkedIn connection message for this person:

Name: ${profile.full_name}
Headline: ${profile.headline || 'Not specified'}
Location: ${profile.location_name || 'Not specified'}
Company: ${profile.positions?.[0]?.company_name || 'Not specified'}
Industry: ${profile.industry?.name || 'Not specified'}

Current Role: ${profile.positions?.[0]?.title || 'Not specified'} at ${profile.positions?.[0]?.company_name || 'Unknown'}
${profile.positions?.[0]?.description ? `Role Description: ${profile.positions[0].description.slice(0, 300)}...` : ''}

${profile.summary ? `Summary: ${profile.summary.slice(0, 300)}...` : ''}

${campaign?.campaign_objective ? `Campaign Objective: ${campaign.campaign_objective}` : ''}`;

  return callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);
}

export async function refineMessage(
  currentMessage: string,
  refinementPrompt: string,
  profile: LinkedInProfile
): Promise<string> {
  const systemPrompt = `You are helping refine a LinkedIn outreach message. 
The user will provide a message and instructions on how to modify it.
Keep the message professional, friendly, and under 400 characters.
Do NOT add any signature or name at the end.
Return only the refined message, nothing else.`;

  const userPrompt = `Current message to ${profile.full_name}:
"${currentMessage}"

Refinement request: ${refinementPrompt}

Please provide the refined message:`;

  return callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);
}

export async function generateFollowUpMessage(
  profile: LinkedInProfile,
  followUpCount: number,
  campaign: Campaign | null
): Promise<string> {
  const systemPrompt = `You are a professional networker sending a follow-up message on LinkedIn.

This is follow-up #${followUpCount + 1} to ${profile.full_name}.
Write a brief, friendly follow-up (2-3 sentences, max 300 characters).

Guidelines:
- Be brief and respectful of their time
- Don't be pushy
- Include a soft call-to-action
- Do NOT sign the message with any name
- ${followUpCount === 1 ? 'This is the final follow-up, so keep it light and offer to stay connected.' : ''}`;

  const userPrompt = `Generate follow-up message for:
Name: ${profile.full_name}
Title: ${profile.headline || 'Professional'}
Company: ${profile.positions?.[0]?.company_name || 'Unknown'}

${campaign?.campaign_objective ? `Context: ${campaign.campaign_objective}` : ''}`;

  return callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);
}

export async function generateReplyMessage(
  profile: LinkedInProfile,
  conversation: ConversationMessage[],
  replyPrompt: string,
  campaign: Campaign | null
): Promise<string> {
  const systemPrompt = `You are helping craft a reply in a LinkedIn conversation.
The user will provide the conversation history and instructions on what to say.
Keep the reply professional, warm, and conversational.
Do NOT add any signature or name at the end.
Return only the reply message, nothing else.`;

  const conversationText = conversation
    .map(msg => `${msg.role === 'user' ? 'You' : profile.first_name}: ${msg.content}`)
    .join('\n\n');

  const userPrompt = `Conversation with ${profile.full_name} (${profile.headline || 'Professional'}):

${conversationText}

Instructions for your reply: ${replyPrompt}

${campaign?.product_docs ? `Product context: ${campaign.product_docs.slice(0, 500)}` : ''}

Generate the reply:`;

  return callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);
}

// Apply simple template with variable substitution
export function applyTemplate(template: string, profile: LinkedInProfile): string {
  return template
    .replace(/\{\{first_name\}\}/g, profile.first_name || 'there')
    .replace(/\{\{last_name\}\}/g, profile.last_name || '')
    .replace(/\{\{full_name\}\}/g, profile.full_name || 'there')
    .replace(/\{\{company\}\}/g, profile.positions?.[0]?.company_name || 'your company')
    .replace(/\{\{title\}\}/g, profile.headline || 'professional')
    .replace(/\{\{location\}\}/g, profile.location_name || 'your area');
}
