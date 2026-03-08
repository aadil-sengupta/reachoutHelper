'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch('/api/sources/config');
        const data = await res.json();
        setContent(data.content);
      } catch (err) {
        setMessage('Failed to load sources.json');
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      JSON.parse(content);
      const res = await fetch('/api/sources/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setMessage('Saved successfully!');
      } else {
        setMessage('Failed to save');
      }
    } catch (err) {
      setMessage('Invalid JSON');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-2">Settings</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          Edit sources.json configuration
        </p>

        <div className="space-y-4">
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[60vh] font-mono text-sm p-4 rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
              spellCheck={false}
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {message && (
              <span className={`text-sm ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
                {message}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}