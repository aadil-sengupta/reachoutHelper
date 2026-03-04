'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { LeadWithOutreach, ConversationMessage } from '@/types';

interface ConversationPanelProps {
  lead: LeadWithOutreach;
  sourceId: string;
  onUpdate: () => void;
}

export function ConversationPanel({ lead, sourceId, onUpdate }: ConversationPanelProps) {
  const [replyText, setReplyText] = useState('');
  const [replyPrompt, setReplyPrompt] = useState('');
  const [generatedReply, setGeneratedReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddReply, setShowAddReply] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const conversation = lead.outreach?.conversation || [];
  const profile = lead.profile;
  
  const addLeadReply = async () => {
    if (!replyText.trim()) return;
    
    setLoading(true);
    try {
      await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          leadId: lead.id,
          action: 'add_reply',
          message: replyText,
        }),
      });
      
      setReplyText('');
      setShowAddReply(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const generateReply = async () => {
    if (!replyPrompt.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/generate/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          leadId: lead.id,
          replyPrompt,
        }),
      });
      
      const data = await res.json();
      if (data.message) {
        setGeneratedReply(data.message);
      }
    } catch (error) {
      console.error('Error generating reply:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying:', error);
    }
  };
  
  const saveSentMessage = async () => {
    if (!generatedReply.trim()) return;
    
    setLoading(true);
    try {
      await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          leadId: lead.id,
          action: 'add_sent_message',
          message: generatedReply,
        }),
      });
      
      setGeneratedReply('');
      setReplyPrompt('');
      onUpdate();
    } catch (error) {
      console.error('Error saving message:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (conversation.length === 0 && lead.outreach?.outreach_status !== 'replied') {
    return null;
  }
  
  return (
    <div className="card p-6">
      <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-4">
        Conversation History
      </h3>
      
      {/* Messages */}
      <div className="space-y-3 mb-4">
        {conversation.map((msg: ConversationMessage, idx: number) => (
          <div
            key={idx}
            className={`p-4 rounded-xl ${
              msg.role === 'user'
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] ml-8'
                : 'bg-[hsl(var(--muted))] mr-8'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs font-medium ${
                msg.role === 'user' 
                  ? 'text-[hsl(var(--primary-foreground))]/70' 
                  : 'text-[hsl(var(--muted-foreground))]'
              }`}>
                {msg.role === 'user' ? 'You' : profile?.first_name || 'Lead'}
              </span>
              <span className={`text-xs ${
                msg.role === 'user' 
                  ? 'text-[hsl(var(--primary-foreground))]/50' 
                  : 'text-[hsl(var(--muted-foreground))]/70'
              }`}>
                {new Date(msg.date).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
      </div>
      
      {/* Add lead's reply */}
      <div className="pt-4 border-t border-[hsl(var(--border))]">
        {!showAddReply ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddReply(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            Add their reply
          </Button>
        ) : (
          <div className="space-y-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Paste their LinkedIn reply here..."
              className="w-full h-24 px-4 py-3 text-sm rounded-lg resize-none"
            />
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={addLeadReply}
                disabled={loading || !replyText.trim()}
              >
                Save Reply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddReply(false);
                  setReplyText('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Generate response */}
      {conversation.length > 0 && (
        <div className="pt-4 mt-4 border-t border-[hsl(var(--border))]">
          <h4 className="text-sm font-medium text-[hsl(var(--foreground))] mb-3">Generate Your Response</h4>
          
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={replyPrompt}
              onChange={(e) => setReplyPrompt(e.target.value)}
              placeholder="Describe what you want to say..."
              className="flex-1 h-10 px-4 text-sm rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && generateReply()}
            />
            <Button
              variant="default"
              size="sm"
              onClick={generateReply}
              disabled={loading || !replyPrompt.trim()}
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
          
          {generatedReply && (
            <div className="space-y-3">
              <textarea
                value={generatedReply}
                onChange={(e) => setGeneratedReply(e.target.value)}
                className="w-full h-24 px-4 py-3 text-sm rounded-lg resize-none"
              />
              <div className="flex gap-2">
                <Button
                  variant={copied ? 'secondary' : 'default'}
                  size="sm"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveSentMessage}
                  disabled={loading}
                >
                  Save as Sent
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
