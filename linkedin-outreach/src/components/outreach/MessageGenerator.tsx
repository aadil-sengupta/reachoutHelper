'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { LeadWithOutreach } from '@/types';

interface MessageGeneratorProps {
  lead: LeadWithOutreach;
  sourceId: string;
  isFollowUp?: boolean;
  onMessageGenerated?: (message: string) => void;
}

export function MessageGenerator({ lead, sourceId, isFollowUp = false, onMessageGenerated }: MessageGeneratorProps) {
  const [message, setMessage] = useState('');
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const generateMessage = async (type: 'simple' | 'llm') => {
    setLoading(true);
    try {
      const endpoint = isFollowUp ? '/api/generate/followup' : '/api/generate';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, leadId: lead.id, type }),
      });
      
      const data = await res.json();
      if (data.message) {
        setMessage(data.message);
        onMessageGenerated?.(data.message);
      }
    } catch (error) {
      console.error('Error generating message:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const refineMessage = async () => {
    if (!refinementPrompt.trim() || !message) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/generate/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          leadId: lead.id,
          currentMessage: message,
          refinementPrompt,
        }),
      });
      
      const data = await res.json();
      if (data.message) {
        setMessage(data.message);
        setRefinementPrompt('');
        onMessageGenerated?.(data.message);
      }
    } catch (error) {
      console.error('Error refining message:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const quickRefine = async (prompt: string) => {
    setRefinementPrompt(prompt);
    setLoading(true);
    try {
      const res = await fetch('/api/generate/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          leadId: lead.id,
          currentMessage: message,
          refinementPrompt: prompt,
        }),
      });
      
      const data = await res.json();
      if (data.message) {
        setMessage(data.message);
        setRefinementPrompt('');
        onMessageGenerated?.(data.message);
      }
    } catch (error) {
      console.error('Error refining message:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };
  
  return (
    <div className="card p-6">
      <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-4">
        {isFollowUp ? 'Follow-up Message' : 'Connection Message'}
      </h3>
      
      {/* Generate buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateMessage('simple')}
          disabled={loading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Template
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => generateMessage('llm')}
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Generate with AI
            </>
          )}
        </Button>
      </div>
      
      {/* Message textarea */}
      <textarea
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          onMessageGenerated?.(e.target.value);
        }}
        placeholder="Generated message will appear here... You can also type directly."
        className="w-full h-32 px-4 py-3 text-sm rounded-lg resize-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-0"
      />
      
      {/* Character count */}
      <div className="flex justify-between items-center mt-2 text-xs text-[hsl(var(--muted-foreground))]">
        <span>{message.length} characters</span>
        {message.length > 300 && (
          <span className={message.length > 400 ? 'text-[hsl(var(--destructive))]' : 'text-amber-600'}>
            {message.length > 400 ? 'Too long for LinkedIn' : 'Consider shortening'}
          </span>
        )}
      </div>
      
      {/* Refinement section */}
      {message && (
        <div className="mt-5 pt-5 border-t border-[hsl(var(--border))]">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              placeholder="Refine: e.g., 'make it shorter', 'more casual'"
              className="flex-1 h-10 px-4 text-sm rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && refineMessage()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={refineMessage}
              disabled={loading || !refinementPrompt.trim()}
            >
              Refine
            </Button>
          </div>
          
          {/* Quick refinement buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Shorter', prompt: 'Make it shorter' },
              { label: 'Casual', prompt: 'Make it more casual and friendly' },
              { label: 'Professional', prompt: 'Make it more professional' },
              { label: 'Add question', prompt: 'Add a question to encourage reply' },
              { label: 'Remove pitch', prompt: 'Remove any sales pitch, keep it purely networking' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => quickRefine(item.prompt)}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] transition-colors disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Copy button */}
      {message && (
        <div className="mt-5 pt-5 border-t border-[hsl(var(--border))]">
          <Button
            variant={copied ? 'secondary' : 'default'}
            onClick={copyToClipboard}
            className="w-full"
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
                Copy Message
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
