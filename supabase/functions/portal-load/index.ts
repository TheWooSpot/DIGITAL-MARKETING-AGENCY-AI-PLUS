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
    const token = url.searchParams.get('token')

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

    return new Response(JSON.stringify({
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
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
