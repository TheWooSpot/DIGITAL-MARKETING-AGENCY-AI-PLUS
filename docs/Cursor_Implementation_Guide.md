# HOW TO USE THESE FILES IN CURSOR
## AI Diagnostic Dashboard — Quick Start Guide

---

## STEP 1: ORGANIZE YOUR CURSOR WORKSPACE

Create this folder structure in your project root:

```
/socialutely-diagnostic/
├── /docs/
│   ├── Cursor_PRD_AI_Diagnostic_Dashboard.md (main PRD - copy this)
│   ├── Diagnostic_Architecture.pdf (reference)
│   ├── Developer_Logic_Spec.md (reference)
│   └── AI_Dashboard_UI_Report_Design.pdf (UI reference)
│
├── /database/
│   ├── ai_questions.csv
│   ├── ai_scoring_bands.csv
│   ├── ai_domain_weights.csv
│   ├── service_routing_matrix.csv
│   ├── tier_routing.csv
│   └── schema.sql (we'll generate this)
│
├── /src/
│   ├── app/
│   │   ├── page.tsx (home)
│   │   ├── diagnostic/
│   │   │   ├── page.tsx (public landing)
│   │   │   ├── results/
│   │   │   │   └── page.tsx (post-assessment results)
│   │   │   └── unlock/
│   │   │       └── page.tsx (membership gate)
│   │   ├── members/
│   │   │   └── diagnostic/
│   │   │       ├── maturity/page.tsx
│   │   │       ├── dashboard/page.tsx
│   │   │       └── results/page.tsx
│   │   └── api/
│   │       └── assessments/
│   │           ├── score/route.ts
│   │           └── submit/route.ts
│   │
│   ├── components/
│   │   ├── DiagnosticForm.tsx
│   │   ├── ScoreGauge.tsx
│   │   ├── HeatmapChart.tsx
│   │   ├── ResultsCard.tsx
│   │   └── RecommendationsList.tsx
│   │
│   ├── lib/
│   │   ├── scoring-engine.ts (main calculation logic)
│   │   ├── routing-engine.ts (service recommendations)
│   │   ├── supabase-client.ts
│   │   └── constants.ts
│   │
│   └── styles/
│       └── globals.css (dark theme)
│
└── package.json
```

---

## STEP 2: COPY THE PRD INTO CURSOR

### Option A (Recommended): Multi-file Chat Context

1. Open **Cursor Chat**
2. Paste this command:

```
I'm building an AI diagnostic dashboard for Socialutely. Here are my specs:

[PASTE ENTIRE CONTENT OF: Cursor_PRD_AI_Diagnostic_Dashboard.md]

Build this as a Next.js 14 app with Supabase. Start with Phase 1 (public AI IQ™ snapshot).
```

### Option B: Create Context File

1. Copy `Cursor_PRD_AI_Diagnostic_Dashboard.md` into `/docs/` folder
2. In Cursor, use **@context** to reference it:

```
@docs/Cursor_PRD_AI_Diagnostic_Dashboard.md

Build the public AI IQ™ diagnostic landing page first.
```

### Option C: Use as Project-Level Instructions

1. Create `.cursor/rules.md` with PRD content
2. Cursor will auto-apply context to all subsequent chats

---

## STEP 3: INITIALIZE THE PROJECT

Ask Cursor to run:

```bash
# Create Next.js 14 project
npx create-next-app@latest . --typescript --tailwind --app --no-git

# Install required packages
npm install @supabase/supabase-js @tanstack/react-query recharts zod stripe
npm install -D typescript @types/node @types/react tailwindcss

# Create Supabase project (you do this manually at supabase.com)
# Then run:
npm install supabase

# Create environment file
echo "NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=your-database-connection-string" > .env.local
```

---

## STEP 4: SET UP DATABASE

### In Supabase Console (supabase.com):

1. Create new project
2. Open SQL Editor
3. Copy/paste this schema:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  org_name TEXT,
  role TEXT,
  membership_tier VARCHAR(50) DEFAULT 'none',
  membership_active BOOLEAN DEFAULT false,
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Assessments table
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assessment_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'in_progress',
  ai_iq_score NUMERIC,
  ai_maturity_score NUMERIC,
  competency_score NUMERIC,
  governance_score NUMERIC,
  risk_score NUMERIC,
  maturity_band VARCHAR(50),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Responses table
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  question_id VARCHAR(255),
  response_value INTEGER,
  response_text TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Questions table
CREATE TABLE questions (
  id VARCHAR(255) PRIMARY KEY,
  assessment_type VARCHAR(50),
  domain VARCHAR(255),
  question_text TEXT,
  response_type VARCHAR(50),
  options JSONB,
  active BOOLEAN DEFAULT true
);

-- Recommendations table
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  service_id VARCHAR(10),
  service_name VARCHAR(255),
  priority VARCHAR(50),
  rationale TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view own assessments" ON assessments FOR SELECT USING (auth.uid() = user_id);
```

4. Run the SQL

### Import CSV Data:

In Supabase **Table Editor**:

1. Select `questions` table
2. Click "Import" → Upload `ai_questions.csv`
3. Select `scoring_bands` table → Import `ai_scoring_bands.csv`
4. etc.

---

## STEP 5: BUILD PHASE 1 (Public AI IQ™)

### Ask Cursor to build:

```
Using the PRD and tech stack, build Phase 1:

1. Public landing page at /diagnostic
2. AI IQ™ form with 5-10 questions
3. Scoring engine (scoring-engine.ts)
4. Results page at /diagnostic/results

Use:
- ShadCN components for UI
- Dark theme with teal accents
- Recharts for score gauge
- Supabase for data storage
- TypeScript for type safety

Start with this file structure:
/app/diagnostic/page.tsx (landing)
/app/diagnostic/results/page.tsx (results)
/lib/scoring-engine.ts (logic)
/components/ScoreGauge.tsx (visualization)
```

### Key Logic (Scoring Engine):

Ask Cursor to create `lib/scoring-engine.ts`:

```typescript
// Pseudo-code Cursor will expand:

export async function calculateAIIQScore(responses: Response[]): Promise<ScoreResult> {
  // 1. Group by domain (Deployment, Integration, Revenue, Automation, Oversight)
  // 2. Average each domain
  // 3. Weight each domain (20% each)
  // 4. Sum to get 0-100 score
  // 5. Map to tier band
  // 6. Generate narrative snippet
  // Return { score, band, narrative, strengths, blindSpots }
}
```

---

## STEP 6: BUILD PHASE 2 (Membership + AI Maturity Index™)

Once Phase 1 is working, ask Cursor:

```
Build Phase 2 features:

1. Supabase Auth setup (email login)
2. Membership gating at /diagnostic/unlock
3. Full 27-question assessment at /members/diagnostic/maturity
4. Dashboard with 4-pillar heatmap at /members/diagnostic/dashboard
5. PDF report generation

Add Stripe integration for membership purchases.
Use the tier routing logic from the PRD.
```

---

## STEP 7: BUILD PHASE 3 (Competency + Service Routing)

```
Build Phase 3:

1. 8-question AI Competency assessment
2. Service routing engine (routing-engine.ts)
3. Governance Blueprint offer display
4. Full recommendation output with service IDs

Reference service_routing_matrix.csv for logic.
```

---

## CRITICAL FILES TO HAVE READY

Before you start, make sure you have downloaded:

✅ **Cursor_PRD_AI_Diagnostic_Dashboard.md** (THIS IS THE MAIN SPEC)
✅ **ai_questions.csv** (import to database)
✅ **ai_scoring_bands.csv** (import to database)
✅ **ai_domain_weights.csv** (for scoring logic)
✅ **service_routing_matrix.csv** (for recommendations)
✅ **tier_routing.csv** (for membership mapping)
✅ **Diagnostic_Architecture.pdf** (reference)
✅ **Developer_Logic_Spec.md** (reference)
✅ **AI_Dashboard_UI_Report_Design.pdf** (UI reference)

---

## CURSOR BUILD COMMANDS (COPY/PASTE READY)

### Command 1: Initialize Project
```
I'm building an AI diagnostic dashboard. First, initialize the Next.js 14 project with:
- TypeScript
- Tailwind CSS
- ShadCN UI components
- Supabase integration
- Dark theme (charcoal + teal accents)

Here's the PRD: [PASTE PRD]

Start with the folder structure and basic setup.
```

### Command 2: Build Scoring Engine
```
Build the scoring engine in lib/scoring-engine.ts:

Input: Array of responses {question_id, response_value}
Output: {ai_iq_score (0-100), maturity_band, narrative, strengths, blindSpots}

Logic:
- Group responses by domain
- Average each domain (5 domains)
- Weight each 20%
- Map score to band using ai_scoring_bands.csv

Make it testable with unit tests.
```

### Command 3: Build Public Diagnostic Form
```
Build /app/diagnostic/page.tsx:

- Hero section with copy from PRD
- Form with 10-15 questions (AI IQ snapshot)
- Submit button that calls scoring engine
- Loading state
- Redirect to /diagnostic/results on completion

Use ShadCN Form + custom dark theme.
```

### Command 4: Build Results Page
```
Build /app/diagnostic/results/page.tsx:

Display:
- Large AI IQ score with animated gauge (Recharts)
- Maturity tier label
- 2-3 line interpretation
- Strengths box (2-3 bullets)
- Blind spots box (2-3 bullets)
- CTA button: "Unlock Full Report"

Use dark theme. Make it visually striking.
```

---

## COMMON CURSOR QUESTIONS & ANSWERS

**Q: "Should we use Server Components or Client Components?"**
A: Use Server Components for form logic, Client Components for interactive charts/gauges.

**Q: "How do we handle authentication?"**
A: Use Supabase Auth in Phase 1 (optional), implement fully in Phase 2.

**Q: "Should we cache results?"**
A: Yes, use React Query with 24-hour cache for assessment results.

**Q: "Do we need API routes or Server Actions?"**
A: Use Server Actions for Phase 1 (simpler), migrate to API routes in Phase 2 if needed.

**Q: "How do we generate PDFs?"**
A: Use `@react-pdf/renderer` client-side OR `puppeteer` server-side. Ask Cursor which is better for your use case.

---

## TROUBLESHOOTING

### Database connection fails
- Check `.env.local` has correct Supabase URL + key
- Verify RLS policies allow anonymous access for Phase 1
- Test with Supabase console first

### Scoring logic doesn't match PRD
- Verify CSV data imported correctly
- Test calculateAIIQScore() with known inputs
- Check domain weighting (should be 20% each)

### Gauge visualization broken
- Ensure Recharts is installed
- Check data format matches Recharts expectations
- Verify Tailwind CSS is configured

### Stripe integration issues
- Verify environment variables for Stripe keys
- Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks`
- Check webhook secrets match

---

## DEPLOYMENT CHECKLIST

- [ ] All Phase 1 features working locally
- [ ] Database seeded with test data
- [ ] Environment variables configured
- [ ] Vercel project created
- [ ] Supabase project ready
- [ ] Push to GitHub
- [ ] Deploy to Vercel
- [ ] Test public diagnostic on staging
- [ ] Enable monitoring + logging
- [ ] Security audit (RLS policies)
- [ ] Performance check (Lighthouse score > 90)

---

## NEXT STEPS AFTER PHASE 1 LAUNCH

1. Collect 50+ assessments to build benchmark data
2. Analyze diagnostic results for patterns
3. Build Phase 2 (membership + full maturity index)
4. Set up Stripe + payment processing
5. Implement PDF report generation
6. Build Phase 3 (competency + service routing)

---

## SUPPORT

- **Supabase Docs:** supabase.com/docs
- **Next.js Docs:** nextjs.org/docs
- **ShadCN Docs:** ui.shadcn.com
- **Recharts Docs:** recharts.org

If Cursor gets stuck, paste the **entire PRD** again with your specific error.

---

**Good luck! This diagnostic system is going to be a game-changer for Socialutely.**

Built with ❤️ for founder-first operations.
