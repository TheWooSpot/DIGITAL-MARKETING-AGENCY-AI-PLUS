# CURSOR BUILD PRD: AI DIAGNOSTIC DASHBOARD SYSTEM
## Socialutely AI Maturity Index™ Platform

**Status:** Ready for Build  
**Priority:** P0 - Revenue Critical  
**Tech Stack:** Next.js 14 + React + Supabase + Stripe + Tailwind + ShadCN UI  
**Estimated Timeline:** Phase 1: 3-4 days | Phase 2: 2-3 days | Phase 3: 3-4 days  

---

## 1. EXECUTIVE OVERVIEW

Build an interactive diagnostic platform that assesses organizational AI maturity across four progressive tiers:

1. **AI IQ™ Snapshot** (Public, free, 5-10 min)
2. **AI Maturity Index™** (Member-gated, 10-15 min)
3. **AI Competency Layer** (Member-gated, 8-10 min)
4. **Governance Blueprint** (High-ticket audit, human-delivered)

The system must automatically route prospects to relevant Socialutely services and recommend membership tiers based on diagnostic scores.

---

## 2. TECHNICAL ARCHITECTURE

### Frontend Stack
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18+
- **Styling:** Tailwind CSS 3+
- **Components:** ShadCN UI
- **Charts/Viz:** Recharts + custom SVG
- **Theme:** Dark mode (Hybrid Modern aesthetic)
  - Deep charcoal/near-black base
  - Soft gradient overlays (indigo/slate/muted electric blue)
  - Accent: teal or amber (restrained signal color)

### Backend Stack
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth (JWT)
- **Payments:** Stripe (for membership gating)
- **Email:** Resend (optional, for report delivery)
- **File Storage:** Supabase Storage (for PDF reports)
- **PDF Generation:** `puppeteer` or `html-to-pdf` server-side

### Infrastructure
- **Deployment:** Vercel (Next.js native)
- **Database Hosting:** Supabase
- **Version Control:** GitHub
- **Environment:** Production + Staging

---

## 3. DATABASE SCHEMA

### Core Tables

#### `users`
```sql
id: UUID (PK)
email: TEXT (unique)
org_name: TEXT
role: TEXT
membership_tier: VARCHAR (circle | momentum | concierge | none)
membership_active: BOOLEAN
stripe_customer_id: VARCHAR
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### `assessments`
```sql
id: UUID (PK)
user_id: UUID (FK users)
assessment_type: VARCHAR (AI_IQ | MATURITY | COMPETENCY | GOVERNANCE)
status: VARCHAR (in_progress | completed)
ai_iq_score: NUMERIC (0-100)
ai_maturity_score: NUMERIC (0-100)
competency_score: NUMERIC (0-100)
governance_score: NUMERIC (0-100)
risk_score: NUMERIC (0-100)
maturity_band: VARCHAR (Analog | Assisted | Emerging | Integrated | Optimized)
completed_at: TIMESTAMP
created_at: TIMESTAMP
```

#### `responses`
```sql
id: UUID (PK)
assessment_id: UUID (FK assessments)
question_id: VARCHAR
response_value: INTEGER (0-20)
response_text: TEXT (optional)
created_at: TIMESTAMP
```

#### `questions`
```sql
id: VARCHAR (PK) -- e.g., AIQ_01, MAT_01, etc.
assessment_type: VARCHAR
domain: VARCHAR (Deployment, Integration, Revenue, etc.)
question_text: TEXT
response_type: VARCHAR (multiple_choice | boolean | scale)
options: JSONB (array of {label, score} objects)
active: BOOLEAN
```

#### `recommendations`
```sql
id: UUID (PK)
assessment_id: UUID (FK assessments)
service_id: VARCHAR (101, 201, 301, etc.)
service_name: VARCHAR
priority: VARCHAR (high | medium | low)
rationale: TEXT
created_at: TIMESTAMP
```

#### `diagnostic_results`
```sql
assessment_id: UUID (PK/FK assessments)
ai_iq_score: NUMERIC
governance_score: NUMERIC
competency_score: NUMERIC
resilience_score: NUMERIC
recommended_tier: VARCHAR
recommended_membership: VARCHAR
recommended_next_step: VARCHAR
benchmark_percentile: NUMERIC
report_url: TEXT (PDF storage path)
```

---

## 4. CORE FEATURES (PHASE 1)

### Feature 1.1: Public AI IQ™ Snapshot Landing Page

**URL:** `/diagnostic`

**User Flow:**
1. Hero section with copy (see Copywriting section below)
2. 10-15 quick questions (3-5 min completion)
3. Instant scoring
4. Results display with AI IQ meter
5. Insight statements
6. Call-to-action: "Unlock Full AI Maturity Report"

**Questions (Simplified v1):**

| Domain | Q# | Question | Options | Scoring |
|--------|----|-----------| --------|----------|
| Deployment | 1 | Does your org use AI tools? | None / Experimental / Multiple teams / Embedded | 0/5/12/20 |
| Integration | 2 | Are AI tools connected to CRM? | No / Manual / Some / Full | 0/6/12/20 |
| Revenue | 3 | Does AI impact revenue measurably? | No / Indirect / Some / Clear | 0/6/12/20 |
| Automation | 4 | Do AI tools trigger workflows? | Never / Sometimes / Often / Core | 0/7/14/20 |
| Oversight | 5 | Do you have AI guidelines? | No / Informal / Partial / Documented | 0/7/14/20 |

**Scoring Formula:**
```
AI_IQ_Score = (Q1 + Q2 + Q3 + Q4 + Q5) / 5 * 20
Output: 0-100
```

**Result Display:**
- Large numeric score (animated gauge)
- Tier label (AI Absent / Experimental / Emerging / Integrated / Intelligent Infrastructure)
- 2-3 line interpretation
- Strengths box (2-3 callouts)
- Blind spots box (2-3 callouts)
- CTA button: "Unlock Full Report"

**Email Capture (Optional):**
Before showing full results, capture email for gating:
- Name field
- Email field
- Org name field
- Checkbox: "Email me the full report"

### Feature 1.2: Scoring Engine (Backend)

**API Route:** `POST /api/assessments/score`

**Input:**
```json
{
  "assessment_type": "AI_IQ",
  "responses": [
    { "question_id": "AIQ_01", "response_value": 20 },
    { "question_id": "AIQ_02", "response_value": 12 }
  ]
}
```

**Output:**
```json
{
  "assessment_id": "uuid",
  "ai_iq_score": 58,
  "maturity_band": "Emerging",
  "narrative": "Your organization is moving beyond experimentation...",
  "strengths": ["Multi-team AI usage", "Integration with business systems"],
  "blind_spots": ["Revenue impact unmeasured", "Oversight informal"]
}
```

**Logic:**
1. Sum responses by domain
2. Weight domain contributions (each domain = 20%)
3. Generate tier band
4. Select pre-written narrative snippets based on score range
5. Return result object

### Feature 1.3: Public Results Page

**URL:** `/diagnostic/results`

**Display:**
```
┌─────────────────────────────────────┐
│  AI IQ™ Score: 58 / 100             │
│  Status: Emerging AI Integration    │
├─────────────────────────────────────┤
│  Your Strengths                     │
│  • Multi-department AI usage        │
│  • Some system integration          │
│                                     │
│  Blind Spots                        │
│  • Revenue impact not measured      │
│  • No formal AI oversight           │
├─────────────────────────────────────┤
│  [Unlock Full AI Maturity Report]   │
│         (leads to membership gate)  │
└─────────────────────────────────────┘
```

---

## 5. PHASE 2: MEMBERSHIP GATING & AI MATURITY INDEX™

### Feature 2.1: Membership Authentication Gate

**URL:** `/diagnostic/unlock`

**User Experience:**
1. If user not logged in: "Create free account" button (Supabase Auth)
2. If user exists: Show available memberships
   - Socialutely Circle™ ($9-29/mo)
   - Momentum Vault™ ($49-99/mo)
   - Concierge Access™ ($1,000+/mo)
3. Stripe checkout for paid tiers
4. Post-purchase redirect to full report

### Feature 2.2: AI Maturity Index™ Full Assessment

**URL:** `/members/diagnostic/maturity`

**User Flow:**
1. Expanded question set (27 questions total)
2. Progressive disclosure (one section at a time)
3. Real-time scoring
4. Results dashboard
5. PDF download option

**Sections:**
- AI IQ™ (5 questions, same as public)
- Governance Readiness (6 questions)
- AI Competency (8 questions)
- Risk Exposure (5 questions)

**Scoring:**
```
AI Maturity Index = 
  (AI_IQ × 0.35) +
  (Governance × 0.25) +
  (Competency × 0.20) +
  (Resilience × 0.20)
```

### Feature 2.3: Maturity Dashboard

**URL:** `/members/diagnostic/dashboard`

**Displays:**
1. **Composite Score Card**
   - Large number (0-100)
   - Maturity tier (Analog → Optimized)
   - Progress ring visual

2. **4-Pillar Heatmap**
   - AI IQ (horizontal bar)
   - Governance (horizontal bar)
   - Competency (horizontal bar)
   - Resilience (horizontal bar)
   - Color-coded: Red (0-25) → Yellow (25-50) → Green (50-100)

3. **Breakdown Narrative**
   - Current tier summary (1-2 sentences)
   - What organizations at this level typically experience
   - Typical bottlenecks
   - Likely next leap

4. **90-Day Roadmap**
   - Days 1-30: Stabilize (key actions)
   - Days 31-60: Systemize (key actions)
   - Days 61-90: Expand (key actions)

5. **Service Recommendations**
   - List 3-5 recommended services (from routing matrix)
   - Tier recommendation (Essentials / Momentum / Signature / Concierge)
   - "Start Implementation" CTA

### Feature 2.4: PDF Report Generation

**Endpoint:** `GET /api/reports/generate-pdf?assessment_id=uuid`

**Report Includes:**
- Executive summary (1 page)
- 4-pillar heatmap (visual)
- Detailed breakdown (per pillar)
- 90-day roadmap
- Service recommendations
- Tier recommendation
- Optional: Downloadable as PDF file

---

## 6. PHASE 3: AI COMPETENCY & SERVICE ROUTING

### Feature 3.1: AI Competency Assessment

**Questions (8 total):**

| Domain | Q# | Question | Scoring |
|--------|----|-----------| --------|
| Leadership | 1 | Does leadership understand AI beyond content generation? | 1-5 scale |
| Leadership | 2 | Can leaders identify 3+ high-value AI use cases? | Yes/No → 20/0 |
| Team | 3 | Are team members trained in prompt design? | Yes/No → 20/0 |
| Team | 4 | Can staff distinguish experiment from production? | Yes/No → 20/0 |
| Workflow | 5 | Are repeatable AI workflows documented? | Yes/No → 20/0 |
| Workflow | 6 | Are teams coached on AI-caused role changes? | 1-5 scale |
| Training | 7 | Is there a structured AI training cadence? | Yes/No → 20/0 |
| Training | 8 | Are teams evaluated on AI-assisted productivity? | Yes/No → 20/0 |

**Scoring Band:**
- 0-24: Unprepared
- 25-49: Aware but uneven
- 50-74: Capable
- 75-100: Operationally fluent

### Feature 3.2: Service Routing Engine

**Logic:** Based on diagnostic gaps, recommend services.

**Example Rules:**
```
IF ai_iq < 40 AND governance < 40 THEN
  RECOMMEND: ConvoFlow™, VoiceBridge™, CoreSync™
  TIER: Essentials
ENDIF

IF competency < 40 THEN
  RECOMMEND: SkillSprint™, OnboardX™
ENDIF

IF governance < 50 AND ai_iq > 50 THEN
  RECOMMEND: TrustGuard™
  TRIGGER: Governance Blueprint upsell
ENDIF
```

### Feature 3.3: Governance Blueprint Offer

**Trigger:** If `ai_iq > 45` AND `governance < 45` OR `risk > 60`

**Offer Display:**
- "Your AI maturity suggests governance architecture..."
- Governance Blueprint pricing: $3,000-$15,000
- "Schedule audit consultation"
- Button: "Learn More"

**Action:** Links to governance blueprint landing page (Phase 3b)

---

## 7. DATABASE IMPORT INSTRUCTIONS

### For Phase 1 (AI IQ™ questions):
Import `ai_questions.csv` into `questions` table:

```sql
COPY questions (id, assessment_type, domain, question_text, response_type, options)
FROM 'ai_questions.csv' CSV HEADER;
```

### For Phase 2 (Scoring logic):
Import `ai_scoring_bands.csv` and `ai_domain_weights.csv`:

```sql
COPY scoring_bands (score_min, score_max, label, tier)
FROM 'ai_scoring_bands.csv' CSV HEADER;

COPY domain_weights (domain, weight, assessment_type)
FROM 'ai_domain_weights.csv' CSV HEADER;
```

### For Phase 3 (Service routing):
Import `service_routing_matrix.csv`:

```sql
COPY recommendations (gap_condition, service_id, service_name, priority)
FROM 'service_routing_matrix.csv' CSV HEADER;
```

---

## 8. COPYWRITING & MESSAGING

### Landing Page (Public)

**Headline:**
"AI IQ™ — How Intelligently Is Your Business Using AI?"

**Subheading:**
"Artificial intelligence is transforming operations. But many organizations adopt tools without understanding whether their AI systems are integrated, productive, governed, or scalable. In just a few minutes, discover your AI maturity and how you compare."

**CTA Button:**
"Take the Assessment (5 min)"

### Results Page (After AI IQ™)

**High Score (70+):**
"Your organization is operating with high AI intelligence. The next frontier is resilience: governance, measurement, and long-term system architecture."

**Medium Score (40-70):**
"Your organization has moved beyond experimentation. AI is producing value in pockets, but integration and consistency are limiting broader gains."

**Low Score (<40):**
"Your organization is still in the early adoption phase of AI. The opportunity is not just tool adoption, but identifying where AI can create meaningful leverage first."

### Membership Unlock (Before Full Report)

**Copy:**
"Unlock Your AI Maturity Blueprint"

"Access your full diagnostic including governance readiness, team competency assessment, risk exposure modeling, and a 90-day activation roadmap."

**Membership Options:**
- **Socialutely Circle™** ($9-29/mo): Foundational access
- **Momentum Vault™** ($49-99/mo): Premium resources
- **Concierge Access™** ($1,000+/mo): Strategic oversight

---

## 9. UI/UX SPECIFICATIONS

### Color System (Hybrid Modern Dark Theme)

```
Primary Background:    #0a0e1a (near-black)
Secondary Background:  #1a1f2e (charcoal)
Accent Primary:        #00d9ff (teal signal)
Accent Secondary:      #ffa500 (amber signal)
Text Primary:          #e8eef5 (light)
Text Secondary:        #a0aac0 (muted)
Border:                #2a3f5f (soft slate)
Success:               #10b981 (green)
Warning:               #f59e0b (amber)
Error:                 #ef4444 (red)
```

### Typography

```
Font: Inter (system fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI')

Headings:
  H1: 48px, weight 700, line-height 1.2
  H2: 32px, weight 700, line-height 1.3
  H3: 24px, weight 600, line-height 1.3

Body:
  Default: 16px, weight 400, line-height 1.6
  Small: 14px, weight 400, line-height 1.5

Numeric Data:
  Bold: weight 700
  Letter-spacing: -0.5px (tighter for emphasis)
```

### Component System

- **Buttons:** ShadCN UI defaults + custom dark variants
- **Cards:** 4px rounded, 1px border (#2a3f5f), 8px padding
- **Modals:** Overlay (#0a0e1a with 60% opacity), card centered
- **Forms:** ShadCN Form + custom dark styling
- **Inputs:** 8px padding, 4px border-radius, focus ring (#00d9ff)

### Motion & Animation

- **Transitions:** Prefer `transition-all duration-300 ease-out`
- **Gauge fills:** Smooth arc animation over 1.5s
- **Card reveals:** Stagger 100ms per element
- **Hover states:** Subtle brightness shift (+5%)
- **Loading:** Pulse or spinner (no bounce)

---

## 10. DEPLOYMENT CHECKLIST

### Pre-Launch (Phase 1)
- [ ] Supabase project created + tables initialized
- [ ] Database seeded with 10 AI IQ questions
- [ ] Scoring engine tested (unit tests for calculation logic)
- [ ] Landing page deployed to `/diagnostic`
- [ ] Results page deployed with mock data
- [ ] Email capture optional (can be Phase 2)
- [ ] Security: RLS policies on assessments table

### Phase 2 Launch
- [ ] Supabase Auth configured (email + social login)
- [ ] Stripe integration for membership purchases
- [ ] Membership tiers created in Stripe
- [ ] Full 27-question assessment implemented
- [ ] Dashboard with 4-pillar heatmap working
- [ ] PDF report generation tested
- [ ] RLS policies updated for member-only data

### Phase 3 Launch
- [ ] Competency questions added + scoring logic
- [ ] Service routing matrix fully implemented
- [ ] Governance Blueprint offer display
- [ ] Tier recommendation logic tested
- [ ] Proposal integration (if using dynamic pricing engine)

### Security & Monitoring
- [ ] Enable Row Level Security on all tables
- [ ] Set up monitoring/logging for failed assessments
- [ ] Implement rate limiting on scoring endpoint
- [ ] Enable HTTPS + CSP headers
- [ ] Stripe webhook handlers tested
- [ ] Regular security audit (Supabase advisors)

---

## 11. FILE REFERENCES

The following files support this build:

1. **AI_Diagnostic_Engine_Master.xlsx**
   - Master spreadsheet with all questions, weights, and logic
   - Import questions from "Questions" sheet

2. **ai_questions.csv**
   - Machine-readable question bank
   - Import directly to `questions` table

3. **ai_scoring_bands.csv**
   - Score thresholds and tier mappings
   - Use in scoring engine logic

4. **Service_Routing_Matrix.csv**
   - Maps diagnostic gaps to recommended services
   - Use in recommendation engine

5. **Tier_Routing.csv**
   - Maps scores to membership tiers (Essentials / Momentum / Signature / Concierge)
   - Use in tier recommendation logic

6. **Diagnostic_Architecture.pdf**
   - High-level system overview (reference only)

7. **Developer_Logic_Spec.md**
   - Detailed pseudocode for all engines (reference for implementation)

8. **AI_Dashboard_UI_Report_Design.pdf**
   - Visual mockups of dashboard and report layouts
   - Use as design reference for Figma / component building

---

## 12. IMPLEMENTATION NOTES FOR CURSOR

### How to Use This PRD:

1. **Copy this entire document** and paste it into Cursor's Chat as context
2. **Reference the CSV files** when building database imports
3. **Use the "Feature" sections** as your build checklist
4. **Follow the "Deployment Checklist"** at launch
5. **Ask Cursor for clarification** on any scoring logic or database schema

### Expected Questions from Cursor:

- "Should we use TypeScript for type safety?" → YES
- "Do we need Zod for form validation?" → YES
- "Should we cache scoring results?" → YES (in-memory, 24hr TTL)
- "Do we need a separate API vs server actions?" → Server Actions for Phase 1 (simpler)
- "How do we handle PDF generation?" → Use `@react-pdf/renderer` or server-side `puppeteer`

### Quick Build Commands:

```bash
# Initialize Next.js 14 with Tailwind
npx create-next-app@latest diagnostic-app --tailwind --typescript

# Install required dependencies
npm install @supabase/supabase-js @tanstack/react-query recharts stripe zod

# Create database tables (use Supabase SQL editor)
# (See Database Schema section above)

# Build Phase 1 first (public AI IQ™)
# Then Phase 2 (membership + maturity)
# Then Phase 3 (competency + routing)
```

---

## 13. SUCCESS METRICS (GO-LIVE)

✅ Phase 1 Complete:
- [ ] 100+ public users take AI IQ™ assessment
- [ ] Landing page loads in < 2s
- [ ] Scoring accuracy validated against manual calculations

✅ Phase 2 Complete:
- [ ] 30+ members unlock full AI Maturity Index™
- [ ] $5k+ recurring revenue from memberships
- [ ] PDF reports generate without errors

✅ Phase 3 Complete:
- [ ] 10+ governance blueprint consultations booked
- [ ] Service routing driving 20% of new client acquisitions
- [ ] Tier recommendations match sales pipeline data

---

**END PRD**

**Contact:** [Your email]  
**Last Updated:** March 13, 2026  
**Next Review:** Post-Phase 1 Launch
