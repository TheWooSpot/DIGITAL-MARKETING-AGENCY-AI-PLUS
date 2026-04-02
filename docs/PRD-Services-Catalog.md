# PRD: Service Catalog – DIGITAL MARKETING AGENCY AI PLUS

**Type:** Frontend  
**Source:** Cursor codebase sync (ServiceCategories.tsx, ServiceDetailSheet.tsx)  
**Last Updated:** 2026-02-26

---

## Overview

The Service Catalog is the core client-facing presentation of the AI+ marketing agency platform. It consists of 9 categories and 27 services (23 core + 4 membership), organized in a collapsible accordion with a detail sheet for each service.

---

## File Paths

- `src/components/ServiceCategories.tsx` – Canonical catalog, category definitions, service data
- `src/components/ServiceDetailSheet.tsx` – Detail sheet UI (accordion, tier badges, CTA)
- `src/types/services.ts` – ServiceDetail interface

---

## Categories & Services

### 1. Growth & Visibility
- **SearchLift™** SBO Engine
- **DirectAlign™** Media Engine
- **Authority Amplifier™** PR System
- **Signal Surge™** Paid Traffic Lab
- **NearRank™** Local Discovery Engine

### 2. Engagement & Communication
- **ConvoFlow™** AI Chat Suite
- **InboxIgnite™** Smart Email Engine
- **TextPulse™** SMS Automation
- **VoiceBridge™** AI Receptionist

### 3. Appointments & Conversions
- **BookStream™** Smart Scheduling Hub
- **CloseCraft™** Funnel Builder
- **DealDrive™** Proposal Automation
- **PayNamic™** Dynamic Checkout

### 4. Systems & Operations
- **HubAI™** CRM Architecture
- **FlowForge™** Automation Lab
- **CommandDesk™** Client Portal System

### 5. Knowledge & Activation
- **SkillSprint™** Academy
- **Onboardly™** Client Activation System

### 6. Brand & Signal
- **Voice & Vibe™** Production Engine
- **StoryFrame™** Brand Narrative Suite

### 7. Performance & Insights
- **InsightLoop™** Analytics Dashboard

### 8. Governance & Guardrails
- **TrustGuard™** Governance Layer
- **ReputationStack™** Reviews Engine

### 9. Partnerships & Expansion
- **AllianceOS™** Growth Partnerships Engine

### Membership & Access Layer
- **Socialutely Circle™**
- **Momentum Vault™**
- **Concierge Access™**
- **AI Maturity Diagnostic & Blueprint™**

---

## ServiceDetail Schema

Each service includes: id, name, tagline, description, howItWorks[], businessImpact[], infrastructure, tier (1|2|3), cta.

---

## UI Components

- **ServiceCategories**: Accordion panels, category cards, membership expandable
- **ServiceDetailSheet**: Left sidebar in-category nav, accordion How It Works, tier dots, CTA button
- **TierLevel**: Visual tier indicator (1–3 dots)

---

## Infrastructure References

Services reference platform infrastructure: uSBO, uPR, uBLAST, uMNM, uEVERYWHERE in infrastructure fields.
