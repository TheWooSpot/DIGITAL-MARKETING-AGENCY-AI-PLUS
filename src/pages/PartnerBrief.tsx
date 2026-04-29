import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import RoundtableSection from "@/anydoor/components/RoundtableSection";
import { usePartnerBriefVapiCall } from "@/lib/usePartnerBriefVapiCall";
import { supabase } from "@/lib/supabase";

/** Partner Brief: RPC gate + Vapi Tap to Talk (same stack as /diagnostic). */

// ─── Mackleberry Voice Button ──────────────────────────────
function MackleberryVoiceButton() {
  const voice = usePartnerBriefVapiCall();

  const handleClick = useCallback(() => {
    if (voice.isCallActive) {
      voice.end();
    } else {
      voice.clearError();
      voice.start();
    }
  }, [voice]);

  const disabled = !voice.hasPublicKey || (!voice.isCallActive && voice.startLocked);
  const label = voice.isCallActive ? "END CALL" : voice.startLocked ? "CONNECTING..." : "TAP TO TALK";
  const activeClass = voice.isCallActive ? " active" : "";

  return (
    <div className="mackleberry-voice-frame">
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={`gold-ttt-btn${activeClass}`}
        aria-label={label}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
      <div className="mackleberry-voice-label">{label}</div>
      {voice.error && (
        <div className="mackleberry-voice-error">{voice.error}</div>
      )}
    </div>
  );
}

type PartnerValidateRow = {
  valid?: boolean;
  at_limit?: boolean;
  is_admin_token?: boolean;
  remaining_calls?: number | null;
  partner_name?: string | null;
  partner_first_name?: string | null;
};

function gateMessageForReason(reason: string | null): string {
  if (reason === "at_limit") {
    return "This access link has reached its usage limit. Please contact the team.";
  }
  if (reason === "no_grant_for_surface") {
    return "Access to this experience is not configured for your link yet. Please contact the team.";
  }
  if (reason === "token_expired" || reason === "token_inactive" || reason === "token_invalid") {
    return "This link is not active. Please contact the team for a current invitation.";
  }
  if (!reason || reason === "config") {
    return "We could not verify this link. Check your connection or contact hello@socialutely.com.";
  }
  return "This link is not active. Please contact the team for a current invitation.";
}

export default function PartnerBrief() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [gate, setGate] = useState<"loading" | "ready" | "denied">("loading");
  const [denyReason, setDenyReason] = useState<string | null>(null);
  const [briefRow, setBriefRow] = useState<PartnerValidateRow | null>(null);

  const [voiceMount, setVoiceMount] = useState<Element | null>(null);
  const [roundtableMount, setRoundtableMount] = useState<Element | null>(null);

  // Trap the browser back button so recipients stay on /partner-brief
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.title = "Partner Brief — AI Readiness Labs";

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

    return () => {
      document.getElementById("pb-fonts")?.remove();
      document.getElementById("pb-styles")?.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!supabase) {
      setGate("denied");
      setDenyReason("config");
      return;
    }
    if (!token) {
      setGate("denied");
      setDenyReason("token_invalid");
      return;
    }

    (async () => {
      const { data: proceedData, error: proceedErr } = await supabase.rpc("check_partner_token_can_proceed", {
        p_token: token,
        p_surface: "partner_brief_labs",
      });
      if (cancelled) return;
      if (proceedErr) {
        console.error("check_partner_token_can_proceed:", proceedErr);
        setGate("denied");
        setDenyReason("token_invalid");
        return;
      }
      const prow = (Array.isArray(proceedData) ? proceedData[0] : proceedData) as {
        can_proceed?: boolean;
        reason?: string | null;
      } | null;
      if (!prow || prow.can_proceed !== true) {
        setGate("denied");
        setDenyReason(typeof prow?.reason === "string" ? prow.reason : "token_invalid");
        return;
      }

      const { data: vData, error: vErr } = await supabase.rpc("validate_partner_token", { p_token: token });
      if (cancelled) return;
      if (vErr || !vData) {
        console.error("validate_partner_token:", vErr);
        setGate("denied");
        setDenyReason("token_invalid");
        return;
      }
      const vr = (Array.isArray(vData) ? vData[0] : vData) as PartnerValidateRow;
      if (!vr || vr.valid !== true) {
        setGate("denied");
        setDenyReason("token_invalid");
        return;
      }
      if (vr.at_limit === true && vr.is_admin_token !== true) {
        setGate("denied");
        setDenyReason("at_limit");
        return;
      }

      const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
      let rt = false;
      if (base) {
        try {
          const portalRes = await fetch(
            `${base}/functions/v1/portal-load?token=${encodeURIComponent(token)}&brief_token=${encodeURIComponent(token)}`,
          );
          if (portalRes.ok) {
            const portalJson = (await portalRes.json()) as { roundtable_active?: boolean };
            rt = portalJson.roundtable_active === true;
          }
        } catch {
          rt = false;
        }
      }

      const w = window as Record<string, unknown>;
      const pname = (vr.partner_name || vr.partner_first_name || "").trim();
      w._pbPartnerName = pname;
      w._pbPartnerFirstName = (vr.partner_first_name || "").trim();
      w._pbRoundtableActive = rt ? "true" : "false";

      setBriefRow(vr);
      setGate("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useLayoutEffect(() => {
    if (gate !== "ready") {
      setVoiceMount(null);
      setRoundtableMount(null);
      return;
    }
    setVoiceMount(document.getElementById("pb-voice-mount"));
    setRoundtableMount(document.getElementById("pb-roundtable-mount"));
  }, [gate]);

  useEffect(() => {
    if (gate !== "ready" || !briefRow) return;
    const badge = document.getElementById("pb-badge");
    if (!badge) return;
    const unlimited = briefRow.is_admin_token === true || briefRow.remaining_calls == null;
    if (unlimited) {
      badge.textContent = "unlimited access";
    } else {
      const rc = typeof briefRow.remaining_calls === "number" ? briefRow.remaining_calls : 0;
      badge.textContent = `${rc} conversation${rc === 1 ? "" : "s"} remaining`;
    }
    badge.style.display = "block";
  }, [gate, briefRow]);

  return (
    <>
      {gate === "loading" ? (
        <div className="pb-gate-shell">
          <div className="gate-logo">Socialutely · Partner Brief</div>
          <div className="gate-title">
            AI Readiness
            <br />
            <em>Labs™</em>
          </div>
          <p className="gate-sub">Verifying your link…</p>
        </div>
      ) : null}

      {gate === "denied" ? (
        <div className="pb-gate-shell">
          <div className="gate-logo">Socialutely · Partner Brief</div>
          <div className="gate-title">
            AI Readiness
            <br />
            <em>Labs™</em>
          </div>
          <p className="gate-sub pb-gate-msg">{gateMessageForReason(denyReason)}</p>
          <p className="pb-gate-contact">
            Questions? <a href="mailto:hello@socialutely.com">hello@socialutely.com</a>
          </p>
        </div>
      ) : null}

      {gate === "ready" ? (
        <div id="pb-main" className="partner-brief-page">
          <div dangerouslySetInnerHTML={{ __html: PB_MAIN_HTML }} />
          {voiceMount ? createPortal(<MackleberryVoiceButton />, voiceMount) : null}
          {roundtableMount ? createPortal(<RoundtableSection />, roundtableMount) : null}
        </div>
      ) : null}
    </>
  );
}

// ─── STYLES ───────────────────────────────────────────────
const PB_STYLES = `
:root{--bg:#07090f;--bg2:#0c0f1a;--bg4:#080b12;--gold:#c9993a;--gold2:#e8b84b;--white:#f0f4ff;--text:#d6deea;--muted:#9fb0c7;--dim:#7f92ac;--border:rgba(201,153,58,0.18);--border2:rgba(255,255,255,0.06);--green:#34c05a;--blue:#4a8fd4;}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#07090f;background-image:linear-gradient(rgba(201,153,58,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(201,153,58,0.07) 1px,transparent 1px);background-size:48px 48px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:16px;line-height:1.7;min-height:100vh;}
.pb-gate-shell{position:fixed;inset:0;background:#07090f;background-image:linear-gradient(rgba(201,153,58,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(201,153,58,0.07) 1px,transparent 1px);background-size:48px 48px;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;text-align:center;}
.pb-gate-shell>*{max-width:480px;width:100%;}
.gate-logo{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:48px;}
.gate-title{font-family:'DM Serif Display',serif;font-size:clamp(38px,6vw,56px);color:var(--white);line-height:1.1;margin-bottom:12px;}
.gate-title em{color:var(--gold);font-style:normal;}
.gate-sub{font-size:16px;color:var(--muted);font-style:italic;font-family:'DM Serif Display',serif;margin-bottom:40px;max-width:400px;}
.pb-gate-msg{color:var(--muted)!important;}
.pb-gate-contact{font-size:12px;color:var(--dim);margin-top:24px;}
.pb-gate-contact a{color:var(--gold);text-decoration:none;}
#pb-main{position:relative;z-index:1;display:block;}
#pb-badge{position:fixed;bottom:20px;right:20px;background:var(--bg2);border:1px solid var(--border);padding:6px 14px;font-size:11px;color:rgba(201,153,58,0.6);letter-spacing:1px;z-index:100;display:none;}
.gold-bar{height:3px;background:linear-gradient(90deg,var(--gold),var(--gold2),var(--gold));position:sticky;top:0;z-index:100;}
.wrap{max-width:820px;margin:0 auto;padding:0 28px 120px;}
.header{padding:72px 0 60px;border-bottom:1px solid var(--border2);margin-bottom:64px;}
.eyebrow{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:20px;font-weight:500;}
.headline{font-family:'DM Serif Display',serif;font-size:clamp(42px,7vw,62px);color:var(--white);line-height:1.08;margin-bottom:10px;}
.headline em{color:var(--gold);font-style:normal;}
.subhead{font-size:18px;color:var(--muted);font-style:italic;font-family:'DM Serif Display',serif;margin-bottom:32px;}
.hdr-meta{font-size:13px;color:var(--muted);letter-spacing:1.2px;text-transform:uppercase;}
.section{margin-bottom:72px;}
.sec-label{font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;font-weight:500;}
h2{font-family:'DM Serif Display',serif;font-size:32px;color:var(--white);margin-bottom:16px;}
h3{font-size:18px;font-weight:600;color:var(--gold);margin-bottom:10px;}
.rule{border:none;border-top:1px solid var(--border2);margin:48px 0;}
.bt{font-size:16px;color:#9aabbd;line-height:1.85;margin-bottom:18px;font-family:'DM Serif Display',serif;font-style:italic;}
.bt strong{color:var(--white);font-style:normal;font-family:'DM Sans',sans-serif;font-weight:500;}
.note{font-size:16px;color:var(--muted);line-height:1.78;margin-bottom:16px;}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:28px 0;}
.stat-card{background:var(--bg2);border:1px solid var(--border2);border-top:2px solid var(--gold);padding:18px 16px;text-align:center;}
.stat-num{font-size:30px;font-weight:600;color:var(--gold);line-height:1;margin-bottom:6px;}
.stat-lbl{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;}
.rung-card{background:var(--bg2);border:1px solid var(--border2);position:relative;padding:32px 36px;margin-bottom:16px;overflow:hidden;}
.rung-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;}
.r1::before{background:#8a6fd4;}.r2::before{background:var(--blue);}.r3::before{background:var(--gold);}.r4::before{background:var(--green);}
.rung-number{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted);margin-bottom:6px;font-weight:500;}
.rung-name{font-family:'DM Serif Display',serif;font-size:26px;color:var(--white);margin-bottom:4px;}
.rung-tag{display:inline-block;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:1.2px;padding:3px 10px;border-radius:2px;margin-bottom:14px;}
.tp{background:rgba(138,111,212,0.15);color:#8a6fd4;border:1px solid rgba(138,111,212,0.3);}
.tb{background:rgba(74,143,212,0.15);color:var(--blue);border:1px solid rgba(74,143,212,0.3);}
.tg{background:rgba(201,153,58,0.12);color:var(--gold);border:1px solid rgba(201,153,58,0.3);}
.tn{background:rgba(52,192,90,0.12);color:var(--green);border:1px solid rgba(52,192,90,0.3);}
.rung-score{font-size:14px;color:var(--muted);margin-bottom:16px;}
.rung-score strong{color:var(--gold);}
.rung-desc{font-size:16px;color:#9eb0c8;line-height:1.8;margin-bottom:20px;}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px;}
.col-label{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--gold);margin-bottom:10px;font-weight:500;}
.cl{list-style:none;padding:0;}
.cl li{font-size:14px;color:#9eb0c8;padding:6px 0 6px 20px;border-bottom:1px solid var(--border2);position:relative;line-height:1.58;}
.cl li:last-child{border-bottom:none;}
.cl li::before{position:absolute;left:0;font-size:11px;top:7px;}
.cl li.ok::before{content:'✓';color:var(--green);}
.cl li.no::before{content:'○';color:var(--dim);}
.stbl{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;}
.stbl th{font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:var(--gold);text-align:left;padding:8px 10px;background:var(--bg4);border-bottom:1px solid rgba(201,153,58,0.25);}
.stbl td{padding:8px 10px;border-bottom:1px solid var(--border2);color:#9eb0c8;vertical-align:top;}
.stbl td:first-child{font-weight:600;color:var(--white);white-space:nowrap;}
.pgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:16px 0;}
.pc{background:var(--bg4);border:1px solid var(--border2);padding:16px;}
.pc.ft{border-color:var(--gold);}
.plbl{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--gold);margin-bottom:5px;}
.pamt{font-size:22px;font-weight:700;color:var(--white);margin-bottom:3px;}
.punt{font-size:13px;color:var(--muted);margin-bottom:8px;}
.pfeat{font-size:13px;color:#8ea3be;line-height:1.65;}
.ibox{background:var(--bg4);border:1px solid var(--border2);border-left:3px solid var(--gold);padding:20px 24px;margin:20px 0;}
.ibox p{font-size:15px;color:#91a5bf;line-height:1.75;}
.dtbl{width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;}
.dtbl th{font-size:11px;text-transform:uppercase;letter-spacing:0.9px;color:var(--gold);text-align:left;padding:7px 10px;border-bottom:1px solid rgba(201,153,58,0.25);background:var(--bg4);}
.dtbl td{padding:8px 10px;border-bottom:1px solid var(--border2);color:#9eb0c8;}
.dtbl td:first-child{font-weight:600;color:var(--white);}
.dtbl td.gd{color:var(--gold);font-weight:700;}
.fc{background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--gold);padding:20px 24px;margin-bottom:12px;}
.fc-title{font-size:16px;font-weight:600;color:var(--white);margin-bottom:6px;}
.fc-body{font-size:15px;color:#97aac3;line-height:1.75;}
.wc{background:linear-gradient(135deg,rgba(201,153,58,0.06),rgba(74,143,212,0.04));border:1px solid var(--border);padding:36px 40px;margin:40px 0;position:relative;}
.wc::before{content:'"';position:absolute;top:-16px;left:28px;font-family:'DM Serif Display',serif;font-size:72px;color:var(--gold);line-height:1;opacity:0.45;}
.wt{font-family:'DM Serif Display',serif;font-size:21px;font-style:italic;color:#c0cee0;line-height:1.72;margin-bottom:18px;}
.ws{font-size:12px;color:var(--dim);font-weight:500;text-transform:uppercase;letter-spacing:1.5px;}
.mackleberry-sec{margin:64px 0;text-align:center;padding:48px 0;border-top:1px solid var(--border2);border-bottom:1px solid var(--border2);}
.shint{font-size:14px;color:var(--muted);margin-top:16px;max-width:360px;margin-left:auto;margin-right:auto;line-height:1.65;}
.ag{list-style:none;margin:0 auto 32px;max-width:540px;text-align:left;}
.ag li{display:flex;gap:14px;padding:14px 0;border-bottom:1px solid var(--border2);}
.ag li:last-child{border-bottom:none;}
.ag-n{font-size:14px;font-weight:600;color:var(--gold);min-width:26px;margin-top:2px;}
.ag-t{font-size:16px;color:#9eb0c8;line-height:1.7;}
.ag-t strong{color:var(--white);font-weight:500;}
.pb-footer{border-top:1px solid var(--border2);padding-top:28px;margin-top:80px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
.ft-b{font-size:13px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;}
.ft-n{font-size:13px;color:var(--muted);}
@media(max-width:620px){.wrap{padding:0 20px 80px;}.two-col{grid-template-columns:1fr;}.pgrid{grid-template-columns:1fr 1fr;}.rung-card{padding:24px 20px;}}
/* ── Mackleberry Vapi Tap to Talk ────────────────────────────────────────
   React portal mounts MackleberryVoiceButton into #pb-voice-mount after gate
   passes. Uses @vapi-ai/web — same stack as /diagnostic. */
.mackleberry-voice-frame{display:flex;flex-direction:column;align-items:center;margin:32px auto;gap:14px;}
.gold-ttt-btn{width:140px;height:140px;border-radius:50%;background:transparent;border:2px solid #c9993a;color:#c9993a;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s,box-shadow 0.2s;animation:mackleberry-pulse 2.5s ease-in-out infinite;}
.gold-ttt-btn:hover:not(:disabled){background:rgba(201,153,58,0.08);}
.gold-ttt-btn:disabled{opacity:0.5;cursor:not-allowed;animation:none;}
.gold-ttt-btn.active{background:rgba(201,153,58,0.12);animation:none;box-shadow:0 0 0 8px rgba(201,153,58,0.08),0 0 0 18px rgba(201,153,58,0.04);}
@keyframes mackleberry-pulse{0%{box-shadow:0 0 0 0 rgba(201,153,58,0.4);}70%{box-shadow:0 0 0 16px rgba(201,153,58,0);}100%{box-shadow:0 0 0 0 rgba(201,153,58,0);}}
.mackleberry-voice-label{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#c9993a;font-family:'DM Sans',sans-serif;}
.mackleberry-voice-error{font-size:13px;color:#e04040;margin-top:4px;max-width:320px;text-align:center;line-height:1.5;}
`;

// ─── Brief HTML (injected under #pb-main; token gate is React + RPC) ───
const PB_MAIN_HTML = `
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
    <p style="font-size:13px;color:var(--dim);margin-bottom:14px;font-style:italic;">Domain structure and exact weightings are still being refined. What's shown below is what we know we're measuring.</p>
    <table class="dtbl">
      <thead><tr><th>Core Domain · all prospects</th><th>What It Measures</th></tr></thead>
      <tbody>
        <tr><td>Deployment Depth</td><td>How embedded AI is in daily work and customer experience</td></tr>
        <tr><td>Integration Maturity</td><td>How well AI connects to CRM, operations, data, workflows</td></tr>
        <tr><td>Revenue Alignment</td><td>Whether AI is moving real business outcomes and KPIs</td></tr>
        <tr><td>Automation Orchestration</td><td>How much runs without manual triggers · end-to-end chaining</td></tr>
        <tr><td>Oversight Awareness</td><td>AI-use policies, human review, incident response</td></tr>
        <tr><td>Team &amp; Human Readiness</td><td>Team competency and structural investment in AI skills</td></tr>
        <tr><td>Strategic Leadership</td><td>Clear POV on AI · deliberate adoption · compelling narrative</td></tr>
        <tr><td>Organizational Context</td><td>Unscored · captures org size (solo, small, mid, large)</td></tr>
      </tbody>
    </table>
    <table class="dtbl" style="margin-top:12px;">
      <thead><tr><th>Additional Domain · scorers 61+ only</th><th>What It Measures</th></tr></thead>
      <tbody>
        <tr><td>Data Foundation</td><td>Whether underlying data is accessible, clean, and trustworthy</td></tr>
        <tr><td>Customer Intelligence</td><td>Clarity on ideal customer's actual decision triggers</td></tr>
        <tr><td>Investment Posture</td><td>Budget capacity and decision velocity for AI initiatives</td></tr>
      </tbody>
    </table>
    <p style="font-size:13px;color:var(--dim);margin-top:12px;">Score 0–40 → Rung 2 &nbsp;·&nbsp; Score 41–70 → Rung 3 &nbsp;·&nbsp; Score 71–100 → Rung 4</p>
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
    <span class="rung-tag tb">Self-Paced · 15% Built</span>
    <div class="rung-score">Score range: <strong>0–40 · Absent / Experimental</strong> · 90-day self-paced · <strong>$297–$497</strong> <em style="color:var(--dim);font-style:normal;">(TBD · one-time or monthly)</em></div>
    <div class="rung-desc">The promise is not theory — it's a live, operational AI workflow running in their business by day 90. Five modules, self-paced. Three package options: base course, base + one live onboarding session, or base + three check-ins at 30/60/90 days.</div>
    <div class="two-col">
      <div><div class="col-label">5 Modules · 90 Days</div>
      <ul class="cl"><li class="ok">M1: AI Activation Baseline</li><li class="ok">M2: Your First Automated Workflow</li><li class="ok">M3: Connecting AI to Your Systems</li><li class="ok">M4: Revenue Alignment</li><li class="ok">M5: Review, Measure, Sustain</li></ul></div>
      <div><div class="col-label">What's Needed</div>
      <ul class="cl"><li class="no">SkillSprint™ LMS — delivery mechanism</li><li class="no">Module content: video + written + exercises</li><li class="no">What makes a self-guided learner finish?</li></ul></div>
    </div>
  </div>

  <div class="rung-card r3">
    <div class="rung-number">Rung 03 · Optimization</div>
    <div class="rung-name">AI Optimization Workshop</div>
    <span class="rung-tag tg">Done-With-You · 15% Built</span>
    <div class="rung-score">Score range: <strong>41–70 · Emerging / Integrated</strong> · 3–10 sessions · <em style="color:var(--dim);font-style:normal;">pricing TBD</em></div>
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
      <div class="pc"><div class="plbl">Starter 3</div><div class="pamt" style="font-size:18px;">TBD</div><div class="punt">3 sessions</div><div class="pfeat">One focused use case</div></div>
      <div class="pc ft"><div class="plbl">Core 5</div><div class="pamt" style="font-size:18px;">TBD</div><div class="punt">5 sessions · recommended</div><div class="pfeat">2–3 workflows · full sprint</div></div>
      <div class="pc"><div class="plbl">Growth 7</div><div class="pamt" style="font-size:18px;">TBD</div><div class="punt">7 sessions</div><div class="pfeat">Full revenue alignment sprint</div></div>
      <div class="pc"><div class="plbl">Intensive 10</div><div class="pamt" style="font-size:18px;">TBD</div><div class="punt">10 sessions</div><div class="pfeat">Multi-team · complex integration</div></div>
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
  <div class="ibox"><h3>Client Lifetime Value — Example Path</h3><p>Rung 2 → Rung 3 seven-session workshop (Growth 7) → Rung 4 Operations retainer ($3,500–$5,500/mo). <em style="color:var(--dim);">Rung 2 and Rung 3 pricing still being finalized — example total intentionally omitted until pricing locks.</em></p></div>
  <div class="ibox" style="border-left-color:#4a8fd4;"><h3>Conservative Revenue Projection</h3><p>50 assessments/month · 20% Rung 2 · 8% Rung 3 · 2% Rung 4 → <strong style="color:var(--gold)">~$12,470/month · ~$150K/year</strong>. Moderate (150/month) → ~$449K/year.</p></div>
</div>

<hr class="rule"/>

<div class="wc"><div class="wt">Everything you see here is genuinely open for review. If something feels off, say it. If a session sequence seems wrong, challenge it. Critical input from people who engage with this honestly is how this program becomes what it needs to be.</div><div class="ws">— The Build Team</div></div>

<hr class="rule"/>

<div class="mackleberry-sec">
  <span class="slbl">MR. MACKLEBERRY · AI READINESS LABS ADVISOR</span>
  <div class="stitle">Talk to Mr. Mackleberry</div>
  <div class="ssub">Mr. Mackleberry knows the Labs well enough to talk through any of the four rungs honestly. Ask questions, share concerns, push back. That's what he's here for.</div>
  <ul class="ag">
    <li><div class="ag-n">01</div><div class="ag-t"><strong>What would make you enroll in Rung 2?</strong> As a business owner who just scored lower than expected — what would have to be true for you to say yes?</div></li>
    <li><div class="ag-n">02</div><div class="ag-t"><strong>What does a great Rung 3 session look like?</strong> An advisor with you for 90 minutes, building live — what makes that worth every dollar?</div></li>
    <li><div class="ag-n">03</div><div class="ag-t"><strong>What's the one friction point that stops someone cold?</strong> At any rung — pricing, trust, clarity. What needs solving before this goes to market?</div></li>
  </ul>
  <div id="pb-voice-mount"></div>
</div>

<div id="pb-roundtable-mount"></div>

<div class="pb-footer">
  <div class="ft-b">Socialutely · AI Readiness Labs™</div>
  <div class="ft-n">Partner Brief · April 2026 · Not for public distribution</div>
</div>

</div>
`;
