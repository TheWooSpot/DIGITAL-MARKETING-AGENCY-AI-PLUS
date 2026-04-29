import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const briefToken = url.searchParams.get('brief_token')?.trim() || null

    let bodyToken: string | null = null
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (body && typeof body.token === 'string') {
          bodyToken = body.token.trim()
        }
      } catch (_) {
        // Keep backward compatibility: allow token through query even when body is empty/non-JSON.
      }
    }

    const token = url.searchParams.get('token')?.trim() || bodyToken

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing portal token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: prospect, error: prospectError } = await supabase
      .from('layer5_prospects')
      .select(`
        id, company, email, url, source,
        overall_score, notes, created_at,
        portal_token, portal_sent_at, portal_viewed_at
      `)
      .eq('portal_token', token)
      .single()

    if (prospectError || !prospect) {
      return new Response(JSON.stringify({ error: 'Portal not found', valid: false }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!prospect.portal_viewed_at) {
      await supabase
        .from('layer5_prospects')
        .update({ portal_viewed_at: new Date().toISOString() })
        .eq('portal_token', token)
    }

    let geoData: any = {};
    try {
      const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
      if (clientIP && clientIP !== '127.0.0.1') {
        const geoRes = await fetch(`https://ipapi.co/${clientIP}/json/`);
        if (geoRes.ok) geoData = await geoRes.json();
      }
    } catch (_) {}

    await supabase.from('portal_views').insert({
      portal_token: token,
      prospect_id: prospect.id,
      section: 'page_load',
      cta_clicked: 'none',
      user_agent: req.headers.get('user-agent') || '',
      country: geoData.country_name || null,
      region: geoData.region || null,
      city: geoData.city || null,
      isp: geoData.org || null,
    })

    const { data: faq } = await supabase
      .from('portal_faq')
      .select('id, category, question, answer, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    const { data: content } = await supabase
      .from('portal_content')
      .select('id, title, description, content_type, asset_url, thumbnail_url, tags, target_tiers, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    let roundtableSessionId: string | null = null
    let roundtableSessionExpiresAt: string | null = null
    let includeCalendar: boolean | null = null

    if (briefToken) {
      try {
        const { data: partnerBrief } = await supabase
          .from('partner_brief_tokens')
          .select('token')
          .eq('token', briefToken)
          .eq('is_active', true)
          .maybeSingle()

        if (partnerBrief?.token) {
          const { data: roundtablePartners } = await supabase
            .from('roundtable_partners')
            .select('session_id, roundtable_sessions!inner(id, status, created_at, expires_at, include_calendar)')
            .eq('brief_token', briefToken)
            .in('roundtable_sessions.status', ['open', 'lock_pending', 'locked'])
            .order('created_at', { ascending: false, foreignTable: 'roundtable_sessions' })
            .limit(1)

          if (roundtablePartners?.length) {
            const best = roundtablePartners[0] as {
              roundtable_sessions?: { id?: string; expires_at?: string | null; include_calendar?: boolean | null }
            }
            const session = best.roundtable_sessions
            if (session?.id) {
              roundtableSessionId = session.id
              roundtableSessionExpiresAt = session.expires_at ?? null
              includeCalendar = typeof session.include_calendar === 'boolean' ? session.include_calendar : null
            }
          }
        }
      } catch (_) {
        // Intentionally non-blocking for backward compatibility.
      }
    }

    const responseBody: Record<string, unknown> = {
      valid: true,
      prospect: {
        company: prospect.company,
        email: prospect.email,
        url: prospect.url,
        source: prospect.source,
        overall_score: prospect.overall_score,
        notes: prospect.notes,
        created_at: prospect.created_at,
        portal_viewed_at: prospect.portal_viewed_at,
      },
      faq: faq || [],
      content: content || [],
    }

    if (briefToken) {
      responseBody.roundtable_session_id = roundtableSessionId
      responseBody.roundtable_session_expires_at = roundtableSessionExpiresAt
      responseBody.include_calendar = includeCalendar
      responseBody.roundtable_active = Boolean(roundtableSessionId && includeCalendar === true)
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
