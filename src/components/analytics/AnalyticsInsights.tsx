import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Search, ArrowUp, ChevronRight } from 'lucide-react';

/**
 * Insights — a placeholder AI chat surface for collector analytics.
 *
 * UI ONLY for now: nothing is wired to a model. Sending a message echoes the
 * user's question and replies with a canned "coming soon" message. The empty
 * state is a search-bar landing with a rotating example placeholder and a list
 * of suggested queries that pre-fill the input.
 *
 * When the real backend lands, swap `respond()` for a streaming API call and
 * keep the rest of the UI.
 */

// Example questions the future assistant will answer. Used both for the
// rotating input placeholder and the "Try asking" suggestions.
const EXAMPLE_PROMPTS = [
  'Who bought Mewtwo cards?',
  'Top Charizard buyers in the last 90 days',
  'High-volume whales who went quiet in the last 60 days',
  'One Piece collectors based in California',
  'Sports VIPs who collect the Dodgers',
  'Lapsed Pokémon buyers worth re-engaging',
  'Buyers spending $1k+ with no email on file',
];

const SUGGESTED = EXAMPLE_PROMPTS.slice(0, 5);

const CANNED_REPLY =
  "✨ AI Insights is coming soon. Soon you'll be able to ask questions like this in plain English and get back instant buyer lists, segments, and trends pulled straight from your collector data — ready to export or hand to outreach. For now, this is a preview of what's on the way.";

type Msg = { id: number; role: 'user' | 'assistant'; text: string };

export const AnalyticsInsights = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [phIndex, setPhIndex] = useState(0);

  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const started = messages.length > 0;

  // Rotate the placeholder through example prompts while the chat is empty.
  useEffect(() => {
    if (started) return;
    const t = setInterval(
      () => setPhIndex(i => (i + 1) % EXAMPLE_PROMPTS.length),
      3000,
    );
    return () => clearInterval(t);
  }, [started]);

  // Keep the latest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    const userMsg: Msg = { id: ++idRef.current, role: 'user', text };
    setMessages(m => [...m, userMsg]);
    setInput('');
    // Fake a brief "thinking" beat, then drop in the canned reply.
    setThinking(true);
    window.setTimeout(() => {
      setMessages(m => [
        ...m,
        { id: ++idRef.current, role: 'assistant', text: CANNED_REPLY },
      ]);
      setThinking(false);
    }, 750);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // Shared composer (input + send) used in both states.
  const Composer = (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            started
              ? 'Ask a follow-up…'
              : EXAMPLE_PROMPTS[phIndex]
          }
          className="pl-9 pr-3 h-11 bg-black/40 border-white/10 text-sm"
        />
      </div>
      <Button
        onClick={() => send(input)}
        disabled={!input.trim() || thinking}
        className="h-11 w-11 shrink-0 p-0 bg-[#B4FF39] text-black hover:bg-[#a2e833] disabled:opacity-40"
        aria-label="Send"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 flex flex-col max-h-[72vh] overflow-hidden">
      {!started ? (
        /* ---------- Empty state: search-bar landing ---------- */
        <div className="overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B4FF39]/30 bg-[#B4FF39]/10 px-2.5 py-1 text-[11px] font-medium text-[#B4FF39]">
              <Sparkles className="h-3 w-3" /> Coming soon
            </span>
            <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#B4FF39]/15 text-[#B4FF39]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl sm:text-2xl font-semibold text-white">
              Ask CardCade AI
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
              Query your collector data in plain English — find buyers, build
              segments, and surface trends without touching a filter.
            </p>

            <div className="w-full mt-6">{Composer}</div>

            <div className="w-full mt-8 text-left">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 px-1">
                Try asking
              </div>
              <div className="space-y-1.5">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="group w-full flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/5 hover:border-white/10 transition-colors"
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{q}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ---------- Conversation ---------- */
        <>
          <div className="min-h-0 overflow-y-auto px-4 sm:px-6 py-5">
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map(m =>
                m.role === 'user' ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#B4FF39] text-black px-3.5 py-2.5 text-sm">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#B4FF39]/15 text-[#B4FF39]">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 text-white/90 px-3.5 py-2.5 text-sm leading-relaxed">
                      {m.text}
                    </div>
                  </div>
                ),
              )}
              {thinking && (
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#B4FF39]/15 text-[#B4FF39]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 px-3.5 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>
          <div className="border-t border-white/5 p-3 sm:p-4 shrink-0">
            <div className="max-w-2xl mx-auto">{Composer}</div>
          </div>
        </>
      )}
    </Card>
  );
};
