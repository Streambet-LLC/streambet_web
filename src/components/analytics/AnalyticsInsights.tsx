import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Search, ArrowUp, ChevronRight } from 'lucide-react';
import { analyticsAPI } from '@/integrations/api/client';
import type { ApiInsightsMessage } from '@/types/analytics-api';
import { DeepDivesPanel } from './DeepDivesPanel';

/**
 * Insights — a conversational analyst over the collector data.
 *
 * Sends the running chat history to `/admin/analytics/insights/chat`, where
 * Claude answers by calling read-only tools (cards, buyers, market, leads).
 * The empty state is a search-bar landing with a rotating example placeholder
 * and suggested queries that pre-fill the input.
 */

// Example questions the assistant can answer. Used both for the rotating input
// placeholder and the "Try asking" suggestions.
const EXAMPLE_PROMPTS = [
  "What's the outlook and social buzz on the Crown Zenith Charizard?",
  'What scenarios could move a Luka Dončić Prizm rookie, and the odds?',
  'How have rookie cards performed after an MVP season?',
  'Could a reprint or PSA grading change move Umbreon VMAX Alt Art?',
  "What's a PSA 10 Base Set Charizard worth right now?",
  'How could a supply cut affect sealed Pokémon prices?',
  'Which players are trending in card collecting right now?',
];

const SUGGESTED = EXAMPLE_PROMPTS.slice(0, 5);

// Friendly labels for the tools Claude may call, shown under a reply.
const TOOL_LABELS: Record<string, string> = {
  web_search: 'Searched the web',
  start_deep_dive: 'Started deep dive',
  search_cards: 'Searched catalog',
  get_card: 'Read card detail',
  search_buyers: 'Searched buyers',
  search_leads: 'Searched leads',
};

type Msg = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  tools?: string[];
  streaming?: boolean;
};

export const AnalyticsInsights = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [phIndex, setPhIndex] = useState(0);
  const [deepRefresh, setDeepRefresh] = useState(0);

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

  // Keep the latest message in view. 'auto' (instant) avoids janky
  // fighting-scrolls while tokens stream in rapidly.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, thinking]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    const userMsg: Msg = { id: ++idRef.current, role: 'user', text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setThinking(true);

    const payload: ApiInsightsMessage[] = history.map(m => ({
      role: m.role,
      content: m.text,
    }));

    // The streaming assistant bubble is created lazily on the first event,
    // so the typing dots show until the model actually starts responding.
    let asstId = -1;
    let acc = '';
    const toolSet = new Set<string>();
    const ensureMsg = () => {
      if (asstId !== -1) return;
      asstId = ++idRef.current;
      setThinking(false);
      setMessages(m => [
        ...m,
        { id: asstId, role: 'assistant', text: '', tools: [], streaming: true },
      ]);
    };
    const patch = (fields: Partial<Msg>) =>
      setMessages(m => m.map(x => (x.id === asstId ? { ...x, ...fields } : x)));

    const { completed } = await analyticsAPI.insightsChatStream(payload, {
      onText: delta => {
        ensureMsg();
        acc += delta;
        patch({ text: acc });
      },
      onTool: name => {
        ensureMsg();
        toolSet.add(name);
        patch({ tools: [...toolSet] });
      },
      onDone: toolCalls => {
        if ((toolCalls ?? []).some(t => t.name === 'start_deep_dive')) {
          setDeepRefresh(n => n + 1);
        }
        if (asstId !== -1) patch({ streaming: false });
        setThinking(false);
      },
      onError: message => {
        ensureMsg();
        patch({ text: acc || `⚠️ ${message}`, streaming: false });
        setThinking(false);
      },
    });

    // The stream was cut before finishing (e.g. a proxy idle-timeout in prod).
    // Fall back to the non-streaming endpoint to fetch the complete answer.
    if (!completed) {
      try {
        const res = await analyticsAPI.insightsChat(payload);
        ensureMsg();
        acc = res.reply;
        const names = (res.toolCalls ?? []).map(t => t.name);
        names.forEach(n => toolSet.add(n));
        if (names.includes('start_deep_dive')) setDeepRefresh(n => n + 1);
        patch({ text: acc, tools: [...toolSet], streaming: false });
      } catch {
        ensureMsg();
        patch({
          text: acc || '⚠️ The connection dropped. Please try again.',
          streaming: false,
        });
      }
    }
    setThinking(false);
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
    <>
      <DeepDivesPanel refreshSignal={deepRefresh} />
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 flex flex-col max-h-[72vh] overflow-hidden">
      {!started ? (
        /* ---------- Empty state: search-bar landing ---------- */
        <div className="overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#B4FF39]/15 text-[#B4FF39]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl sm:text-2xl font-semibold text-white">
              Ask CardCade AI
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
              Ask about any card — pricing, social buzz, and the upcoming events,
              precedents, and supply factors that could move it.
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
                    <div className="max-w-[85%] space-y-1.5">
                      {m.tools && m.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {m.tools.map(t => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-muted-foreground"
                            >
                              <Search className="h-2.5 w-2.5" />
                              {TOOL_LABELS[t] ?? t}
                            </span>
                          ))}
                        </div>
                      )}
                      {(m.text || !m.streaming) && (
                        <div className="rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 text-white/90 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                          {m.text}
                          {m.streaming && (
                            <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-[#B4FF39]/70" />
                          )}
                        </div>
                      )}
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
    </>
  );
};
