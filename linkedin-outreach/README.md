# LinkedIn Outreach Helper

A minimal web interface for managing LinkedIn outreach across multiple CRM databases.

## Features

- **Queue Mode**: Process leads one-by-one with keyboard shortcuts for speed
- **All Leads**: View and filter all leads with status management
- **Follow-ups**: Track leads needing follow-up (7+ days without reply)
- **Message Generation**: Use simple templates or AI (Kimi K2.5 via LiteLLM)
- **Message Refinement**: Iteratively refine messages with custom prompts
- **Conversation Tracking**: Store full conversation history
- **Multi-database**: Support multiple CRM sources via config

## Keyboard Shortcuts (Queue Mode)

| Key | Action |
|-----|--------|
| `C` | Copy message to clipboard |
| `O` | Open LinkedIn profile |
| `M` | Mark as sent & next lead |
| `S` | Skip this lead |
| `N` | Next lead (no action) |
| `?` | Show shortcuts help |

## Setup

### Prerequisites

- Node.js 18+
- SQLite CRM database(s) with `crm_lead` table
- LiteLLM proxy (optional, for AI message generation)

### Installation

```bash
cd linkedin-outreach
npm install
```

### Configuration

1. **Configure data sources** in `data/sources.json`:

```json
{
  "sources": [
    {
      "id": "my-campaign",
      "name": "My Campaign",
      "path": "/path/to/crm.db",
      "templates": {
        "simple": "Hi {first_name}, I noticed you're {title} at {company}...",
        "followup1": "Hi {first_name}, just following up...",
        "followup2": "Hi {first_name}, one last follow-up..."
      },
      "llmEnabled": true,
      "followUpDays": 7,
      "maxFollowUps": 2
    }
  ]
}
```

2. **Configure LLM** in `.env.local`:

```env
LLM_BASE_URL=http://litellm:4000/v1/
LLM_API_KEY=your-api-key
LLM_MODEL=kimi-k2-5
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment with PM2

### Install PM2

```bash
npm install -g pm2
```

### Build and Start

```bash
# Build the production bundle
npm run build

# Start with PM2
pm2 start npm --name "linkedin-outreach" -- start

# Save PM2 config for auto-restart
pm2 save
pm2 startup
```

### PM2 Commands

```bash
pm2 status              # Check status
pm2 logs linkedin-outreach  # View logs
pm2 restart linkedin-outreach  # Restart
pm2 stop linkedin-outreach     # Stop
```

### Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name outreach.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Database Schema

### Source CRM (`crm.db` - read-only)

The app reads from `crm_lead` table with LinkedIn profile data stored as JSON in the `description` field.

### Outreach Database (`data/outreach.db` - auto-created)

Stores outreach tracking data:

```sql
CREATE TABLE outreach (
  id INTEGER PRIMARY KEY,
  source_id TEXT,
  lead_id INTEGER,
  outreach_status TEXT,  -- pending, reached_out, replied, ignored
  outreach_date TEXT,
  conversation TEXT,      -- JSON array of messages
  follow_up_date TEXT,
  follow_up_count INTEGER,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

## Project Structure

```
linkedin-outreach/
├── data/
│   ├── sources.json      # Multi-database config
│   └── outreach.db       # Outreach tracking (auto-created)
├── src/
│   ├── app/
│   │   ├── page.tsx      # Queue Mode (home)
│   │   ├── leads/        # All Leads table
│   │   ├── followups/    # Follow-ups due
│   │   └── api/          # API routes
│   ├── components/
│   │   ├── ui/           # Button, StatusBadge
│   │   ├── leads/        # LeadCard
│   │   └── outreach/     # MessageGenerator, ConversationPanel
│   ├── hooks/            # useKeyboardShortcuts
│   ├── lib/
│   │   ├── db/           # Database access
│   │   └── llm.ts        # LLM integration
│   └── types/
│       └── index.ts
└── package.json
```

## License

MIT
