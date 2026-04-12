import { useEffect } from "react";

/** Spuds (Partner Brief) — ElevenLabs ConvAI agent id. Single source of truth (not env). */
const PARTNER_BRIEF_CONVAI_AGENT_ID = "agent_7101knt9k0rkehmsy89j1thxsqzn";

export default function PartnerBrief() {
  useEffect(() => {
    document.title = "Partner Brief — AI Readiness Labs";
    let cancelled = false;

    const fonts = document.createElement("link");
    fonts.id = "pb-fonts";
    fonts.rel = "stylesheet";
    fonts.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(fonts);

    const style = document.createElement("style");
    style.id = "pb-styles";
    style.textContent = PB_STYLES;
    document.head.appendChild(style);

    const s1 = document.createElement("script");
    s1.id = "pb-supabase";
    s1.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
    s1.onerror = () => console.error("Partner Brief: Supabase failed to load.");
    s1.onload = () => {
      if (cancelled) return;
      const sdk = document.createElement("script");
      sdk.id = "pb-11labs-client";
      sdk.src = "https://cdn.jsdelivr.net/npm/@elevenlabs/client@1.1.2/dist/lib.iife.js";
      sdk.onerror = () => console.error("Partner Brief: @elevenlabs/client failed to load.");
      sdk.onload = () => {
        if (cancelled) return;
        const init = document.createElement("script");
        init.id = "pb-init";
        init.textContent = PB_INIT;
        document.body.appendChild(init);

        const conv = document.createElement("script");
        conv.id = "pb-elevenlabs";
        conv.src = "https://elevenlabs.io/convai-widget/index.js";
        conv.async = true;
        document.body.appendChild(conv);
      };
      document.body.appendChild(sdk);
    };
    document.body.appendChild(s1);

    return () => {
      cancelled = true;
      ["pb-fonts", "pb-styles", "pb-supabase", "pb-11labs-client", "pb-init", "pb-elevenlabs", "pb-badge"].forEach((id) => {
        document.getElementById(id)?.remove();
      });
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: PB_BODY }} />;
}

// ─── STYLES ───────────────────────────────────────────────
const PB_STYLES = `
:root{--bg:#07090f;--bg2:#0c0f1a;--bg4:#080b12;--gold:#c9993a;--gold2:#e8b84b;--white:#f0f4ff;--text:#cdd3de;--muted:#6a7d9a;--dim:#3a4a60;--border:rgba(201,153,58,0.18);--border2:rgba(255,255,255,0.06);--green:#34c05a;--blue:#4a8fd4;}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;min-height:100vh;}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(201,153,58,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(201,153,58,0.04) 1px,transparent 1px);background-size:60px 60px;pointer-events:none;z-index:0;}
#pb-gate{position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;}
#pb-gate.hidden{display:none;}
.gate-logo{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:48px;}
.gate-title{font-family:'DM Serif Display',serif;font-size:clamp(38px,6vw,56px);color:var(--white);line-height:1.1;margin-bottom:12px;}
.gate-title em{color:var(--gold);font-style:normal;}
.gate-sub{font-size:16px;color:var(--muted);font-style:italic;font-family:'DM Serif Display',serif;margin-bottom:40px;max-width:400px;}
#pb-phrase{width:100%;max-width:400px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px 20px;font-family:'DM Sans',sans-serif;font-size:16px;color:var(--white);outline:none;margin-bottom:12px;letter-spacing:2px;}
#pb-phrase:focus{border-color:var(--gold);}
#pb-enter{width:100%;max-width:400px;background:var(--gold);border:none;border-radius:8px;padding:14px 20px;font-family:'DM Sans',sans-serif;font-size:16px;font-weight:600;color:#07090f;cursor:pointer;}
#pb-enter:hover{background:var(--gold2);}
#pb-err{color:#e04040;font-size:13px;margin-top:14px;min-height:20px;}
#pb-contact{font-size:12px;color:var(--dim);margin-top:24px;display:none;}
#pb-contact a{color:var(--gold);text-decoration:none;}
#pb-main{display:none;position:relative;z-index:1;}
#pb-badge{position:fixed;bottom:20px;right:20px;background:var(--bg2);border:1px solid var(--border);padding:6px 14px;font-size:11px;color:rgba(201,153,58,0.6);letter-spacing:1px;z-index:100;display:none;}
.gold-bar{height:3px;background:linear-gradient(90deg,var(--gold),var(--gold2),var(--gold));position:sticky;top:0;z-index:100;}
.wrap{max-width:820px;margin:0 auto;padding:0 28px 120px;}
.header{padding:72px 0 60px;border-bottom:1px solid var(--border2);margin-bottom:64px;}
.eyebrow{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:20px;font-weight:500;}
.headline{font-family:'DM Serif Display',serif;font-size:clamp(42px,7vw,62px);color:var(--white);line-height:1.08;margin-bottom:10px;}
.headline em{color:var(--gold);font-style:normal;}
.subhead{font-size:18px;color:var(--muted);font-style:italic;font-family:'DM Serif Display',serif;margin-bottom:32px;}
.hdr-meta{font-size:12px;color:var(--dim);letter-spacing:1.5px;text-transform:uppercase;}
.section{margin-bottom:72px;}
.sec-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;font-weight:500;}
h2{font-family:'DM Serif Display',serif;font-size:32px;color:var(--white);margin-bottom:16px;}
h3{font-size:18px;font-weight:600;color:var(--gold);margin-bottom:10px;}
.rule{border:none;border-top:1px solid var(--border2);margin:48px 0;}
.bt{font-size:16px;color:#9aabbd;line-height:1.85;margin-bottom:18px;font-family:'DM Serif Display',serif;font-style:italic;}
.bt strong{color:var(--white);font-style:normal;font-family:'DM Sans',sans-serif;font-weight:500;}
.note{font-size:15px;color:var(--muted);line-height:1.75;margin-bottom:16px;}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:28px 0;}
.stat-card{background:var(--bg2);border:1px solid var(--border2);border-top:2px solid var(--gold);padding:18px 16px;text-align:center;}
.stat-num{font-size:30px;font-weight:600;color:var(--gold);line-height:1;margin-bottom:6px;}
.stat-lbl{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;}
.rung-card{background:var(--bg2);border:1px solid var(--border2);position:relative;padding:32px 36px;margin-bottom:16px;overflow:hidden;}
.rung-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;}
.r1::before{background:#8a6fd4;}.r2::before{background:var(--blue);}.r3::before{background:var(--gold);}.r4::before{background:var(--green);}
.rung-number{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:6px;font-weight:500;}
.rung-name{font-family:'DM Serif Display',serif;font-size:26px;color:var(--white);margin-bottom:4px;}
.rung-tag{display:inline-block;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:1.5px;padding:3px 10px;border-radius:2px;margin-bottom:14px;}
.tp{background:rgba(138,111,212,0.15);color:#8a6fd4;border:1px solid rgba(138,111,212,0.3);}
.tb{background:rgba(74,143,212,0.15);color:var(--blue);border:1px solid rgba(74,143,212,0.3);}
.tg{background:rgba(201,153,58,0.12);color:var(--gold);border:1px solid rgba(201,153,58,0.3);}
.tn{background:rgba(52,192,90,0.12);color:var(--green);border:1px solid rgba(52,192,90,0.3);}
.rung-score{font-size:12px;color:var(--dim);margin-bottom:16px;}
.rung-score strong{color:var(--gold);}
.rung-desc{font-size:15px;color:#8a9bb5;line-height:1.75;margin-bottom:20px;}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px;}
.col-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:10px;font-weight:500;}
.cl{list-style:none;padding:0;}
.cl li{font-size:13px;color:#8a9bb5;padding:5px 0 5px 20px;border-bottom:1px solid var(--border2);position:relative;line-height:1.5;}
.cl li:last-child{border-bottom:none;}
.cl li::before{position:absolute;left:0;font-size:11px;top:7px;}
.cl li.ok::before{content:'✓';color:var(--green);}
.cl li.no::before{content:'○';color:var(--dim);}
.stbl{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;}
.stbl th{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--gold);text-align:left;padding:8px 10px;background:var(--bg4);border-bottom:1px solid rgba(201,153,58,0.25);}
.stbl td{padding:7px 10px;border-bottom:1px solid var(--border2);color:#8a9bb5;vertical-align:top;}
.stbl td:first-child{font-weight:600;color:var(--white);white-space:nowrap;}
.pgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:16px 0;}
.pc{background:var(--bg4);border:1px solid var(--border2);padding:16px;}
.pc.ft{border-color:var(--gold);}
.plbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:5px;}
.pamt{font-size:22px;font-weight:700;color:var(--white);margin-bottom:3px;}
.punt{font-size:12px;color:var(--dim);margin-bottom:8px;}
.pfeat{font-size:12px;color:#5a6d84;line-height:1.6;}
.ibox{background:var(--bg4);border:1px solid var(--border2);border-left:3px solid var(--gold);padding:20px 24px;margin:20px 0;}
.ibox p{font-size:14px;color:#6a7d95;line-height:1.7;}
.dtbl{width:100%;border-collapse:collapse;font-size:13px;margin:16px 0;}
.dtbl th{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--gold);text-align:left;padding:7px 10px;border-bottom:1px solid rgba(201,153,58,0.25);background:var(--bg4);}
.dtbl td{padding:7px 10px;border-bottom:1px solid var(--border2);color:#8a9bb5;}
.dtbl td:first-child{font-weight:600;color:var(--white);}
.dtbl td.gd{color:var(--gold);font-weight:700;}
.fc{background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--gold);padding:20px 24px;margin-bottom:12px;}
.fc-title{font-size:16px;font-weight:600;color:var(--white);margin-bottom:6px;}
.fc-body{font-size:14px;color:#7a8fa8;line-height:1.7;}
.wc{background:linear-gradient(135deg,rgba(201,153,58,0.06),rgba(74,143,212,0.04));border:1px solid var(--border);padding:36px 40px;margin:40px 0;position:relative;}
.wc::before{content:'"';position:absolute;top:-16px;left:28px;font-family:'DM Serif Display',serif;font-size:72px;color:var(--gold);line-height:1;opacity:0.45;}
.wt{font-family:'DM Serif Display',serif;font-size:20px;font-style:italic;color:#b0c0d4;line-height:1.7;margin-bottom:18px;}
.ws{font-size:12px;color:var(--dim);font-weight:500;text-transform:uppercase;letter-spacing:1.5px;}
.spuds-sec{margin:64px 0;text-align:center;padding:48px 0;border-top:1px solid var(--border2);border-bottom:1px solid var(--border2);}
.shint{font-size:13px;color:var(--dim);margin-top:16px;max-width:360px;margin-left:auto;margin-right:auto;line-height:1.6;}
.ag{list-style:none;margin:0 auto 32px;max-width:540px;text-align:left;}
.ag li{display:flex;gap:14px;padding:14px 0;border-bottom:1px solid var(--border2);}
.ag li:last-child{border-bottom:none;}
.ag-n{font-size:14px;font-weight:600;color:var(--gold);min-width:26px;margin-top:2px;}
.ag-t{font-size:15px;color:#8a9bb5;line-height:1.65;}
.ag-t strong{color:var(--white);font-weight:500;}
elevenlabs-convai {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}
/* Tap to Talk — same dimensions as /diagnostic; ElevenLabs ConvAI only. */
.pb-diag-voice-card{width:100%;margin-top:32px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:#07080d;padding:40px 24px;text-align:center;}
@media(min-width:640px){.pb-diag-voice-card{padding-left:40px;padding-right:40px;}}
.pb-diag-voice-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:0.35em;color:#c9973a;font-weight:500;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}
.pb-diag-voice-h3{margin-top:16px;font-family:'DM Serif Display',Georgia,serif;font-size:42px;font-weight:300;font-style:italic;line-height:1.15;color:#fff;}
.pb-diag-voice-desc{max-width:36rem;margin:16px auto 0;font-size:14px;line-height:1.65;color:rgba(255,255,255,0.55);}
.pb-diag-tt-btn,.ttt-btn{display:flex;margin:32px auto 0;width:140px;height:140px;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:50%;border:2px solid #c9973a;background:rgba(201,151,58,0.1);color:#c9973a;transition:background-color .15s,box-shadow .15s;cursor:pointer;padding:0;font:inherit;box-sizing:border-box;}
.pb-diag-tt-btn:hover:not(:disabled),.ttt-btn:hover:not(:disabled){background:rgba(201,151,58,0.2);}
.pb-diag-tt-btn:disabled,.ttt-btn:disabled{opacity:0.4;cursor:not-allowed;}
.pb-diag-tt-mic{height:36px;width:36px;flex-shrink:0;}
.pb-diag-tt-lbl{font-size:8px;font-weight:700;line-height:1.2;letter-spacing:0.2em;text-transform:uppercase;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}
.pb-diag-tt-btn.active,.ttt-btn.active{animation:none;box-shadow:0 0 0 2px rgba(201,151,58,0.6);}
#pb-ttt-status{margin-top:12px;min-height:1.25em;font-size:13px;color:var(--muted);}
.pb-footer{border-top:1px solid var(--border2);padding-top:28px;margin-top:80px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
.ft-b{font-size:12px;color:var(--dim);letter-spacing:1px;text-transform:uppercase;}
.ft-n{font-size:12px;color:var(--dim);}
@media(max-width:620px){.wrap{padding:0 20px 80px;}.two-col{grid-template-columns:1fr;}.pgrid{grid-template-columns:1fr 1fr;}.rung-card{padding:24px 20px;}}
`;

// ─── INIT SCRIPT ──────────────────────────────────────────
const PB_INIT = `
(function() {
  var ACCESS_PHRASE = 'PARTNER';
  var SUPA_URL = 'https://aagggflwhadxjjhcaohc.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZ2dnZmx3aGFkeGpqaGNhb2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NjIwMzMsImV4cCI6MjA4ODQzODAzM30.v4krDE31xAq9vt7Uq4eR2SmKvLLnkMk7MeGKT3SdGdA';
  var AGENT_ID = '${PARTNER_BRIEF_CONVAI_AGENT_ID}';

  window.pbPartnerFirstName = null;
  window._pbPartnerName = null;
  window._pbTokenBilling = null;

  window.pbStartCall = async function () {
    var btn = document.getElementById('pb-ttt-btn');
    var status = document.getElementById('pb-ttt-status');
    var lbl = document.getElementById('pb-ttt-lbl');

    /* End-call first so hang-up is never blocked by _pbCallLock. */
    if (window._pbConversation) {
      try {
        await window._pbConversation.endSession();
      } catch (e) {}
      window._pbConversation = null;
      if (btn) {
        btn.classList.remove('active');
        btn.style.pointerEvents = 'auto';
      }
      if (status) status.textContent = '';
      if (lbl) lbl.textContent = 'TAP TO TALK';
      return;
    }

    if (window._pbCallLock) return;
    window._pbCallLock = true;
    setTimeout(function () {
      window._pbCallLock = false;
    }, 3000);

    if (btn) btn.style.pointerEvents = 'none';

    if (btn) btn.classList.add('active');
    if (status) status.textContent = 'Requesting microphone...';
    if (lbl) lbl.textContent = 'CONNECTING...';

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      window._pbCallLock = false;
      if (btn) {
        btn.classList.remove('active');
        btn.style.pointerEvents = 'auto';
      }
      if (status) status.textContent = 'Microphone access is required to talk to Spuds.';
      if (lbl) lbl.textContent = 'TAP TO TALK';
      return;
    }

    if (status) status.textContent = 'Connecting to Spuds...';

    try {
      var dynamicVars = {};
      if (window._pbPartnerName) {
        dynamicVars.partner_name = window._pbPartnerName;
      }

      window._pbConversation = await ElevenLabsClient.Conversation.startSession({
        agentId: AGENT_ID,
        dynamicVariables: Object.keys(dynamicVars).length ? dynamicVars : undefined,
        onConnect: function () {
          var b = document.getElementById('pb-ttt-btn');
          if (b) b.style.pointerEvents = 'auto';
          var bill = window._pbTokenBilling;
          if (bill) {
            window._pbTokenBilling = null;
            bill.sb
              .from('partner_brief_tokens')
              .update({ call_count: bill.prevCount + 1 })
              .eq('id', bill.id)
              .then(function () {}, function () {});
          }
          if (status) status.textContent = '';
          if (lbl) lbl.textContent = 'END CALL';
        },
        onDisconnect: function () {
          window._pbConversation = null;
          var b2 = document.getElementById('pb-ttt-btn');
          if (b2) {
            b2.classList.remove('active');
            b2.style.pointerEvents = 'auto';
          }
          if (status) status.textContent = '';
          if (lbl) lbl.textContent = 'TAP TO TALK';
        },
        onError: function (err) {
          console.error('Spuds error:', err);
          window._pbConversation = null;
          var b3 = document.getElementById('pb-ttt-btn');
          if (b3) {
            b3.classList.remove('active');
            b3.style.pointerEvents = 'auto';
          }
          if (status) status.textContent = 'Could not connect — try again.';
          if (lbl) lbl.textContent = 'TAP TO TALK';
        }
      });
    } catch (e) {
      console.error('Spuds start failed:', e);
      window._pbCallLock = false;
      if (btn) {
        btn.classList.remove('active');
        btn.style.pointerEvents = 'auto';
      }
      if (status) status.textContent = 'Connection failed — try again.';
      if (lbl) lbl.textContent = 'TAP TO TALK';
    }
  };

  function showErr(msg) {
    var e = document.getElementById('pb-err');
    var c = document.getElementById('pb-contact');
    if (e) e.textContent = msg || '';
    if (c) c.style.display = msg ? 'block' : 'none';
  }

  function unlockContent(data) {
    var gate = document.getElementById('pb-gate');
    var main = document.getElementById('pb-main');
    if (gate) gate.classList.add('hidden');
    if (main) main.style.display = 'block';

    if (!data) {
      window._pbTokenBilling = null;
    }
    window.pbPartnerFirstName = data && data.partner_first_name ? data.partner_first_name : null;
    window._pbPartnerName = window.pbPartnerFirstName;

    if (data) {
      var r = Math.max(0, data.max_calls - data.call_count);
      var badge = document.getElementById('pb-badge');
      if (badge) {
        badge.textContent = r >= 9000 ? 'unlimited access' : r + ' conversation' + (r === 1 ? '' : 's') + ' remaining';
        badge.style.display = 'block';
      }
    }
  }

  async function validateToken(token) {
    try {
      var supaLib = window.supabase;
      if (!supaLib) {
        showErr('Loading… please try again in a second.');
        return;
      }
      var sb = supaLib.createClient(SUPA_URL, SUPA_KEY);
      var result = await sb.from('partner_brief_tokens')
        .select('id,call_count,max_calls,partner_name,partner_first_name,expires_at,is_active')
        .eq('token', token)
        .maybeSingle();

      var data = result.data;
      var error = result.error;

      if (error || !data) {
        showErr('That access link is not valid or has expired. Please contact the team.');
        return;
      }
      if (!data.is_active) {
        showErr('This access is no longer active.');
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        showErr('This access link has expired.');
        return;
      }
      if (data.call_count >= data.max_calls) {
        showErr('This access link has reached its usage limit. Please contact the team.');
        return;
      }
      unlockContent(data);
      window._pbTokenBilling = { sb: sb, id: data.id, prevCount: data.call_count };
    } catch (e) {
      console.error('Token validation error:', e);
      showErr('Could not verify this link. Try again.');
    }
  }

  window.pbCheckPhrase = function () {
    var input = document.getElementById('pb-phrase');
    if (!input) return;
    var val = input.value.trim().toUpperCase();
    if (val === ACCESS_PHRASE) {
      showErr('');
      var t = new URLSearchParams(window.location.search).get('token');
      var tok = t ? String(t).trim() : null;
      if (tok) {
        void validateToken(tok);
      } else {
        unlockContent(null);
      }
    } else {
      showErr("That phrase doesn't match. Try again or contact your Socialutely liaison.");
    }
  };

  var input = document.getElementById('pb-phrase');
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') window.pbCheckPhrase();
    });
  }
})();
`;

// ─── BODY HTML ────────────────────────────────────────────
const PB_BODY = `
<div id="pb-gate">
  <div class="gate-logo">Socialutely · Partner Brief</div>
  <div class="gate-title">AI Readiness<br/><em>Labs™</em></div>
  <div class="gate-sub">Enter the access phrase supplied by Socialutely to view this document.</div>
  <input type="password" id="pb-phrase" placeholder="Access phrase" autocomplete="off"/>
  <button id="pb-enter" type="button" onclick="window.pbCheckPhrase()">Enter</button>
  <div id="pb-err"></div>
  <div id="pb-contact">Questions? <a href="mailto:hello@socialutely.com">hello@socialutely.com</a></div>
</div>

<div id="pb-main">
<div class="gold-bar"></div>
<div id="pb-badge"></div>
<div class="wrap">

<div class="header">
  <div class="eyebrow">Partner Brief — AI Readiness Labs™ · Socialutely</div>
  <div class="headline">AI Readiness<br/><em>Labs™</em></div>
  <div class="subhead">Where we are. Where we're going. Where you come in.</div>
  <div class="hdr-meta">April 2026 · Build Update · For Project Partners</div>
</div>

<div class="section">
  <div class="sec-label">Context</div>
  <p class="bt">Something significant is being built here. <strong>AI Readiness Labs™</strong> is a structured four-rung pathway designed to take any organization — from AI-absent to AI-governed — through a diagnostic, educational, and implementation journey tailored exactly to where they arrive.</p>
  <p class="bt">The engine is live. Prospects are being scored. The infrastructure is deeper and further along than it may appear from the outside. And there is real work still ahead — in delivery, in content, in the human experience of each rung — <strong>where your perspective matters enormously.</strong></p>
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-num">4</div><div class="stat-lbl">Rungs Architected</div></div>
    <div class="stat-card"><div class="stat-num">103</div><div class="stat-lbl">Prospects Scored</div></div>
    <div class="stat-card"><div class="stat-num">~65%</div><div class="stat-lbl">Platform Built</div></div>
    <div class="stat-card"><div class="stat-num">3</div><div class="stat-lbl">Voice Agents Live</div></div>
  </div>
</div>

<hr class="rule"/>

<div class="section">
  <div class="sec-label">What AI Readiness Labs™ Is</div>
  <h2>A Four-Rung Journey From AI-Absent to AI-Governed</h2>
  <p class="note">AI Readiness Labs is a separately priced, deliverable service product — not a backend diagnostic system. A prospect takes the AI IQ™ assessment free and is placed into the rung that matches their score. What they purchase is the rung experience itself.</p>
  <div class="ibox">
    <h3>The Scoring Mathematics — AI IQ™</h3>
    <table class="dtbl">
      <thead><tr><th>Domain</th><th>Weight</th><th>What It Measures</th></tr></thead>
      <tbody>
        <tr><td>Revenue Alignment</td><td class="gd">25%</td><td>Does AI measurably drive revenue outcomes?</td></tr>
        <tr><td>Deployment Depth</td><td class="gd">20%</td><td>Breadth and depth of AI tools in active use</td></tr>
        <tr><td>Integration Maturity</td><td class="gd">20%</td><td>How connected and coordinated are AI systems?</td></tr>
        <tr><td>Automation Orchestration</td><td class="gd">20%</td><td>Complexity and chaining of automated workflows</td></tr>
        <tr><td>Oversight Awareness</td><td class="gd">15%</td><td>Governance literacy and risk management posture</td></tr>
      </tbody>
    </table>
    <p style="font-size:13px;color:var(--dim);margin-top:8px;">Score 0–40 → Rung 2 &nbsp;·&nbsp; Score 41–70 → Rung 3 &nbsp;·&nbsp; Score 71–100 → Rung 4</p>
  </div>
</div>

<hr class="rule"/>

<div class="section">
  <div class="sec-label">The Four Rungs</div>
  <h2>What's Been Built. What's Being Built.</h2>

  <div class="rung-card r1">
    <div class="rung-number">Rung 01 · Awareness</div>
    <div class="rung-name">AI IQ™ Diagnostic Assessment</div>
    <span class="rung-tag tp">Free Entry · Operational</span>
    <div class="rung-score">Scores 0–100 · Routes to Rung 2, 3, or 4 · <strong>103 businesses scored</strong></div>
    <div class="rung-desc">The free entry point. As a prospect answers questions across 5 AI domains, they begin to understand what AI maturity means for their specific business. By the time their score appears, they've already started thinking differently. Education and surprise in one moment — that's the conversion mechanism.</div>
    <div class="two-col">
      <div><div class="col-label">What's Built</div>
      <ul class="cl"><li class="ok">React component at /ai-iq · live on Vercel</li><li class="ok">Pre-gate: name + email + URL captured</li><li class="ok">One question per screen · frictionless UX</li><li class="ok">Rung routing logic active · 103 scored</li></ul></div>
      <div><div class="col-label">Still Needed</div>
      <ul class="cl"><li class="no">Results page — score reveal + Rung CTA</li><li class="no">Resend email trigger post-assessment</li><li class="no">3 Vercel env vars for routing URLs</li></ul></div>
    </div>
  </div>

  <div class="rung-card r2">
    <div class="rung-number">Rung 02 · Adaptation</div>
    <div class="rung-name">SkillSprint™ Academy</div>
    <span class="rung-tag tb">DIY Self-Guided · 15% Built</span>
    <div class="rung-score">Score range: <strong>0–40 · Absent / Experimental</strong> · 90-day program · $297 one-time</div>
    <div class="rung-desc">The promise is not theory — it's a live, operational AI workflow running in their business by day 90. Five modules. Fifteen sessions. Optional advisor upgrade at module 3 and exit.</div>
    <div class="two-col">
      <div><div class="col-label">5 Modules · 15 Sessions</div>
      <ul class="cl"><li class="ok">M1: AI Foundations &amp; Business Diagnosis</li><li class="ok">M2: Tool Selection &amp; Stack Design</li><li class="ok">M3: First Automation — Workflows That Work</li><li class="ok">M4: Customer-Facing AI Deployment</li><li class="ok">M5: Measure, Iterate &amp; Ascend</li></ul></div>
      <div><div class="col-label">What's Needed</div>
      <ul class="cl"><li class="no">SkillSprint™ LMS — delivery mechanism</li><li class="no">Module content: video + written + exercises</li><li class="no">What makes a self-guided learner finish?</li></ul></div>
    </div>
  </div>

  <div class="rung-card r3">
    <div class="rung-number">Rung 03 · Optimization</div>
    <div class="rung-name">AI Optimization Workshop</div>
    <span class="rung-tag tg">Done-With-You · 15% Built</span>
    <div class="rung-score">Score range: <strong>41–70 · Emerging / Integrated</strong> · 3–10 sessions · $897–$2,997</div>
    <div class="rung-desc">An advisor in the room, building live, holding the client accountable to a number. Rung 2 teaches adaptation. Rung 3 drives optimization for competitive advantage and measurable revenue impact.</div>
    <table class="stbl">
      <thead><tr><th>#</th><th>Session Title</th><th>Client Deliverable</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>AI Audit &amp; Gap Analysis</td><td>AI Optimization Roadmap</td></tr>
        <tr><td>2</td><td>Stack Architecture Review</td><td>Revised AI Stack + priority list</td></tr>
        <tr><td>3</td><td>First Workflow Build (LIVE)</td><td>1 automation built live in session</td></tr>
        <tr><td>4</td><td>Revenue Alignment Workshop</td><td>Revenue-AI map + 3 measurable KPIs</td></tr>
        <tr><td>5</td><td>Customer-Facing AI Build</td><td>1 live customer AI touchpoint</td></tr>
        <tr><td>6–10</td><td>Advanced integration + governance</td><td>Full stack wired · Rung 4 readiness</td></tr>
      </tbody>
    </table>
    <div class="pgrid">
      <div class="pc"><div class="plbl">Starter</div><div class="pamt">$897</div><div class="punt">3 sessions</div><div class="pfeat">Roadmap + 1 live automation</div></div>
      <div class="pc ft"><div class="plbl">Core</div><div class="pamt">$1,497</div><div class="punt">5 sessions</div><div class="pfeat">Full sprint · Revenue KPIs set</div></div>
      <div class="pc"><div class="plbl">Deep</div><div class="pamt">$1,997</div><div class="punt">7 sessions</div><div class="pfeat">CRM integration + advanced auto</div></div>
      <div class="pc"><div class="plbl">Full</div><div class="pamt">$2,997</div><div class="punt">10 sessions</div><div class="pfeat">Governance + Rung 4 readiness</div></div>
    </div>
  </div>

  <div class="rung-card r4">
    <div class="rung-number">Rung 04 · Stewardship</div>
    <div class="rung-name">AI Infrastructure Stewardship</div>
    <span class="rung-tag tn">Done-For-You · 15% Built</span>
    <div class="rung-score">Score range: <strong>71–100 · Intelligent Infrastructure</strong> · Discovery call · $1,500–$15,000/mo</div>
    <div class="rung-desc">A contractual partnership. Installation, maintenance, monitoring, and strategic guidance. Rung 4 routes to a discovery call — never a Stripe checkout. Priced by the client's AI footprint.</div>
    <div class="two-col">
      <div><div class="col-label">Stewardship Tiers</div>
      <ul class="cl"><li class="ok">Foundation: $1,500–$2,500/mo · 1–2 systems</li><li class="ok">Operations: $3,500–$5,500/mo · 3–5 systems</li><li class="ok">Enterprise: $7,500–$15,000/mo · 6+ systems</li></ul></div>
      <div><div class="col-label">Included at All Tiers</div>
      <ul class="cl"><li class="ok">Technical installation + maintenance</li><li class="ok">Monthly performance reports</li><li class="ok">Quarterly AI IQ™ re-assessment</li><li class="ok">Issue resolution + escalation handling</li></ul></div>
    </div>
  </div>
</div>

<hr class="rule"/>

<div class="section">
  <div class="sec-label">Where Your Eyes Are Needed</div>
  <h2>The Areas Open for Your Input</h2>
  <div class="fc"><div class="fc-title">Rung 2 — Course architecture and the self-guided learning experience</div><div class="fc-body">Five modules, fifteen sessions, ninety days. The question is whether it's compelling enough to keep someone moving — especially someone who just received a score that surprised them.</div></div>
  <div class="fc"><div class="fc-title">Rung 3 — Workshop format, session flow, and the advisor dynamic</div><div class="fc-body">Done-with-you. An advisor in the room, building live. What does a great session feel like? What's the right cadence and ratio of strategy to hands-on work?</div></div>
  <div class="fc"><div class="fc-title">Rung 4 — The scope and feel of a long-term managed AI relationship</div><div class="fc-body">Technical installation, maintenance, monitoring — ongoing. What would make a client renew without thinking twice?</div></div>
  <div class="fc"><div class="fc-title">Copy and content across all rungs</div><div class="fc-body">Session titles, outcome statements, enrollment language. The language that makes a cautious business owner say yes — that needs fresh eyes.</div></div>
</div>

<hr class="rule"/>

<div class="section">
  <div class="sec-label">Revenue Architecture</div>
  <h2>What a Client Journey Looks Like</h2>
  <div class="ibox"><h3>Client Lifetime Value — Example Path</h3><p>Rung 2 ($297) → Rung 3 seven-session workshop ($1,997) → Rung 4 Operations retainer ($4,500/mo) = <strong style="color:var(--gold)">$56,294 Year 1</strong> — before cross-sell.</p></div>
  <div class="ibox" style="border-left-color:#4a8fd4;"><h3>Conservative Revenue Projection</h3><p>50 assessments/month · 20% Rung 2 · 8% Rung 3 · 2% Rung 4 → <strong style="color:var(--gold)">~$12,470/month · ~$150K/year</strong>. Moderate (150/month) → ~$449K/year.</p></div>
</div>

<hr class="rule"/>

<div class="wc"><div class="wt">Everything you see here is genuinely open for review. If something feels off, say it. If a session sequence seems wrong, challenge it. Critical input from people who engage with this honestly is how this program becomes what it needs to be.</div><div class="ws">— The Build Team</div></div>

<hr class="rule"/>

<div class="spuds-sec">
  <ul class="ag">
    <li><div class="ag-n">01</div><div class="ag-t"><strong>What would make you enroll in Rung 2?</strong> As a business owner who just scored lower than expected — what would have to be true for you to say yes?</div></li>
    <li><div class="ag-n">02</div><div class="ag-t"><strong>What does a great Rung 3 session look like?</strong> An advisor with you for 90 minutes, building live — what makes that worth every dollar?</div></li>
    <li><div class="ag-n">03</div><div class="ag-t"><strong>What's the one friction point that stops someone cold?</strong> At any rung — pricing, trust, clarity. What needs solving before this goes to market?</div></li>
  </ul>
  <div class="pb-diag-voice-card">
    <p class="pb-diag-voice-eyebrow">Spuds · AI Readiness Labs Advisor</p>
    <h3 class="pb-diag-voice-h3">Talk to Spuds</h3>
    <p class="pb-diag-voice-desc">Spuds knows the Labs well enough to talk through any of the four rungs honestly. Ask questions, share concerns, push back. That's what he's here for.</p>
    <button type="button" id="pb-ttt-btn" class="pb-diag-tt-btn ttt-btn anydoor-tap-pulse" onclick="window.pbStartCall()" title="Start or end ElevenLabs ConvAI voice session with Spuds">
      <svg class="pb-diag-tt-mic" xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
      <span id="pb-ttt-lbl" class="pb-diag-tt-lbl">TAP TO TALK</span>
    </button>
    <p id="pb-ttt-status" class="pb-ttt-status"></p>
  </div>
</div>

<div class="pb-footer">
  <div class="ft-b">Socialutely · AI Readiness Labs™</div>
  <div class="ft-n">Partner Brief · April 2026 · Not for public distribution</div>
</div>

</div>
</div>
`;
