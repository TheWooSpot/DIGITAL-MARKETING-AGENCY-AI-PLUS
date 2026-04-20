import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const EDGE_URL = "https://aagggflwhadxjjhcaohc.supabase.co/functions/v1/portal-load";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZ2dnZmx3aGFkeGpqaGNhb2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NjIwMzMsImV4cCI6MjA4ODQzODAzM30.v4krDE31xAq9vt7Uq4eR2SmKvLLnkMk7MeGKT3SdGdA";

const TIER_MAP = {
  ranges: [
    { max: 20,  label: "Essentials",  color: "#6b7280" },
    { max: 40,  label: "Momentum",    color: "#3b82f6" },
    { max: 60,  label: "Signature",   color: "#8b5cf6" },
    { max: 80,  label: "Vanguard",    color: "#c9993a" },
    { max: 100, label: "Sovereign",   color: "#e5c97e" },
  ],
};

function getTier(score) {
  const s = parseInt(score) || 0;
  return TIER_MAP.ranges.find((r) => s <= r.max) || TIER_MAP.ranges[4];
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, parseInt(score) || 0));
  const tier = getTier(pct);
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Overall Diagnostic Score
        </span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: tier.color, fontWeight: 700 }}>
          {pct} / 100
        </span>
      </div>
      <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${tier.color}99, ${tier.color})`,
          borderRadius: 99, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)"
        }} />
      </div>
    </div>
  );
}

function TierBadge({ score }) {
  const tier = getTier(score);
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: `${tier.color}18`, border: `1px solid ${tier.color}55`,
      borderRadius: 99, padding: "6px 16px"
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: tier.color }} />
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: tier.color, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
        {tier.label} Tier
      </span>
    </div>
  );
}

function GapFlag({ label }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
      borderRadius: 6, padding: "4px 12px", margin: "4px"
    }}>
      <span style={{ color: "#ef4444", fontSize: 10 }}>⚠</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#fca5a5", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </div>
  );
}

function parseGapFlags(notes) {
  if (!notes) return [];
  const flagPatterns = [
    /no\s+[\w\s]+(presence|listings?|reviews?|seo|ads?|automation|crm|chat|voice|sms)/gi,
    /missing[\w\s]+/gi,
    /weak[\w\s]+/gi,
    /low[\w\s]+(score|rating|visibility|engagement)/gi,
  ];
  const flags = [];
  flagPatterns.forEach((p) => {
    const matches = notes.match(p) || [];
    matches.forEach((m) => flags.push(m.trim().slice(0, 48)));
  });
  return [...new Set(flags)].slice(0, 6);
}

function LoadingState() {
  return (
    <div style={{ minHeight: "100vh", background: "#07090f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: "2px solid #c9993a33", borderTop: "2px solid #c9993a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 24px" }} />
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#6b7280", letterSpacing: "0.1em" }}>
          LOADING YOUR DIAGNOSTIC
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div style={{ minHeight: "100vh", background: "#07090f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
        <h2 style={{ color: "#f9fafb", fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 12 }}>Portal Not Found</h2>
        <p style={{ color: "#6b7280", fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.7 }}>
          {message || "This diagnostic link may have expired or is invalid. Contact your Socialutely account team for a new link."}
        </p>
        <a href="https://socialutely-any-door-engine.vercel.app" style={{ display: "inline-block", marginTop: 24, color: "#c9993a", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textDecoration: "none" }}>
          ← RETURN TO SOCIALUTELY
        </a>
      </div>
    </div>
  );
}

export default function PortalPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) { setError("No token provided"); setLoading(false); return; }
    fetch(`${EDGE_URL}?token=${token}`, {
        headers: { Authorization: `Bearer ${ANON_KEY}` },
      })
      .then((r) => r.json())
      .then((json) => {
        if (!json.valid) throw new Error(json.error || "Invalid portal");
        setData(json);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error} />;

  const { prospect, faq, content } = data;
  const displayName = prospect.company || prospect.url?.replace(/^https?:\/\//, "") || "Your Business";
  const score = parseInt(prospect.overall_score) || 0;
  const tier = getTier(score);
  const gaps = parseGapFlags(prospect.notes);
  const diagDate = prospect.created_at ? new Date(prospect.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";

  // Group FAQ by category
  const faqByCategory = faq.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const styles = {
    page:       { minHeight: "100vh", background: "#07090f", color: "#f9fafb", fontFamily: "Georgia, serif", backgroundImage: "linear-gradient(rgba(201,153,58,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,153,58,0.04) 1px, transparent 1px)", backgroundSize: "48px 48px" },
    container:  { maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" },
    // Header
    header:     { borderBottom: "1px solid rgba(201,153,58,0.15)", padding: "20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" },
    brand:      { fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: 700, color: "#c9993a", letterSpacing: "0.15em", textTransform: "uppercase" },
    headerMeta: { fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#6b7280", letterSpacing: "0.08em" },
    // Section
    section:    { marginTop: 56 },
    sectionLabel: { fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#c9993a", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 20, paddingBottom: 8, borderBottom: "1px solid rgba(201,153,58,0.15)" },
    // Cards
    card:       { background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "28px 32px", marginBottom: 16 },
    goldCard:   { background: "linear-gradient(135deg, #0d1117, #111827)", border: "1px solid rgba(201,153,58,0.25)", borderRadius: 12, padding: "32px", marginBottom: 16 },
    // FAQ
    faqItem:    { borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "16px 0" },
    faqQ:       { color: "#f9fafb", fontSize: 14, fontWeight: 600, marginBottom: 8, lineHeight: 1.5 },
    faqA:       { color: "#9ca3af", fontSize: 13, lineHeight: 1.75 },
    catLabel:   { fontFamily: "Arial, sans-serif", fontSize: 11, fontWeight: 700, color: "#c9993a", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, marginTop: 32 },
  };

  return (
    <div style={styles.page}>
      {/* ── HEADER ── */}
      <div style={{ ...styles.container }}>
        <div style={styles.header}>
          <span style={styles.brand}>Socialutely</span>
          <span style={styles.headerMeta}>DIAGNOSTIC PORTAL · CONFIDENTIAL</span>
        </div>

        {/* ══ SECTION 1 — HERO ══ */}
        <div style={styles.section}>
          <div style={styles.goldCard}>
            <div style={{ marginBottom: 20 }}>
              <TierBadge score={score} />
              {prospect.source && (
                <span style={{ marginLeft: 10, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#6b7280", letterSpacing: "0.08em" }}>
                  via {prospect.source}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 400, color: "#f9fafb", lineHeight: 1.25, marginBottom: 10, fontFamily: "Georgia, serif" }}>
              Your Digital Diagnostic
            </h1>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#c9993a", marginBottom: 16, fontFamily: "Georgia, serif" }}>
              {displayName}
            </h2>
            {prospect.url && (
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#6b7280", marginBottom: 24, letterSpacing: "0.06em" }}>
                {prospect.url}
              </p>
            )}
            <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.75, maxWidth: 560, marginBottom: 28 }}>
              Below is your personalized diagnostic report — built from a live analysis of your digital presence. Review your scores, explore recommended services, and use this portal as your strategic reference.
            </p>
            {diagDate && (
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#4b5563", letterSpacing: "0.08em" }}>
                DIAGNOSTIC DATE — {diagDate}
              </p>
            )}
          </div>
        </div>

        {/* ══ SECTION 2 — DIAGNOSTIC ══ */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Diagnostic Results</div>
          <div style={styles.card}>
            <ScoreBar score={score} />

            {/* Tier context */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "16px 20px" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 6 }}>DIAGNOSTIC TIER</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: tier.color }}>{tier.label}</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "16px 20px" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 6 }}>COMPOSITE SCORE</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#f9fafb" }}>{score}<span style={{ fontSize: 12, color: "#6b7280", fontWeight: 400 }}> / 100</span></p>
              </div>
            </div>

            {/* Score tier ladder */}
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 12 }}>MATURITY SCALE</p>
              <div style={{ display: "flex", gap: 4 }}>
                {TIER_MAP.ranges.map((t) => (
                  <div key={t.label} style={{
                    flex: 1, height: 6, borderRadius: 3,
                    background: tier.label === t.label ? t.color : `${t.color}30`,
                    transition: "background 0.3s"
                  }} title={t.label} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                {TIER_MAP.ranges.map((t) => (
                  <span key={t.label} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: tier.label === t.label ? t.color : "#374151", letterSpacing: "0.06em" }}>
                    {t.label.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            {/* Domain score grid */}
            {prospect.notes && (() => {
              const domains = [
                { label: "Visibility",    key: "visibility",   color: "#3b82f6" },
                { label: "Engagement",    key: "engagement",   color: "#8b5cf6" },
                { label: "Conversion",    key: "conversion",   color: "#c9993a" },
                { label: "AI Readiness",  key: "ai",           color: "#10b981" },
              ];
              const noteText = prospect.notes.toLowerCase();
              const extractScore = (key) => {
                const patterns = [
                  new RegExp(`${key}[^\\d]*(\\d{1,3})`, 'i'),
                  new RegExp(`(\\d{1,3})[^\\d]*${key}`, 'i'),
                ];
                for (const p of patterns) {
                  const m = noteText.match(p);
                  if (m) return Math.min(100, parseInt(m[1]));
                }
                return null;
              };
              const scores = domains.map(d => ({ ...d, score: extractScore(d.key) })).filter(d => d.score !== null);
              if (scores.length === 0) return null;
              return (
                <div style={{ marginBottom: 28 }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 16 }}>DOMAIN BREAKDOWN</p>
                  {scores.map((d) => (
                    <div key={d.label} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase" }}>{d.label}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: d.color, fontWeight: 700 }}>{d.score}</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${d.score}%`, background: `linear-gradient(90deg, ${d.color}80, ${d.color})`, borderRadius: 99, transition: "width 1.2s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Gap flags */}
            {gaps.length > 0 && (
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 10 }}>IDENTIFIED GAPS</p>
                <div style={{ display: "flex", flexWrap: "wrap", margin: "-4px" }}>
                  {gaps.map((g, i) => <GapFlag key={i} label={g} />)}
                </div>
              </div>
            )}

            {/* Notes excerpt */}
            {prospect.notes && (
              <div style={{ marginTop: 24, padding: "16px 20px", background: "rgba(201,153,58,0.05)", border: "1px solid rgba(201,153,58,0.12)", borderRadius: 8 }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#c9993a", letterSpacing: "0.08em", marginBottom: 8 }}>DIAGNOSTIC SUMMARY</p>
                <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.75 }}>
                  {prospect.notes.slice(0, 400)}{prospect.notes.length > 400 ? "…" : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ══ SECTION 3 — PACKAGES ══ */}
        <div style={{ marginTop: 56 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#c9993a", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(201,153,58,0.15)" }}>Your Recommended Path</div>
          <h2 style={{ fontSize: 24, fontWeight: 400, color: "#f9fafb", fontFamily: "Georgia, serif", marginBottom: 6 }}>Five Ways to Execute</h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 28, fontFamily: "Georgia, serif" }}>Based on your diagnostic score of {score}/100, your recommended tier is <span style={{ color: tier.color, fontWeight: 600 }}>{tier.label}</span>.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, overflowX: "auto" }}>
            {[
              { key: "essentials", label: "Essentials", price: "$1,800–$3,500", color: "#6b7280", max: 20, tagline: "Foundation-first. Get found, get reviewed, get moving.", services: ["AutoRank™ Search Box Optimizer","uRANK™ Reputation Engine","InboxIgnite™ Email Marketing","SpotLight Direct™ Basic"] },
              { key: "momentum",   label: "Momentum",   price: "$3,500–$6,500", color: "#3b82f6", max: 40, tagline: "Multi-channel presence with AI-powered lead capture.", services: ["VoiceBridge™ AI ChatLabs","ConvoFlow™ AI Live Chat","PayNamic™ Email Engine","AutoRank™ + uRANK™ Bundle","TextPulse™ SMS Automation"] },
              { key: "signature",  label: "Signature",  price: "$6,500–$12,000", color: "#8b5cf6", max: 60, tagline: "Full-funnel execution with authority and automation.", services: ["SpotLight Direct™ Full Stack","AuthorityBoost™ PR Engine","CloseCraft™ Funnel Builder","InsightLoop™ Dashboard","Voice & Vibe™ Production","BookStream™ Scheduling"] },
              { key: "vanguard",   label: "Vanguard",   price: "$12,000–$22,000", color: "#c9993a", max: 80, tagline: "Enterprise-grade infrastructure for scaling brands.", services: ["AllianceOS™ Partnership Engine","SpotlightStream™ OTT/CTV","TrustGuard™ Reputation Shield","CommandDesk™ Client Portal","Signal Surge™ Paid Media","Onboardly™ Activation"] },
              { key: "sovereign",  label: "Sovereign",  price: "$15,000+", color: "#e5c97e", max: 100, tagline: "Command-level execution for market leaders.", services: ["Full 22-service deployment","Dedicated Growth Manager","Fractional CMO (20 hrs/mo)","Custom AI Integrations","Multi-brand Management"] },
            ].map((t) => {
              const active = tier.label === t.label;
              return (
                <div key={t.key} style={{ background: active ? `${t.color}12` : "#0d1117", border: `1px solid ${active ? t.color : "rgba(255,255,255,0.06)"}`, borderRadius: 12, padding: "20px 16px 24px", position: "relative" }}>
                  {active && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: t.color, borderRadius: 99, padding: "3px 10px", fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#07090f", fontWeight: 700, whiteSpace: "nowrap" }}>★ RECOMMENDED</div>}
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: t.color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{t.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f9fafb", marginBottom: 4 }}>{t.price}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#4b5563", marginBottom: 16 }}>/month</div>
                  <p style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6, fontFamily: "Georgia, serif", marginBottom: 16, minHeight: 40 }}>{t.tagline}</p>
                  <div style={{ marginBottom: 20 }}>{t.services.map((s,i) => <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}><span style={{ color: t.color, fontSize: 10, flexShrink: 0 }}>✦</span><span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>{s}</span></div>)}</div>
                  <a href="#" style={{ display: "block", textAlign: "center", padding: "10px 12px", borderRadius: 8, background: active ? t.color : "transparent", border: `1px solid ${t.color}`, color: active ? "#07090f" : t.color, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textDecoration: "none", textTransform: "uppercase" }}>{active ? "Get Started →" : "Learn More"}</a>
                </div>
              );
            })}
          </div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#374151", marginTop: 16, letterSpacing: "0.06em" }}>* Services are modular. Bundle discounts: 8% at 3+ services · 15% at 5+ services.</p>
        </div>

        {/* ══ CTA STRIP ══ */}
        <div style={{ marginTop: 40, background: "linear-gradient(135deg, #0d1117, #111827)", border: "1px solid rgba(201,153,58,0.25)", borderRadius: 16, padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#c9993a", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Ready to Move Forward?</div>
          <h3 style={{ fontSize: 22, fontWeight: 400, color: "#f9fafb", fontFamily: "Georgia, serif", marginBottom: 8 }}>Three ways to take the next step</h3>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 32, fontFamily: "Georgia, serif", maxWidth: 480, margin: "0 auto 32px" }}>Your {tier.label} diagnostic is ready. Choose how you want to proceed.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 680, margin: "0 auto" }}>
            <a href="https://calendly.com/socialutely" target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "20px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, textDecoration: "none" }}>
              <span style={{ fontSize: 24 }}>📅</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#f9fafb", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Book a Strategy Call</span>
              <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "Georgia, serif" }}>30 min · No obligation</span>
            </a>
            <a href="#jordan" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "20px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, textDecoration: "none" }}>
              <span style={{ fontSize: 24 }}>🎙️</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#f9fafb", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Chat with Jordan</span>
              <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "Georgia, serif" }}>AI specialist · Available now</span>
            </a>
            <a href="#" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "20px 16px", background: `${tier.color}22`, border: `1px solid ${tier.color}`, borderRadius: 12, textDecoration: "none" }}>
              <span style={{ fontSize: 24 }}>⚡</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: tier.color, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Start Now →</span>
              <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "Georgia, serif" }}>{tier.label} · {tier.price}/mo</span>
            </a>
          </div>
        </div>

        {/* ══ FAQ SECTION ══ */}
        {faq.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Help & FAQ</div>
            {Object.entries(faqByCategory).map(([cat, items]) => (
              <div key={cat}>
                <p style={styles.catLabel}>{cat}</p>
                <div style={styles.card}>
                  {items.map((item, i) => (
                    <div key={item.id} style={{ ...styles.faqItem, borderBottom: i === items.length - 1 ? "none" : styles.faqItem.borderBottom }}>
                      <p style={styles.faqQ}>{item.question}</p>
                      <p style={styles.faqA}>{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ FOOTER ══ */}
        <div style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#374151", letterSpacing: "0.08em" }}>
            SOCIALUTELY · DIAGNOSTIC PORTAL · CONFIDENTIAL
          </span>
          <a href="https://socialutely-any-door-engine.vercel.app" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#c9993a", letterSpacing: "0.08em", textDecoration: "none" }}>
            SOCIALUTELY.COM
          </a>
        </div>
      </div>
    </div>
  );
}
