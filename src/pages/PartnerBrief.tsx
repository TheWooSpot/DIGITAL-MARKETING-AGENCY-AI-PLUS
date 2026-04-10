import { useEffect, useMemo, useRef } from "react";
import rawPartnerBriefHtml from "./partner-brief/AI_Readiness_Labs_Partner_Brief.html?raw";

const STORAGE_KEY = "socialutely_partner_brief_ok";

const ELEVENLABS_WIDGET_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";
const SUPABASE_CDN_SRC = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";

function extractStyleAndRoot(html: string): { css: string; rootHtml: string } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const styleEl = doc.querySelector("head > style");
  const css = styleEl?.textContent?.trim() ?? "";
  const root = doc.querySelector(".partner-brief-root");
  const rootHtml = root?.outerHTML ?? "";
  return { css, rootHtml };
}

function appendScriptOnce(src: string, type: string): HTMLScriptElement {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) return existing as HTMLScriptElement;
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  s.type = type;
  document.body.append(s);
  return s;
}

/**
 * Live route: partner brief HTML lives in ./partner-brief/AI_Readiness_Labs_Partner_Brief.html.
 * Paste your export from `AI_Readiness_Labs_Partner_Brief.html` over that file (and public copy) to keep structure in sync.
 * Styles: injected via <style dangerouslySetInnerHTML />. Gate + widget wired in React (inline <script> in HTML is not executed from innerHTML).
 */
export default function PartnerBrief() {
  const { css, rootHtml } = useMemo(() => extractStyleAndRoot(rawPartnerBriefHtml), []);
  const rootRef = useRef<HTMLDivElement>(null);

  const accessPhrase =
    (import.meta.env.VITE_PARTNER_BRIEF_ACCESS_PHRASE as string | undefined)?.trim() || "PARTNER";

  const agentId = (
    import.meta.env.VITE_PARTNER_BRIEF_ELEVENLABS_AGENT_ID ||
    import.meta.env.VITE_ELEVENLABS_JORDAN_AGENT_ID ||
    ""
  ).trim();

  useEffect(() => {
    appendScriptOnce(ELEVENLABS_WIDGET_SRC, "text/javascript");
    appendScriptOnce(SUPABASE_CDN_SRC, "text/javascript");
  }, []);

  useEffect(() => {
    const mount = rootRef.current;
    if (!mount) return;

    const gate = mount.querySelector("#pb-gate") as HTMLElement | null;
    const main = mount.querySelector("#pb-main") as HTMLElement | null;
    const form = mount.querySelector("#pb-gate-form") as HTMLFormElement | null;
    const input = mount.querySelector("#pb-access") as HTMLInputElement | null;
    const err = mount.querySelector("#pb-gate-err") as HTMLElement | null;
    const widget = mount.querySelector("elevenlabs-convai#pb-el-widget") as HTMLElement | null;

    if (widget && agentId) {
      widget.setAttribute("agent-id", agentId);
    }

    const unlock = () => {
      if (gate) gate.style.display = "none";
      main?.classList.add("visible");
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* private mode */
      }
    };

    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      unlock();
    }

    const onSubmit = (e: Event) => {
      e.preventDefault();
      err?.classList.remove("visible");
      const val = (input?.value || "").trim().toUpperCase();
      if (val === accessPhrase.trim().toUpperCase()) {
        unlock();
      } else {
        err?.classList.add("visible");
      }
    };

    form?.addEventListener("submit", onSubmit);
    return () => form?.removeEventListener("submit", onSubmit);
  }, [rootHtml, accessPhrase, agentId]);

  return (
    <>
      {/* Same CSS as <style> in AI_Readiness_Labs_Partner_Brief.html */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        ref={rootRef}
        className="partner-brief-live-route"
        dangerouslySetInnerHTML={{ __html: rootHtml }}
      />
    </>
  );
}
