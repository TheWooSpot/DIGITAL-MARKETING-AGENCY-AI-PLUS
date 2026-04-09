import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { getEvaluationSpecialistAssistantId } from "@/anydoor/useDiagnosticVapiCall";
import { vapi } from "@/lib/vapiClient";
import { appendVapiAssistantKeyHint, extractVapiErrorMessage } from "@/lib/vapiErrors";
import { AnyDoorPageShell } from "@/components/anydoor/AnyDoorExperience";

const GOLD = "#c9993a";
const DIM = "rgba(232, 238, 245, 0.58)";

const PARTNER_GREETINGS = [
  "Hi, I'm Jordan with Socialutely. You're looking at the AI Readiness Labs partner brief—what questions can I answer about the program, positioning, or how we work with partners?",
  "Hello—Jordan here from Socialutely. Thanks for reviewing the partner brief. Tell me what you'd like to explore: the curriculum, the audience, or partnership mechanics.",
  "Welcome. I'm Jordan, Socialutely's evaluation specialist. I'm happy to walk through anything in this brief—where should we start?",
];

function extractErrorMessage(e: unknown): string {
  return extractVapiErrorMessage(e);
}

function toUserFriendlyMessage(msg: unknown): string {
  const str = typeof msg === "string" ? msg : String(msg ?? "");
  const lower = str.toLowerCase();
  if (lower.includes("microphone") || lower.includes("permission") || lower.includes("not-allowed")) {
    return "Microphone access denied. Please allow microphone permission in your browser and try again.";
  }
  if (lower.includes("invalid") && lower.includes("key")) {
    return "Invalid API key. Check your VITE_VAPI_PUBLIC_KEY in .env and restart the dev server.";
  }
  if (lower.includes("assistant") && (lower.includes("not found") || lower.includes("invalid"))) {
    return "Assistant not found. The assistant may have been removed or the ID changed.";
  }
  return appendVapiAssistantKeyHint(str);
}

function PartnerBriefVoicePanel() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = vapi;
    if (!client) {
      setError("Vapi API key is missing. Add VITE_VAPI_PUBLIC_KEY to your .env file.");
      return;
    }

    const onCallStart = () => setIsCallActive(true);
    const onCallEnd = () => {
      setIsCallActive(false);
      setTranscript((prev) => [...prev, "--- Call ended ---"]);
    };

    const onMessage = (message: {
      type?: string;
      transcript?: string;
      transcriptType?: string;
    }) => {
      if (message.type === "transcript" && message.transcript && message.transcriptType !== "partial") {
        setTranscript((prev) => [...prev, message.transcript!]);
      }
    };

    const onError = (e: unknown) => {
      const msg = toUserFriendlyMessage(extractErrorMessage(e));
      console.error("[Vapi Partner Brief]", e);
      setError(msg);
      setIsCallActive(false);
    };

    const onCallStartFailed = (e: unknown) => {
      const msg = toUserFriendlyMessage(extractErrorMessage(e));
      console.error("[Vapi Partner Brief] call-start-failed", e);
      setError(msg);
      setIsCallActive(false);
    };

    client.on("call-start", onCallStart);
    client.on("call-end", onCallEnd);
    client.on("message", onMessage);
    client.on("error", onError);
    client.on("call-start-failed", onCallStartFailed);

    return () => {
      client.removeListener("call-start", onCallStart);
      client.removeListener("call-end", onCallEnd);
      client.removeListener("message", onMessage);
      client.removeListener("error", onError);
      client.removeListener("call-start-failed", onCallStartFailed);
      client.stop();
    };
  }, []);

  const handleStart = () => {
    setError(null);
    setTranscript([]);
    const assistantId = getEvaluationSpecialistAssistantId();
    if (!assistantId) {
      setError("Add VITE_VAPI_ASSISTANT_ID to your .env file and restart the dev server.");
      return;
    }
    const firstMessage = PARTNER_GREETINGS[Math.floor(Math.random() * PARTNER_GREETINGS.length)];
    vapi?.start(assistantId, { firstMessage });
  };

  const handleEnd = () => {
    vapi?.stop();
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    vapi?.setMuted(newMuted);
    setIsMuted(newMuted);
  };

  return (
    <div className="partner-brief-card flex flex-col">
      <h2 className="partner-brief-h2">Talk with Jordan (Evaluation Specialist)</h2>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: DIM }}>
        Tap-to-talk uses the same Vapi web client and{" "}
        <span className="font-mono text-[11px] text-white/70">VITE_VAPI_PUBLIC_KEY</span> as the platform Hero voice
        chat. Assistant ID comes from{" "}
        <span className="font-mono text-[11px] text-white/70">VITE_VAPI_ASSISTANT_ID</span>.
      </p>

      <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        ) : null}

        {transcript.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
              Transcript
            </p>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#07090f]/90 p-4 text-sm text-white/90">
              {transcript.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-white/[0.08] pt-6">
        {!isCallActive ? (
          <Button
            type="button"
            onClick={handleStart}
            className="flex-1 min-w-[200px] rounded-lg border-0 font-semibold text-[#07090f] shadow-none transition hover:opacity-95"
            style={{ backgroundColor: GOLD }}
          >
            <Mic className="mr-2 h-5 w-5" aria-hidden />
            Start voice chat
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleToggleMute}
              className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/5 hover:text-white"
            >
              {isMuted ? <MicOff className="mr-2 h-5 w-5" /> : <Mic className="mr-2 h-5 w-5" />}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleEnd}
              className="flex-1 bg-red-600/90 hover:bg-red-600"
            >
              <PhoneOff className="mr-2 h-5 w-5" />
              End call
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PartnerBrief() {
  return (
    <AnyDoorPageShell backHref="/" backLabel="← Platform home">
      <article className="partner-brief-page -mx-4 rounded-2xl px-4 py-8 sm:mx-0 sm:px-8 sm:py-10">
        <header className="text-center sm:text-left">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.35em]"
            style={{ color: GOLD }}
          >
            Confidential · Partner brief
          </p>
          <h1
            className="partner-brief-serif mt-4 text-3xl font-light leading-tight text-white sm:text-4xl md:text-[2.75rem]"
          >
            AI Readiness Labs<span className="text-[#c9993a]">™</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base font-medium text-white/90">
            Channel partner overview — curriculum, positioning, and how we co-deliver measurable AI adoption outcomes.
          </p>
          <p className="mt-2 text-sm" style={{ color: DIM }}>
            Prepared for agencies, consultants, and strategic affiliates · Socialutely
          </p>
        </header>

        <div className="partner-brief-rule mx-auto sm:mx-0" aria-hidden />

        <section className="space-y-4" aria-labelledby="pb-summary">
          <h2 id="pb-summary" className="partner-brief-h2">
            Executive summary
          </h2>
          <div className="space-y-3 text-sm leading-relaxed" style={{ color: DIM }}>
            <p>
              AI Readiness Labs™ is Socialutely&apos;s structured learning path for leaders who need practical AI
              adoption—not hype. Partners introduce qualified organizations to{" "}
              <strong className="font-medium text-white/90">SkillSprint™</strong>-hosted programs that move teams from
              experimentation to operational use, with clear milestones and revenue-aligned workflows.
            </p>
            <p>
              This brief outlines the program architecture, ideal partner profile, enablement expectations, and brand
              guardrails so you can evaluate fit and plan co-marketing responsibly.
            </p>
          </div>
        </section>

        <div className="partner-brief-rule mx-auto sm:mx-0" aria-hidden />

        <section className="space-y-4" aria-labelledby="pb-shift">
          <h2 id="pb-shift" className="partner-brief-h2">
            Why the market is ready now
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed marker:text-[#c9993a]" style={{ color: DIM }}>
            <li>Procurement is shifting from “AI pilots” to governed workflows tied to CRM, email, and calendar reality.</li>
            <li>Teams want repeatable playbooks—not one-off prompts—so adoption doesn’t collapse when a champion leaves.</li>
            <li>Buyers expect vendors and agencies to prove ROI; our labs map each module to an operational outcome.</li>
          </ul>
        </section>

        <div className="partner-brief-rule mx-auto sm:mx-0" aria-hidden />

        <section className="space-y-4" aria-labelledby="pb-program">
          <h2 id="pb-program" className="partner-brief-h2">
            Program architecture
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="partner-brief-card">
              <h3 className="partner-brief-serif text-base font-medium text-white">Rung 2 — Adaptation</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: DIM }}>
                Self-paced, ~90 days. Baseline mapping, first automated workflow, systems linkage, revenue alignment,
                and sustainment rituals—designed for scores indicating absent or experimental AI use.
              </p>
              <Link
                to="/ai-readiness/rung-2"
                className="mt-4 inline-block text-sm font-medium underline underline-offset-4 hover:opacity-90"
                style={{ color: GOLD }}
              >
                View Rung 2 landing →
              </Link>
            </div>
            <div className="partner-brief-card">
              <h3 className="partner-brief-serif text-base font-medium text-white">Rung 3 — Optimization</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: DIM }}>
                For teams already running AI: deepen integration, measurement, and scale—without losing governance or
                brand consistency.
              </p>
              <Link
                to="/ai-readiness/rung-3"
                className="mt-4 inline-block text-sm font-medium underline underline-offset-4 hover:opacity-90"
                style={{ color: GOLD }}
              >
                View Rung 3 landing →
              </Link>
            </div>
          </div>
        </section>

        <div className="partner-brief-rule mx-auto sm:mx-0" aria-hidden />

        <section className="space-y-4" aria-labelledby="pb-partner">
          <h2 id="pb-partner" className="partner-brief-h2">
            Partner value proposition
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed marker:text-[#c9993a]" style={{ color: DIM }}>
            <li>Provisioned curriculum and LMS delivery reduce your build time; you focus on discovery and success.</li>
            <li>Shared diagnostic language (AI IQ™ / readiness framing) creates clean handoffs from marketing to delivery.</li>
            <li>Positioning support: talk tracks, objection handling, and co-branded assets where approved.</li>
            <li>Pricing and commercial terms are agreed in a separate partner schedule—not in this overview.</li>
          </ul>
        </section>

        <div className="partner-brief-rule mx-auto sm:mx-0" aria-hidden />

        <section className="space-y-4" aria-labelledby="pb-ideal">
          <h2 id="pb-ideal" className="partner-brief-h2">
            Ideal partner profile
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed marker:text-[#c9993a]" style={{ color: DIM }}>
            <li>Serves SMBs, startups, or mid-market with recurring advisory or marketing engagements.</li>
            <li>Comfortable facilitating technical readiness conversations (security, data, workflow ownership).</li>
            <li>Willing to follow brand, claims, and compliance guidelines for AI positioning.</li>
            <li>Can introduce a pipeline of serious learners—not drive-by traffic solely for lead magnets.</li>
          </ul>
        </section>

        <div className="partner-brief-rule mx-auto sm:mx-0" aria-hidden />

        <section className="space-y-4" aria-labelledby="pb-enable">
          <h2 id="pb-enable" className="partner-brief-h2">
            Enablement & support
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: DIM }}>
            Socialutely provides onboarding for partner success leads: program outline, pacing, assessment hooks, escalation
            paths, and periodic roadmap updates. Detailed commercial schedules, MDF (if any), and support SLAs are
            documented in the executed partner agreement.
          </p>
        </section>

        <div className="partner-brief-rule mx-auto sm:mx-0" aria-hidden />

        <section className="space-y-4" aria-labelledby="pb-brand">
          <h2 id="pb-brand" className="partner-brief-h2">
            Brand & claims guardrails
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: DIM }}>
            Use only approved marks: <strong className="text-white/85">AI Readiness Labs™</strong>,{" "}
            <strong className="text-white/85">SkillSprint™</strong>, and Socialutely naming as provided in the brand
            supplement. Avoid guaranteed revenue claims, unsupervised “fully autonomous AI” promises, or implying
            certification from third-party model vendors. When in doubt, route copy through Socialutely marketing review.
          </p>
        </section>

        <div className="partner-brief-rule mx-auto sm:mx-0" aria-hidden />

        <section className="space-y-4" aria-labelledby="pb-voice">
          <h2 id="pb-voice" className="partner-brief-h2">
            Voice intake
          </h2>
          <PartnerBriefVoicePanel />
        </section>

        <div className="partner-brief-rule mx-auto sm:mx-0" aria-hidden />

        <footer className="space-y-3 pb-8 text-center text-sm sm:text-left" style={{ color: DIM }}>
          <p className="partner-brief-serif text-base text-white/90">Next steps</p>
          <p>
            Schedule a partner conversation through your Socialutely contact, or explore public entry points:{" "}
            <Link to="/ai-readiness/rung-2" className="underline underline-offset-4" style={{ color: GOLD }}>
              Rung 2
            </Link>
            ,{" "}
            <Link to="/ai-readiness/rung-3" className="underline underline-offset-4" style={{ color: GOLD }}>
              Rung 3
            </Link>
            , or{" "}
            <Link to="/contact" className="underline underline-offset-4" style={{ color: GOLD }}>
              contact
            </Link>
            .
          </p>
        </footer>
      </article>
    </AnyDoorPageShell>
  );
}
