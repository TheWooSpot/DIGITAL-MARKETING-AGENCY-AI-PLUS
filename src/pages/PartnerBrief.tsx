import { useEffect, useMemo } from "react";
import rawPartnerBriefHtml from "./partner-brief/AI_Readiness_Labs_Partner_Brief.html?raw";

/** Spuds (partner brief) — ElevenLabs ConvAI agent id (dashboard). */
const SPUDS_PARTNER_BRIEF_AGENT_ID = "agent_7101knt9k0rkehmsy89j1thxsqzn";

/** Extra UI for token calls-remaining badge (fixed corner; not in standalone HTML export). */
const PARTNER_BRIEF_BADGE_CSS = `
#pb-token-badge {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 50;
  margin: 0;
  background: #0c0f1a;
  border: 1px solid rgba(201, 153, 58, 0.25);
  padding: 6px 14px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  color: rgba(201, 153, 58, 0.6);
  letter-spacing: 1px;
  pointer-events: none;
}
#pb-token-badge[hidden] { display: none !important; }
`;

function extractStyleAndBody(html: string): { css: string; bodyHtml: string } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("body script").forEach((s) => s.remove());
  const css = doc.querySelector("head style")?.textContent ?? "";
  const bodyHtml = doc.body.innerHTML;
  return { css, bodyHtml };
}

function buildInitScript(config: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessPhrase: string;
  agentId: string;
  tableName: string;
  tokenColumn: string;
}): string {
  const cfg = JSON.stringify(config);
  return `(function(){
var CONFIG = ${cfg};
var storageKey = "socialutely_partner_brief_ok";
var gate = document.getElementById("pb-gate");
var main = document.getElementById("pb-main");
var form = document.getElementById("pb-gate-form");
var input = document.getElementById("pb-access");
var err = document.getElementById("pb-gate-err");
var urlToken = (function(){ try { return new URLSearchParams(window.location.search).get("token"); } catch (e) { return null; } })();

function ensureBadge() {
  var badge = document.getElementById("pb-token-badge");
  if (!badge) {
    badge = document.createElement("p");
    badge.id = "pb-token-badge";
    badge.setAttribute("aria-live", "polite");
    document.body.appendChild(badge);
  }
  return badge;
}

function setupWidgetAgent() {
  var widget = document.querySelector("elevenlabs-convai#pb-el-widget");
  if (widget && CONFIG.agentId) {
    widget.setAttribute("agent-id", CONFIG.agentId);
  }
}

function applyPartnerFirstName(data) {
  if (data && data.partner_first_name) {
    var widget = document.querySelector("elevenlabs-convai");
    if (widget) {
      widget.setAttribute(
        "dynamic-variables",
        JSON.stringify({ partner_name: data.partner_first_name })
      );
    }
  }
}

function showMainAndExtras(data) {
  if (gate) gate.style.display = "none";
  if (main) main.classList.add("visible");
  try { sessionStorage.setItem(storageKey, "1"); } catch (e) {}
  setupWidgetAgent();
  if (data) {
    applyPartnerFirstName(data);
    var badge = ensureBadge();
    if (badge && typeof data.call_count === "number" && typeof data.max_calls === "number") {
      var remaining = Math.max(0, data.max_calls - data.call_count);
      badge.textContent =
        remaining >= 9000
          ? "unlimited access"
          : remaining + " conversation" + (remaining === 1 ? "" : "s") + " remaining";
      badge.removeAttribute("hidden");
      badge.style.display = "block";
    }
  }
}

function fetchTokenRow(cb) {
  if (!urlToken || !window.supabase || !CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
    cb(null, null);
    return;
  }
  var client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
  client
    .from(CONFIG.tableName)
    .select("id, call_count, max_calls, partner_name, partner_first_name, expires_at, is_active")
    .eq(CONFIG.tokenColumn, urlToken)
    .maybeSingle()
    .then(function (res) {
      cb(res.error, res.data);
    })
    .catch(function (e) {
      cb(e, null);
    });
}

function validateTokenThen(ok) {
  if (!urlToken) {
    ok(null);
    return;
  }
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
    if (err) {
      err.textContent = "Partner token access is not configured on this deployment.";
      err.classList.add("visible");
    }
    return;
  }
  fetchTokenRow(function (error, data) {
    if (error || !data) {
      if (err) {
        err.textContent = "That access link is not valid or has expired.";
        err.classList.add("visible");
      }
      return;
    }
    if (!data.is_active) {
      if (err) {
        err.textContent = "This access is no longer active.";
        err.classList.add("visible");
      }
      return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      if (err) {
        err.textContent = "This access link has expired.";
        err.classList.add("visible");
      }
      return;
    }
    ok(data);
  });
}

function unlockWithoutToken() {
  showMainAndExtras(null);
}

if (!form || !input || !err || !gate || !main) return;

if (sessionStorage.getItem(storageKey) === "1") {
  if (urlToken) {
    validateTokenThen(function (data) {
      if (!data) return;
      showMainAndExtras(data);
    });
  } else {
    gate.style.display = "none";
    main.classList.add("visible");
    setupWidgetAgent();
  }
}

var phraseErrText =
  "That phrase doesn't match. Try again or contact your Socialutely liaison.";

form.addEventListener("submit", function (e) {
  e.preventDefault();
  err.classList.remove("visible");
  if ((input.value || "").trim().toUpperCase() !== CONFIG.accessPhrase.toUpperCase()) {
    err.textContent = phraseErrText;
    err.classList.add("visible");
    return;
  }
  if (urlToken) {
    validateTokenThen(function (data) {
      if (!data) return;
      showMainAndExtras(data);
    });
  } else {
    unlockWithoutToken();
  }
});
})();`;
}

export default function PartnerBrief() {
  const { css, bodyHtml } = useMemo(() => extractStyleAndBody(rawPartnerBriefHtml), []);

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";
  const accessPhrase =
    (import.meta.env.VITE_PARTNER_BRIEF_ACCESS_PHRASE as string | undefined)?.trim() || "PARTNER";
  /** Spuds (partner brief) — always this ElevenLabs agent on /partner-brief. */
  const agentId = SPUDS_PARTNER_BRIEF_AGENT_ID;
  /** Must match the Supabase table used for ?token= rows (`token` column = opaque string in URL). */
  const tableName =
    (import.meta.env.VITE_PARTNER_BRIEF_SUPABASE_TABLE as string | undefined)?.trim() ||
    "partner_brief_tokens";
  const tokenColumn =
    (import.meta.env.VITE_PARTNER_BRIEF_TOKEN_COLUMN as string | undefined)?.trim() || "token";

  useEffect(() => {
    document.title = "Partner Brief — AI Readiness Labs";
    let cancelled = false;

    const linkSpecs: { rel: string; href: string; crossOrigin?: string }[] = [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display:ital,opsz,wght@0,9..40,400;0,9..40,500&display=swap",
      },
    ];
    const linkEls: HTMLLinkElement[] = [];
    linkSpecs.forEach((spec, i) => {
      const id = `partner-brief-link-${i}`;
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = spec.rel;
      link.href = spec.href;
      if (spec.crossOrigin) link.crossOrigin = spec.crossOrigin;
      document.head.appendChild(link);
      linkEls.push(link);
    });

    const style = document.createElement("style");
    style.id = "partner-brief-styles";
    style.textContent = css + PARTNER_BRIEF_BADGE_CSS;
    document.head.appendChild(style);

    const supaScript = document.createElement("script");
    supaScript.id = "partner-brief-supabase";
    supaScript.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
    supaScript.onload = () => {
      if (cancelled) return;
      const elScript = document.createElement("script");
      elScript.id = "partner-brief-elevenlabs";
      elScript.src = "https://elevenlabs.io/convai-widget/index.js";
      elScript.async = true;
      elScript.onload = () => {
        if (cancelled) return;
        const initScript = document.createElement("script");
        initScript.id = "partner-brief-init";
        initScript.textContent = buildInitScript({
          supabaseUrl,
          supabaseAnonKey,
          accessPhrase,
          agentId,
          tableName,
          tokenColumn,
        });
        document.body.appendChild(initScript);
      };
      document.body.appendChild(elScript);
    };
    document.body.appendChild(supaScript);

    return () => {
      cancelled = true;
      document.getElementById("partner-brief-styles")?.remove();
      document.getElementById("partner-brief-supabase")?.remove();
      document.getElementById("partner-brief-elevenlabs")?.remove();
      document.getElementById("partner-brief-init")?.remove();
      document.getElementById("pb-token-badge")?.remove();
      linkSpecs.forEach((_, i) => {
        document.getElementById(`partner-brief-link-${i}`)?.remove();
      });
    };
  }, [css, supabaseUrl, supabaseAnonKey, accessPhrase, agentId, tableName, tokenColumn]);

  return <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
}
