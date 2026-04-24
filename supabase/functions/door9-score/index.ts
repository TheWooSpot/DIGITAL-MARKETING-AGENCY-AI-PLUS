import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ─── DOMAIN WEIGHTS ───────────────────────────────────────────────────────────
const DOMAIN_WEIGHTS: Record<string, number> = {
  'Deployment Depth':         0.20,
  'Integration Maturity':     0.20,
  'Revenue Alignment':        0.25,
  'Automation Orchestration': 0.20,
  'Oversight Awareness':      0.15,
};

const AIQ2_SCORE_MAP: Record<number, number> = { 0:0, 1:4, 2:8, 3:12, 4:16 };

// ─── SCORE BANDS ──────────────────────────────────────────────────────────────
const SCORE_BANDS = [
  { min: 0,  max: 20,  label: 'AI Absent',                  tier: 'Essentials' },
  { min: 21, max: 40,  label: 'Experimental',               tier: 'Essentials' },
  { min: 41, max: 60,  label: 'Emerging',                   tier: 'Momentum'   },
  { min: 61, max: 80,  label: 'Integrated',                 tier: 'Signature'  },
  { min: 81, max: 100, label: 'Intelligent Infrastructure', tier: 'Vanguard'   },
];

// ─── RUNG ROUTING ─────────────────────────────────────────────────────────────
const RUNG_ROUTING = [
  {
    rung: 2, label: 'Adaptation',
    price: '$297 one-time', price_type: 'one_time', price_amount: 297,
    format: 'DIY self-guided course',
    cta: 'Enroll in Rung 2 — Adaptation',
    cta_sub: '$297 · Self-guided AI course',
    description: 'You are in the Experimental zone. Rung 2 gives you the full framework and workflows to get AI actually running in your business — at your own pace.',
    score_min: 0, score_max: 40,
  },
  {
    rung: 3, label: 'Optimization',
    price: 'From $797', price_type: 'tiered', price_amount: 797,
    format: 'DWY workshop-based (3, 5, 7, or 10 sessions)',
    cta: 'Choose Your Rung 3 Workshop',
    cta_sub: 'From $797 · 3 / 5 / 7 / 10 session packages',
    description: 'AI is in your business but it is not yet earning. Rung 3 puts a guide in the room — human and AI — to build the workflows that make your AI investment measurable.',
    score_min: 41, score_max: 70,
  },
  {
    rung: 4, label: 'Stewardship',
    price: '$4,997/quarter', price_type: 'quarterly_contract', price_amount: 4997,
    format: 'DFY tech consultancy — strategic + contractual',
    cta: 'Start the Rung 4 Conversation',
    cta_sub: '$4,997/qtr · 12-month strategic agreement',
    description: 'You are in the Integrated or Intelligent Infrastructure band. Rung 4 is a contracted strategic relationship — your tech team in the room, governing AI at the highest level.',
    score_min: 71, score_max: 100,
  },
];

function getScoreBand(score: number) {
  return SCORE_BANDS.find(b => score >= b.min && score <= b.max)
    ?? { label: 'Experimental', tier: 'Essentials' };
}

function getRecommendedRung(score: number) {
  return RUNG_ROUTING.find(r => score >= r.score_min && score <= r.score_max)
    ?? RUNG_ROUTING[0];
}

// ─── TALLY FIELD TYPES ────────────────────────────────────────────────────────
interface TallyOption { id: string; text: string; }
interface TallyField {
  key: string;
  label: string;
  type: string;
  value: unknown;
  options?: TallyOption[];
}

function extractTextField(fields: TallyField[], label: string): string {
  const f = fields.find(f => f.label === label);
  if (!f) return '';
  if (Array.isArray(f.value)) return (f.value as string[]).join(', ');
  return String(f.value ?? '');
}

// ─── KEY FIX: resolve UUID values → option text strings ─────────────────────
// Tally sends MULTIPLE_CHOICE and CHECKBOXES values as option UUIDs, not texts.
// We must look up the text via the options array.
function buildAnswerMap(
  fields: TallyField[]
): Record<string, string | string[]> {
  const map: Record<string, string | string[]> = {};

  for (const f of fields) {
    // Skip non-question fields
    if (['INPUT_TEXT','INPUT_EMAIL','INPUT_LINK','HIDDEN_FIELDS'].includes(f.type)) continue;
    // Skip CHECKBOXES sub-items (e.g. "label (Marketing)" — Tally sends both)
    // These have boolean values and their label contains the parent label
    if (f.type === 'CHECKBOXES' && typeof f.value === 'boolean') continue;

    const options = (f.options ?? []) as TallyOption[];

    if (f.type === 'MULTIPLE_CHOICE') {
      // value is an array containing ONE selected option UUID
      const selectedIds = Array.isArray(f.value) ? (f.value as string[]) : [String(f.value ?? '')];
      const selectedId = selectedIds[0];
      // Resolve UUID → text via options array
      const matched = options.find(o => o.id === selectedId);
      if (matched) {
        map[f.label] = matched.text;
      }
    } else if (f.type === 'CHECKBOXES') {
      // value is an array of selected option UUIDs
      const selectedIds = Array.isArray(f.value) ? (f.value as string[]) : [];
      // Resolve each UUID → text
      const selectedTexts = selectedIds
        .map(id => options.find(o => o.id === id)?.text)
        .filter((t): t is string => Boolean(t));
      if (selectedTexts.length > 0) {
        map[f.label] = selectedTexts;
      }
    }
  }

  return map;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'door9-score v4 live — UUID→text fix + response table' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let payload: Record<string, unknown>;
  try { payload = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (payload.data ?? payload) as any;
  const fields: TallyField[] = data.fields ?? [];
  const submissionId: string = data.submissionId ?? data.responseId ?? '';

  // ── Contact fields
  const fullName    = extractTextField(fields, 'Full Name');
  const bizName     = extractTextField(fields, 'Business Name');
  const email       = extractTextField(fields, 'Business Email');
  const website     = extractTextField(fields, 'Website URL (optional)');
  const utmSource   = extractTextField(fields, 'utm_source');
  const utmMedium   = extractTextField(fields, 'utm_medium');
  const utmCampaign = extractTextField(fields, 'utm_campaign');

  // ── Resolve UUID → text answer map (THE FIX)
  const answerMap = buildAnswerMap(fields);

  // ── Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── Load question bank
  type QRow = { question_id: string; domain: string; question: string; option: string; score: number };
  const { data: qBank, error: qErr } = await supabase
    .from('door9_ai_iq_questions')
    .select('question_id, domain, question, option, score');
  if (qErr || !qBank) {
    console.error('Question bank error:', qErr);
    return new Response(JSON.stringify({ error: 'Question bank unavailable' }), { status: 500 });
  }
  const qRows = qBank as QRow[];

  // ── Score per domain + collect individual responses
  const domainScores: Record<string, number> = {};
  const responseRows: {
    tally_submission_id: string;
    question_id: string;
    domain: string;
    question_label: string;
    selected_option: string;
    option_score: number;
  }[] = [];

  for (const domain of Object.keys(DOMAIN_WEIGHTS)) {
    const domainRows = qRows.filter(r => r.domain === domain);
    const questionIds = [...new Set(domainRows.map(r => r.question_id))];
    let domainRaw = 0;
    let questionCount = 0;

    for (const qid of questionIds) {
      const qRowsForQ = domainRows.filter(r => r.question_id === qid);
      const questionText = qRowsForQ[0]?.question ?? '';
      const selectedAnswer = answerMap[questionText];

      if (qid === 'AIQ2') {
        // Multi-checkbox: score by count of non-"None" selections
        const selected = Array.isArray(selectedAnswer)
          ? (selectedAnswer as string[]).filter(v => v !== 'None of the above')
          : [];
        const count = Math.min(selected.length, 5);
        const score = count >= 5 ? 20 : (AIQ2_SCORE_MAP[count] ?? 0);
        domainRaw += score;
        questionCount++;

        // Record each selected option
        for (const opt of selected) {
          responseRows.push({
            tally_submission_id: submissionId,
            question_id: qid,
            domain,
            question_label: questionText,
            selected_option: opt,
            option_score: Math.round(score / Math.max(selected.length, 1)),
          });
        }
      } else if (typeof selectedAnswer === 'string' && selectedAnswer) {
        // Single choice: match text → score
        const match = qRowsForQ.find(r => r.option === selectedAnswer);
        if (match) {
          domainRaw += match.score;
          questionCount++;
          responseRows.push({
            tally_submission_id: submissionId,
            question_id: qid,
            domain,
            question_label: questionText,
            selected_option: selectedAnswer,
            option_score: match.score,
          });
        } else {
          // Log mismatch for debugging
          console.warn(`Score miss — qid: ${qid}, answer: "${selectedAnswer}", options: ${qRowsForQ.map(r => r.option).join(' | ')}`);
        }
      }
    }

    const maxRaw = questionCount * 20;
    domainScores[domain] = maxRaw > 0
      ? Math.round((domainRaw / maxRaw) * 20 * 100) / 100
      : 0;
  }

  // ── Weighted total 0–100
  let weightedTotal = 0;
  for (const [domain, weight] of Object.entries(DOMAIN_WEIGHTS)) {
    weightedTotal += (domainScores[domain] ?? 0) * weight * 5;
  }
  const finalScore = Math.round(weightedTotal);

  // ── Band + rung
  const { label: aiIqBand, tier: anyDoorTier } = getScoreBand(finalScore);
  const nextRung = getRecommendedRung(finalScore);

  // ── Write to door9_submissions
  const { data: insertedSub } = await supabase
    .from('door9_submissions')
    .insert({
      tally_submission_id:             submissionId,
      full_name:                       fullName,
      business_name:                   bizName,
      email,
      website_url:                     website,
      utm_source:                      utmSource,
      utm_medium:                      utmMedium,
      utm_campaign:                    utmCampaign,
      score_deployment_depth:          domainScores['Deployment Depth'],
      score_integration_maturity:      domainScores['Integration Maturity'],
      score_revenue_alignment:         domainScores['Revenue Alignment'],
      score_automation_orchestration:  domainScores['Automation Orchestration'],
      score_oversight_awareness:       domainScores['Oversight Awareness'],
      ai_iq_score:                     finalScore,
      ai_iq_band:                      aiIqBand,
      recommended_tier:                anyDoorTier,
      recommended_rung:                nextRung.rung,
      recommended_rung_label:          nextRung.label,
      recommended_rung_price:          nextRung.price,
      recommended_rung_type:           nextRung.price_type,
      raw_payload:                     payload,
    })
    .select('id')
    .single();

  // ── Write individual responses to door9_responses
  if (responseRows.length > 0) {
    const rowsWithSubId = insertedSub?.id
      ? responseRows.map(r => ({ ...r, submission_id: insertedSub.id }))
      : responseRows;
    const { error: respErr } = await supabase
      .from('door9_responses')
      .insert(rowsWithSubId);
    if (respErr) console.error('Response rows insert error:', respErr);
  }

  // ── Upsert into layer5_prospects
  if (email) {
    await supabase.from('layer5_prospects').upsert({
      lead_name:        fullName || null,
      company:          bizName  || null,
      email,
      url:              website  || null,
      overall_score:    finalScore,
      recommended_tier: anyDoorTier,
      source:           'door9_ai_iq',
      notes:            `AI IQ Band: ${aiIqBand} | Recommended Rung: ${nextRung.rung} (${nextRung.label}) | UTM: ${utmSource}`,
      status:           'new',
      created_at:       new Date().toISOString(),
    }, { onConflict: 'email', ignoreDuplicates: false });
  }

  // ── Return full result
  return new Response(JSON.stringify({
    success:           true,
    submission_id:     submissionId,
    business_name:     bizName,
    email,
    ai_iq_score:       finalScore,
    ai_iq_band:        aiIqBand,
    any_door_tier:     anyDoorTier,
    rung_1_completed:  true,
    recommended_rung:  nextRung.rung,
    recommended_rung_label:       nextRung.label,
    recommended_rung_price:       nextRung.price,
    recommended_rung_format:      nextRung.format,
    recommended_rung_cta:         nextRung.cta,
    recommended_rung_cta_sub:     nextRung.cta_sub,
    recommended_rung_description: nextRung.description,
    hubai_offer: {
      label: 'Get HubAI Access',
      price: '$97/month',
      description: 'Your AI platform — white-labeled CRM, automation, and workflow tools.'
    },
    domain_scores: {
      deployment_depth:         domainScores['Deployment Depth'],
      integration_maturity:     domainScores['Integration Maturity'],
      revenue_alignment:        domainScores['Revenue Alignment'],
      automation_orchestration: domainScores['Automation Orchestration'],
      oversight_awareness:      domainScores['Oversight Awareness'],
    },
    responses_recorded: responseRows.length,
    debug_answer_map: Object.fromEntries(
      Object.entries(answerMap).map(([k, v]) => [k.slice(0, 60), v])
    ),
  }), {
    headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }
  });
});
