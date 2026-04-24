import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const DOMAIN_CONFIG = [
  { name: 'Deployment Depth', column: 'deployment_depth_score', weight: 12 },
  { name: 'Integration Maturity', column: 'integration_maturity_score', weight: 12 },
  { name: 'Revenue Alignment', column: 'revenue_alignment_score', weight: 15 },
  { name: 'Automation Orchestration', column: 'automation_orchestration_score', weight: 12 },
  { name: 'Oversight Awareness', column: 'oversight_awareness_score', weight: 8 },
  { name: 'Team & Human Readiness', column: 'team_human_readiness_score', weight: 12 },
  { name: 'Strategic Leadership', column: 'strategic_leadership_score', weight: 8 },
  { name: 'Data Foundation', column: 'data_foundation_score', weight: 8 },
  { name: 'Customer Intelligence', column: 'customer_intelligence_score', weight: 7 },
  { name: 'Investment Posture', column: 'investment_posture_score', weight: 6 },
] as const;

const TOTAL_WEIGHT = DOMAIN_CONFIG.reduce((sum, d) => sum + d.weight, 0);

const SCORE_BANDS = [
  { min: 0,  max: 20,  label: 'AI Absent',                  tier: 'Essentials' },
  { min: 21, max: 40,  label: 'Experimental',               tier: 'Essentials' },
  { min: 41, max: 60,  label: 'Emerging',                   tier: 'Momentum'   },
  { min: 61, max: 80,  label: 'Integrated',                 tier: 'Signature'  },
  { min: 81, max: 100, label: 'Intelligent Infrastructure', tier: 'Vanguard'   },
];

function getScoreBand(score: number) {
  return SCORE_BANDS.find(b => score >= b.min && score <= b.max)
    ?? { label: 'Experimental', tier: 'Essentials' };
}

function getRecommendedRung(score: number) {
  if (score <= 40) return 1;
  if (score <= 60) return 2;
  if (score <= 80) return 3;
  return 4;
}

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

function buildAnswerMap(
  fields: TallyField[]
): Record<string, string | string[]> {
  const map: Record<string, string | string[]> = {};

  for (const f of fields) {
    if (['INPUT_TEXT','INPUT_EMAIL','INPUT_LINK','HIDDEN_FIELDS'].includes(f.type)) continue;
    if (f.type === 'CHECKBOXES' && typeof f.value === 'boolean') continue;

    const options = (f.options ?? []) as TallyOption[];

    if (f.type === 'MULTIPLE_CHOICE') {
      const selectedIds = Array.isArray(f.value) ? (f.value as string[]) : [String(f.value ?? '')];
      const selectedId = selectedIds[0];
      const matched = options.find(o => o.id === selectedId);
      if (matched) map[f.label] = matched.text;
    } else if (f.type === 'CHECKBOXES') {
      const selectedIds = Array.isArray(f.value) ? (f.value as string[]) : [];
      const selectedTexts = selectedIds
        .map(id => options.find(o => o.id === id)?.text)
        .filter((t): t is string => Boolean(t));
      if (selectedTexts.length > 0) map[f.label] = selectedTexts;
    }
  }

  return map;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      },
    });
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'door4-score live' }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let payload: Record<string, unknown>;
  try { payload = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (payload.data ?? payload) as any;
  const fields: TallyField[] = data.fields ?? [];
  if ((payload.test === true || data.test === true) && fields.length === 0) {
    return new Response(JSON.stringify({
      error: 'Test payload acknowledged',
      message: 'door4-score is deployed and reachable',
      function: 'door4-score',
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const fullName    = extractTextField(fields, 'Full Name');
  const bizName     = extractTextField(fields, 'Business Name');
  const email       = extractTextField(fields, 'Business Email');
  const website     = extractTextField(fields, 'Website URL (optional)');
  const utmSource   = extractTextField(fields, 'utm_source');
  const utmMedium   = extractTextField(fields, 'utm_medium');
  const utmCampaign = extractTextField(fields, 'utm_campaign');

  const businessContext =
    payload.business_context ??
    data.business_context ??
    null;

  const answerMap = buildAnswerMap(fields);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  type QRow = { question_id: string; domain: string; question: string; option: string; score: number };
  const { data: qBank, error: qErr } = await supabase
    .from('door4_ai_iq_questions')
    .select('question_id, domain, question, option, score');
  if (qErr || !qBank) {
    console.error('Question bank error:', qErr);
    return new Response(JSON.stringify({ error: 'Question bank unavailable' }), { status: 500 });
  }
  const qRows = qBank as QRow[];

  const domainScores: Record<string, number> = {};
  const responseRows: {
    question_id: string;
    domain: string;
    selected_option: string;
    score: number;
  }[] = [];

  for (const domainConfig of DOMAIN_CONFIG) {
    const domain = domainConfig.name;
    const domainRows = qRows.filter(r => r.domain === domain);
    const questionIds = [...new Set(domainRows.map(r => r.question_id))];
    let domainRaw = 0;

    for (const qid of questionIds) {
      if (qid === 'AIQ22') continue;
      const qRowsForQ = domainRows.filter(r => r.question_id === qid);
      const questionText = qRowsForQ[0]?.question ?? '';
      const selectedAnswer = answerMap[questionText];

      if (Array.isArray(selectedAnswer)) {
        for (const opt of selectedAnswer) {
          const match = qRowsForQ.find(r => r.option === opt);
          if (!match) continue;
          domainRaw += match.score;
          responseRows.push({
            question_id: qid,
            domain,
            selected_option: opt,
            score: match.score,
          });
        }
      } else if (typeof selectedAnswer === 'string' && selectedAnswer) {
        const match = qRowsForQ.find(r => r.option === selectedAnswer);
        if (match) {
          domainRaw += match.score;
          responseRows.push({
            question_id: qid,
            domain,
            selected_option: selectedAnswer,
            score: match.score,
          });
        } else console.warn(`Score miss — qid: ${qid}, answer: "${selectedAnswer}"`);
      }
    }

    domainScores[domain] = domainRaw;
  }

  const orgContextQuestion = qRows.find(r => r.question_id === 'AIQ22')?.question ?? '';
  const orgContextRaw = answerMap[orgContextQuestion];
  const orgContext = typeof orgContextRaw === 'string'
    ? orgContextRaw
    : (Array.isArray(orgContextRaw) ? orgContextRaw.join(', ') : null);

  let aiIqScoreRaw = 0;
  let totalRawScore = 0;
  for (const domainConfig of DOMAIN_CONFIG) {
    const domain = domainConfig.name;
    const domainRows = qRows.filter(r => r.domain === domain && r.question_id !== 'AIQ22');
    const questionIds = [...new Set(domainRows.map(r => r.question_id))];
    const domainMaxPossible = questionIds.reduce((sum, qid) => {
      const qidRows = domainRows.filter(r => r.question_id === qid);
      const maxForQuestion = Math.max(...qidRows.map(r => r.score), 0);
      return sum + maxForQuestion;
    }, 0);
    const raw = domainScores[domain] ?? 0;
    totalRawScore += raw;
    if (domainMaxPossible > 0) {
      const normalized = Math.min(Math.max(raw / domainMaxPossible, 0), 1);
      aiIqScoreRaw += normalized * domainConfig.weight;
    }
  }
  const finalScore = Math.round((aiIqScoreRaw / TOTAL_WEIGHT) * 100);

  const { label: aiIqBand, tier: recommendedTier } = getScoreBand(finalScore);
  const recommendedRung = getRecommendedRung(finalScore);

  const { data: rungRow } = await supabase
    .from('ai_readiness_rungs')
    .select('rung_label, price_display, price_amount')
    .eq('rung_number', recommendedRung)
    .maybeSingle();

  const recommendedRungLabel = rungRow?.rung_label ?? null;
  /** DB column `recommended_rung_price` is numeric — use price_amount, not price_display text. */
  const recommendedRungPriceAmount =
    rungRow?.price_amount != null && rungRow.price_amount !== ''
      ? Number(rungRow.price_amount)
      : null;

  const { data: insertedSub, error: subErr } = await supabase
    .from('door4_submissions')
    .insert({
      door: '4',
      full_name: fullName,
      business_name: bizName,
      email,
      website_url: website,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      business_context: businessContext,
      deployment_depth_score:          domainScores['Deployment Depth'],
      integration_maturity_score:      domainScores['Integration Maturity'],
      revenue_alignment_score:         domainScores['Revenue Alignment'],
      automation_orchestration_score:  domainScores['Automation Orchestration'],
      oversight_awareness_score:       domainScores['Oversight Awareness'],
      team_human_readiness_score:      domainScores['Team & Human Readiness'],
      strategic_leadership_score:      domainScores['Strategic Leadership'],
      data_foundation_score:           domainScores['Data Foundation'],
      customer_intelligence_score:     domainScores['Customer Intelligence'],
      investment_posture_score:        domainScores['Investment Posture'],
      org_context:                     orgContext,
      total_score:                     totalRawScore,
      ai_iq_score:                     finalScore,
      ai_iq_band:                      aiIqBand,
      recommended_tier:                recommendedTier,
      recommended_rung:                recommendedRung,
      recommended_rung_label:          recommendedRungLabel,
      recommended_rung_price:          Number.isFinite(recommendedRungPriceAmount as number)
        ? recommendedRungPriceAmount
        : null,
      raw_payload:                     payload,
    })
    .select('id')
    .single();

  if (subErr || insertedSub?.id == null) {
    console.error('door4_submissions insert error:', subErr);
    return new Response(
      JSON.stringify({ error: 'Failed to save submission', detail: subErr?.message ?? 'unknown' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const submissionPk = insertedSub.id as number;
  let responsesInserted = 0;

  if (responseRows.length > 0) {
    const rowsForDb = responseRows.map((r) => ({
      submission_id: submissionPk,
      question_id: r.question_id,
      domain: r.domain,
      selected_option: r.selected_option,
      score: r.score,
    }));
    const { error: respErr } = await supabase
      .from('door4_responses')
      .insert(rowsForDb);
    if (respErr) {
      console.error('door4_responses insert error:', respErr);
      return new Response(
        JSON.stringify({
          error: 'Submission saved but response details failed',
          detail: respErr.message,
          submission_id: submissionPk,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
    responsesInserted = responseRows.length;
  }

  return new Response(JSON.stringify({
    success: true,
    submission_id: submissionPk,
    business_name: bizName,
    email,
    total_score: totalRawScore,
    ai_iq_score: finalScore,
    ai_iq_band: aiIqBand,
    rung_1_completed: true,
    recommended_rung: recommendedRung,
    recommended_rung_label: recommendedRungLabel,
    domain_scores: {
      deployment_depth:         domainScores['Deployment Depth'],
      integration_maturity:     domainScores['Integration Maturity'],
      revenue_alignment:        domainScores['Revenue Alignment'],
      automation_orchestration: domainScores['Automation Orchestration'],
      oversight_awareness:      domainScores['Oversight Awareness'],
      team_human_readiness:     domainScores['Team & Human Readiness'],
      strategic_leadership:     domainScores['Strategic Leadership'],
      data_foundation:          domainScores['Data Foundation'],
      customer_intelligence:    domainScores['Customer Intelligence'],
      investment_posture:       domainScores['Investment Posture'],
    },
    responses_recorded: responsesInserted,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    }
  });
});
