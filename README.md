# EveryWeek

Week-based calendar

EveryWeek is a personal calendar app with an infinite-scrolling week view, day color-coding, and event management organized by custom categories.

## Features

- **Infinite scroll** — week-by-week scrolling in both directions with a "Jump to Today" button
- **Day painting** — click or drag to assign a category color to days; click again or use the eraser to remove
- **Multi-day events** — create, edit, and delete events spanning one or more days, each tied to a category
- **Custom categories** — create, rename, recolor, reorder, and delete categories; new accounts get four defaults
- **Week summaries** — sidebar showing events per week with overflow indicators

## Tech Stack

- React 19, TypeScript 6, Vite
- Supabase (Postgres, Auth, RLS)
- React Query v5, Zustand v5
- Radix UI, date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Supabase Setup

1. Create a new Supabase project
2. Create the required tables (`categories`, `events`, `day_categories`) — see [`src/types/database.ts`](src/types/database.ts) for the schema
3. Enable Row-Level Security (RLS) on all tables with policies filtering by `user_id`
4. Enable the Email/Password auth provider

### Installation

```bash
git clone https://github.com/rllyy97/seven-calendar.git
cd seven-calendar
npm install
```

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
npm run dev        # Start dev server (localhost:5173)
```

### Build & Test

```bash
npm run build      # Type-check and build for production
npm run test       # Run unit tests with Vitest
npm run lint       # Lint with ESLint
```

## Project Structure

```
src/
├── components/    # UI components (Calendar, DayCell, DayExpanded, Settings, Auth, etc.)
├── hooks/         # React Query hooks for categories, events, and day colors
├── stores/        # Zustand stores (auth, calendar state, paint tool)
├── lib/           # Supabase client
├── types/         # Database type definitions
├── styles/        # Shared CSS modules
└── test/          # Vitest tests and setup
```

## License

PolyForm Noncommercial License 1.0.0
