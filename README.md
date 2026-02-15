# PackFlow

Packaging order tracker with Kanban boards, calendar checkpoints, and team collaboration.

## Features

- **Kanban Board** — Drag-drop cards across custom lists
- **Calendar** — Auto-generated checkpoints (midway, pre-delivery, delivery) with delayed rollover
- **Changelog** — Every card tracks who did what and when
- **Multi-board** — Create boards, invite members via code
- **Day/Night mode** — Persistent theme toggle
- **Auth** — Sign up/in, password reset, 90-day session expiry
- **Images & Notes** — Paste image URLs, add notes per card

## Quick Start (Replit)

1. Create a new Replit → **Next.js** template
2. Replace the project files with this folder's contents
3. Set up Supabase (see below)
4. Click **Run**

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase/migration.sql`
3. Go to **Settings → API** → copy your URL and anon key
4. Create `.env.local` from `.env.local.example` and paste your keys

## Project Structure

```
packflow-project/
├── app/
│   ├── layout.js          # Root layout with fonts
│   ├── page.js             # Main page (client component)
│   └── globals.css         # Base styles
├── components/
│   └── PackFlow.jsx        # Full app component
├── lib/
│   └── supabase.js         # Supabase client
├── supabase/
│   └── migration.sql       # Database schema + RLS policies
├── package.json
├── next.config.js
├── jsconfig.json
├── .env.local.example
└── .gitignore
```

## Switching to Supabase (from artifact storage)

The current `PackFlow.jsx` uses `window.storage` for the Claude artifact demo.
To wire it to Supabase, replace the `S.get/S.set` calls with:

```js
import { supabase } from '@/lib/supabase';

// Example: load cards
const { data } = await supabase
  .from('cards')
  .select('*')
  .eq('board_id', boardId);

// Example: move card
await supabase
  .from('cards')
  .update({ column_id: newColumnId })
  .eq('id', cardId);

// Example: add changelog
await supabase
  .from('changelog')
  .insert({ card_id: cardId, user_name: name, action: 'moved card', detail: '...' });
```

Replace the auth screen with Supabase Auth:

```js
// Sign up
await supabase.auth.signUp({ email, password, options: { data: { name } } });

// Sign in
await supabase.auth.signInWithPassword({ email, password });

// Password reset
await supabase.auth.resetPasswordForEmail(email);

// Session
const { data: { user } } = await supabase.auth.getUser();
```
