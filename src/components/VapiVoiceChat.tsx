import { useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { EVALUATION_SPECIALIST_ASSISTANT_ID } from '@/anydoor/useDiagnosticVapiCall';

const WELCOME_GREETINGS = [
  "Thanks for calling Socialutely. I'm here to learn a bit about you and your business. How can I help you today?",
  "Hello and welcome to Socialutely. I'm excited to connect with you. What brings you here today?",
  "Hi there! Thanks for reaching out to Socialutely. I'd love to hear about you and how we can help. What's on your mind?",
  "Welcome! You've reached Socialutely. I'm here to understand your needs and see how we can support you. How can I assist you today?",
  "Good to hear from you. This is Socialutely—I'm here to learn about you and your business. What would you like to explore today?",
];

function extractErrorMessage(e: unknown): string {
  if (!e) return 'Something went wrong';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  const obj = e as Record<string, unknown>;
  if (obj.error && typeof obj.error === 'object' && obj.error !== null) {
    const err = obj.error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
  }
  if (typeof obj.error === 'string') return obj.error;
  if (typeof obj.message === 'string') return obj.message;
  if (obj.metadata && typeof obj.metadata === 'object') {
    const meta = obj.metadata as Record<string, unknown>;
    if (typeof meta.error === 'string') return meta.error;
  }
  return 'Something went wrong. Check the browser console (F12) for details.';
}

function toUserFriendlyMessage(msg: unknown): string {
  const str = typeof msg === 'string' ? msg : String(msg ?? '');
  const lower = str.toLowerCase();
  if (lower.includes('microphone') || lower.includes('permission') || lower.includes('not-allowed')) {
    return 'Microphone access denied. Please allow microphone permission in your browser and try again.';
  }
  if (lower.includes('invalid') && lower.includes('key')) {
    return 'Invalid API key. Check your VITE_VAPI_PUBLIC_KEY in .env and restart the dev server.';
  }
  if (lower.includes('assistant') && (lower.includes('not found') || lower.includes('invalid'))) {
    return 'Assistant not found. The assistant may have been removed or the ID changed.';
  }
  return str;
}

interface VapiVoiceChatProps {
  publicKey: string;
  onClose?: () => void;
}

export function VapiVoiceChat({ publicKey, onClose }: VapiVoiceChatProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setError('Vapi API key is missing. Add VITE_VAPI_PUBLIC_KEY to your .env file.');
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on('call-start', () => setIsCallActive(true));
    vapi.on('call-end', () => {
      setIsCallActive(false);
      setTranscript((prev) => [...prev, '--- Call ended ---']);
    });

    vapi.on('message', (message: { type?: string; transcript?: string; transcriptType?: string; role?: string; message?: { content?: string } }) => {
      // Only add final transcripts to avoid duplicates. Vapi sends incremental "partial" updates
      // as the AI speaks; each partial gets appended, causing repeated/incremental lines.
      // Skip partial - they're intermediate updates superseded by final.
      if (message.type === 'transcript' && message.transcript && message.transcriptType !== 'partial') {
        setTranscript((prev) => [...prev, message.transcript!]);
      }
    });

    vapi.on('error', (e: unknown) => {
      const msg = toUserFriendlyMessage(extractErrorMessage(e));
      console.error('[Vapi] Error:', e);
      setError(msg);
      setIsCallActive(false);
    });

    vapi.on('call-start-failed', (e: unknown) => {
      const errObj = e as { error?: unknown; stage?: string };
      const msg = typeof errObj?.error === 'string'
        ? toUserFriendlyMessage(errObj.error)
        : toUserFriendlyMessage(extractErrorMessage(e));
      console.error('[Vapi] Call start failed:', e);
      setError(msg);
      setIsCallActive(false);
    });

    return () => {
      vapi.stop();
      vapiRef.current = null;
    };
  }, [publicKey]);

  const handleStart = () => {
    setError(null);
    setTranscript([]);
    const greeting = WELCOME_GREETINGS[Math.floor(Math.random() * WELCOME_GREETINGS.length)];
    vapiRef.current?.start(EVALUATION_SPECIALIST_ASSISTANT_ID, { firstMessage: greeting });
  };

  const handleEnd = () => {
    vapiRef.current?.stop();
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    vapiRef.current?.setMuted(newMuted);
    setIsMuted(newMuted);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Talk with our Evaluation Specialist (Jordan). Tap Start to begin your voice conversation.
        </p>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {transcript.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transcript</p>
            <div className="rounded-lg bg-muted/50 p-4 max-h-48 overflow-y-auto space-y-2 text-sm">
              {transcript.map((line, i) => (
                <p key={i} className="text-foreground">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 p-4 border-t">
        {!isCallActive ? (
          <Button
            onClick={handleStart}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Mic className="w-5 h-5 mr-2" />
            Start Voice Chat
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleToggleMute} className="flex-1">
              {isMuted ? <MicOff className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
            <Button variant="destructive" onClick={handleEnd} className="flex-1">
              <PhoneOff className="w-5 h-5 mr-2" />
              End Call
            </Button>
          </>
        )}
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
