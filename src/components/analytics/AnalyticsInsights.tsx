import { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search,
  ArrowUp,
  ChevronRight,
  History,
  Plus,
  ImagePlus,
  X,
  Loader2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { analyticsAPI } from '@/integrations/api/client';
import type {
  ApiInsightsMessage,
  ApiInsightsExchange,
  ApiCardCandidate,
  ApiCardValuation,
} from '@/types/analytics-api';
import { fileToCardImage, type CardImage } from '@/utils/cardImage';
import { useAnswerDepth } from '@/hooks/useAnswerDepth';
import { DepthSettings } from './DepthSettings';
import { DeepDivesPanel } from './DeepDivesPanel';
import { ChatMarkdown } from './ChatMarkdown';
import { ChatValuationCard } from './ChatValuationCard';
import { CardConfirm, nameOnlyCandidate } from './CardConfirm';
import { InsightsHistoryDialog } from './InsightsHistoryDialog';
import { AiDisclaimer } from './AiDisclaimer';

const newConversationId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Where the active conversation id survives a navigation or reload. */
const CONV_KEY = 'cardy.conversationId';
/** Last time the chat saw real activity (a send or a completed answer). */
const ACTIVITY_KEY = 'cardy.lastActivity';
/** After this much idle, a returning visitor gets a FRESH chat (old is in
 *  History). Applied on remount, on tab return, and on the next send. */
const IDLE_ROLLOVER_MS = 60 * 60 * 1000; // 1 hour

/** How often a rejoined run is re-checked while it's still working. */
const RUN_POLL_MS = 1500;

const readStoredConvId = (): string | null => {
  try {
    return localStorage.getItem(CONV_KEY);
  } catch {
    return null; // private mode / storage disabled
  }
};

const storeConvId = (id: string) => {
  try {
    localStorage.setItem(CONV_KEY, id);
  } catch {
    /* non-fatal: the chat just won't survive a reload */
  }
};

const readLastActivity = (): number => {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
};
const touchActivity = () => {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  } catch {
    /* non-fatal */
  }
};
/** True when the last chat activity was over an hour ago. */
const isChatStale = (): boolean => {
  const last = readLastActivity();
  return last > 0 && Date.now() - last > IDLE_ROLLOVER_MS;
};

/**
 * Composer ceiling in px — ~7 lines at leading-5 (20px) plus the textarea's
 * 8px of vertical padding. Past this it scrolls rather than pushing the chat
 * transcript off screen. Keep in sync with max-h-[152px] on the textarea.
 */
const COMPOSER_MAX_H = 152;

// Steps value_card actually runs — cycled so the ~15-30s wait feels active.
const VALUE_PHRASES = [
  'finding recent sales…',
  'checking the market index…',
  'verifying the comps…',
  'computing the value…',
];

/** The animated "working" bubble shown while a tool runs and no text has
 *  arrived yet — cycles real steps for value_card so it never looks frozen. */
const WorkingStatus = ({ tools }: { tools?: string[] }) => {
  const [i, setI] = useState(0);
  const valuing = tools?.includes('value_card') ?? false;
  useEffect(() => {
    if (!valuing) return;
    const t = setInterval(() => setI(x => x + 1), 3500);
    return () => clearInterval(t);
  }, [valuing]);
  const label = valuing
    ? VALUE_PHRASES[i % VALUE_PHRASES.length]
    : tools && tools.length > 0
      ? 'researching…'
      : 'thinking…';
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 px-3.5 py-3">
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce" />
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
};

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
  'What events will drive prices on my Mahomes 2024 Color Blast PSA 9 over the next year?',
  "What's the optimal time to sell my Pikachu Crown Zenith PSA 10? And where/how?",
  "What's my PSA 10 Luther Burden Rookie Kaboom worth today?",
  'Quantify the odds & price scenarios for my PSA 8 base set Charizard over the next 2 years',
];

const SUGGESTED = EXAMPLE_PROMPTS.slice(0, 5);

// Friendly labels for the tools Claude may call, shown under a reply.
const TOOL_LABELS: Record<string, string> = {
  web_search: 'Searched the web',
  start_deep_dive: 'Started AI Market Report',
  search_leads: 'Searched leads',
  verify_card: 'Verifying the card',
  value_card: 'Valued the card',
  add_to_portfolio: 'Saved to your portfolio',
};

type Msg = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  tools?: string[];
  streaming?: boolean;
  at?: number;
  /** A card photo attached to a user turn (base64 + preview URL). */
  image?: CardImage;
  /** Structured, code-computed valuation to render as a card (assistant). */
  valuation?: ApiCardValuation | null;
  /** The admin's thumbs up/down on this answer. */
  feedback?: 'up' | 'down';
};

export const AnalyticsInsights = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [phIndex, setPhIndex] = useState(0);
  const [deepRefresh, setDeepRefresh] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attachment, setAttachment] = useState<CardImage | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [depth, setDepth] = useAnswerDepth();
  // When the chat kicks off a deep dive, hand its subject to the Deep Dives
  // panel so it autofills + scrolls + highlights (nonce forces a re-trigger
  // even if the same subject is dived twice).
  const [chatDive, setChatDive] = useState<{
    subject: string;
    nonce: number;
  } | null>(null);
  // The chat asked to verify a specific card before analyzing it — we show the
  // "is this the right card?" step (name + reference image) and only continue
  // once the admin confirms (or corrects) it.
  const [verify, setVerify] = useState<{
    subject: string;
    name: string;
    candidate: ApiCardCandidate | null;
    loading: boolean;
    imageLoading: boolean;
  } | null>(null);

  /**
   * A chat turn may have called the `start_deep_dive` tool (the job is already
   * running server-side). Refresh the panel and surface the subject there.
   */
  const applyDiveTool = (
    toolCalls?: { name: string; input?: unknown }[]
  ) => {
    const dive = (toolCalls ?? []).find(t => t.name === 'start_deep_dive');
    if (!dive) return;
    setDeepRefresh(n => n + 1);
    const subject = (dive.input as { subject?: string } | undefined)?.subject;
    if (subject) setChatDive({ subject, nonce: Date.now() });
  };

  /**
   * Show the verify step for `subject` and (re)fetch its reference image +
   * normalized name, so the admin can eyeball the card — or correct it and
   * re-run this to check the fix.
   */
  const runIdentify = (subject: string) => {
    const s = subject.trim();
    if (!s) return;
    setVerify({
      subject: s,
      name: s,
      candidate: null,
      loading: true,
      imageLoading: false,
    });
    // Phase 1: fast card name (no web search) — shows almost instantly.
    analyticsAPI
      .identifyCard(s)
      .then(c => {
        setVerify(cur =>
          cur && cur.subject === s
            ? {
                ...cur,
                candidate: c,
                name: c.name || s,
                loading: false,
                imageLoading: true,
              }
            : cur
        );
        // Phase 2: reference image (Pokémon TCG API → web search) — async.
        analyticsAPI
          .cardImage({
            subject: c.subject || s,
            name: c.name,
            brand: c.brand,
            number: c.number,
          })
          .then(({ imageUrl }) =>
            setVerify(cur =>
              cur && cur.subject === s && cur.candidate
                ? {
                    ...cur,
                    candidate: { ...cur.candidate, imageUrl },
                    imageLoading: false,
                  }
                : cur
            )
          )
          .catch(() =>
            setVerify(cur =>
              cur && cur.subject === s ? { ...cur, imageLoading: false } : cur
            )
          );
      })
      .catch(() =>
        setVerify(cur =>
          cur && cur.subject === s
            ? {
                ...cur,
                candidate: nameOnlyCandidate(s),
                loading: false,
                imageLoading: false,
              }
            : cur
        )
      );
  };

  /**
   * The chat called `verify_card` to confirm the exact card before analyzing.
   * Kick off the verify step. Returns true when one was triggered.
   */
  const applyVerifyTool = (
    toolCalls?: { name: string; input?: unknown }[]
  ): boolean => {
    const v = (toolCalls ?? []).find(t => t.name === 'verify_card');
    const subject = (
      v?.input as { subject?: string } | undefined
    )?.subject?.trim();
    if (!subject) return false;
    runIdentify(subject);
    return true;
  };

  // Admin confirmed the card (possibly after editing the name) — hand Cardy the
  // exact card to analyze. Neutral wording so a correction is never read as a
  // blanket "yes".
  const confirmVerify = () => {
    if (!verify) return;
    const name = verify.name.trim();
    if (!name || thinking) return;
    setVerify(null);
    void send(`Confirmed — analyze this exact card: "${name}".`);
  };

  const idRef = useRef(0);
  // Reuse the stored conversation so leaving and coming back resumes it.
  const convIdRef = useRef<string>(readStoredConvId() ?? newConversationId());
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Stops any in-progress run polling from setting state after unmount.
  const mountedRef = useRef(true);
  const started = messages.length > 0;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const newChat = () => {
    if (thinking) return;
    convIdRef.current = newConversationId();
    storeConvId(convIdRef.current);
    setMessages([]);
    setInput('');
    setAttachment(null);
  };

  // Resize/compress a chosen or camera-captured photo, then hold it as the
  // pending attachment (shown as a thumbnail until the next send).
  const pickFile = async (file?: File | null) => {
    if (!file) return;
    setAttaching(true);
    try {
      setAttachment(await fileToCardImage(file));
    } catch (e) {
      toast.error((e as Error).message || 'Could not add that image.');
    } finally {
      setAttaching(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toMessages = (exchanges: ApiInsightsExchange[]): Msg[] => {
    const msgs: Msg[] = [];
    for (const e of exchanges) {
      const at = new Date(e.createdAt).getTime();
      msgs.push({ id: ++idRef.current, role: 'user', text: e.question, at });
      msgs.push({
        id: ++idRef.current,
        role: 'assistant',
        text: e.answer,
        tools: e.tools ?? [],
        at,
      });
    }
    return msgs;
  };

  const openConversation = (
    conversationId: string,
    exchanges: ApiInsightsExchange[]
  ) => {
    convIdRef.current = conversationId;
    storeConvId(conversationId);
    setMessages(toMessages(exchanges));
  };

  /**
   * Follow a turn the server is still working on, appending its text as it
   * lands. Used both when rejoining after a navigation and when a stream is
   * cut mid-answer — in the latter case it replaces re-running the whole
   * conversation, which used to bill the tokens a second time.
   * Returns once the run settles. `alive` lets an unmount stop the loop.
   */
  const followRun = async (
    conversationId: string,
    onUpdate: (text: string, done: boolean, error?: string) => void,
    alive: () => boolean
  ) => {
    for (;;) {
      if (!alive()) return;
      let run: Awaited<ReturnType<typeof analyticsAPI.getInsightsRun>> = null;
      try {
        run = await analyticsAPI.getInsightsRun(conversationId);
      } catch {
        /* transient — try again next tick */
      }
      if (!alive()) return;
      if (run) {
        if (run.status === 'done') return onUpdate(run.answer, true);
        if (run.status === 'error')
          return onUpdate(
            run.answer,
            true,
            run.errorMessage ?? 'That answer was interrupted.'
          );
        onUpdate(run.answer, false);
      }
      await new Promise(r => setTimeout(r, RUN_POLL_MS));
    }
  };

  // On mount, restore the stored conversation and rejoin anything still
  // running. The server finishes an answer even after the client disconnects,
  // so this is about reattaching to work that is already happening/done.
  useEffect(() => {
    let alive = true;
    const conversationId = convIdRef.current;
    storeConvId(conversationId);

    void (async () => {
      const [exchanges, run] = await Promise.all([
        analyticsAPI.getInsightsConversation(conversationId).catch(() => []),
        analyticsAPI.getInsightsRun(conversationId).catch(() => null),
      ]);
      if (!alive) return;

      const isRunning = run?.status === 'running';
      // Away over an hour → start a FRESH chat instead of reopening the stale
      // one (it's still one tap away in History). Don't roll a run that's
      // actually in flight — that means recent activity.
      if (isChatStale() && !isRunning) {
        convIdRef.current = newConversationId();
        storeConvId(convIdRef.current);
        return;
      }

      const restored = toMessages(exchanges);
      if (!restored.length && !isRunning) return; // nothing to come back to

      setMessages(restored);
      if (!isRunning) return;

      // The in-flight turn isn't an exchange yet, so put it back by hand.
      const at = new Date(run.startedAt).getTime();
      const userId = ++idRef.current;
      const asstId = ++idRef.current;
      const bubble: Msg = {
        id: asstId,
        role: 'assistant',
        text: run.answer,
        tools: run.tools ?? [],
        streaming: true,
        at,
      };
      // Mirror send()'s lazy bubble: with no text yet the model is still on
      // tool calls, so show the typing dots rather than an empty bubble.
      const hasText = !!run.answer.trim();
      setMessages([
        ...restored,
        { id: userId, role: 'user', text: run.question, at },
        ...(hasText ? [bubble] : []),
      ]);
      setThinking(!hasText);
      toast.info('Picking up where you left off…');

      await followRun(
        conversationId,
        (text, done, error) => {
          const body = error ? text || `⚠️ ${error}` : text;
          // No text yet and not finished — still on tool calls, keep the dots.
          if (!body && !done) return;
          setThinking(false);
          setMessages(m =>
            m.some(x => x.id === asstId)
              ? m.map(x =>
                  x.id === asstId ? { ...x, text: body, streaming: !done } : x
                )
              : [...m, { ...bubble, text: body, streaming: !done }]
          );
        },
        () => alive
      );
    })();

    return () => {
      alive = false;
    };
    // Mount-only: convIdRef is a ref and newChat() resets state directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Returning to the tab after an hour idle → start a fresh chat (old one is in
  // History). Covers the "left it open in a background tab" case that a remount
  // doesn't.
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState !== 'visible' || thinking) return;
      if (messages.length > 0 && isChatStale()) newChat();
    };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, thinking]);

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
    const image = attachment;
    // A photo alone is a valid turn ("identify & analyze this card").
    if ((!text && !image) || thinking) return;
    // Been idle over an hour? Roll this into a fresh conversation (the old one
    // stays in History) so a day-old thread doesn't silently continue.
    const rollOver = messages.length > 0 && isChatStale();
    if (rollOver) {
      convIdRef.current = newConversationId();
      storeConvId(convIdRef.current);
    }
    const userMsg: Msg = {
      id: ++idRef.current,
      role: 'user',
      text,
      at: Date.now(),
      ...(image ? { image } : {}),
    };
    const history = [...(rollOver ? [] : messages), userMsg];
    setMessages(history);
    setInput('');
    setAttachment(null);
    setVerify(null);
    setThinking(true);
    touchActivity();

    const payload: ApiInsightsMessage[] = history.map(m => ({
      role: m.role,
      content: m.text,
      ...(m.image
        ? { images: [{ data: m.image.data, mediaType: m.image.mediaType }] }
        : {}),
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
        {
          id: asstId,
          role: 'assistant',
          text: '',
          tools: [],
          streaming: true,
          at: Date.now(),
        },
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
      // The valuation is code-computed and final the moment it arrives — show
      // it straight away instead of waiting on the model's prose. On a pricing
      // question this is what the user is actually waiting for.
      onValuation: valuation => {
        ensureMsg();
        patch({ valuation });
      },
      onDone: (toolCalls, valuation) => {
        applyDiveTool(toolCalls);
        applyVerifyTool(toolCalls);
        ensureMsg();
        patch({ streaming: false, ...(valuation ? { valuation } : {}) });
        setThinking(false);
      },
      onError: message => {
        ensureMsg();
        patch({ text: acc || `⚠️ ${message}`, streaming: false });
        setThinking(false);
      },
    }, convIdRef.current, depth);

    // The stream was cut before finishing (e.g. a proxy idle-timeout in prod).
    // The server keeps going regardless, so follow its run to the end rather
    // than re-asking — re-asking used to pay for the same answer twice.
    if (!completed) {
      ensureMsg();
      patch({ streaming: true });
      try {
        await followRun(
          convIdRef.current,
          (text, done, error) => {
            acc = text || acc;
            patch({
              text: error ? acc || `⚠️ ${error}` : acc,
              streaming: !done,
            });
          },
          () => mountedRef.current
        );
      } catch {
        patch({
          text: acc || '⚠️ The connection dropped. Please try again.',
          streaming: false,
        });
      }
    }
    setThinking(false);
    touchActivity(); // answer landed — reset the idle clock
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // Thumbs up/down on an answer — feeds the reliability flywheel (labeled data).
  const rate = (msgId: number, rating: 'up' | 'down') => {
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx === -1) return;
    const m = messages[idx];
    // The question is the nearest preceding user turn.
    let question = '';
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        question = messages[i].text;
        break;
      }
    }
    const next = m.feedback === rating ? undefined : rating;
    setMessages(list =>
      list.map(x => (x.id === msgId ? { ...x, feedback: next } : x))
    );
    if (!next) return; // toggled off — nothing to send
    void analyticsAPI
      .sendInsightsFeedback({
        rating,
        question,
        answer: m.text,
        subject: m.valuation?.subject ?? undefined,
        conversationId: convIdRef.current,
      })
      .catch(() => {
        /* best-effort */
      });
  };

  // Grow the composer to fit what's typed, up to COMPOSER_MAX_H then scroll.
  // Height must be reset to 'auto' first or scrollHeight only ever ratchets up
  // and the box can't shrink back when text is deleted or sent.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    // `height` is border-box here but scrollHeight excludes borders, so adding
    // them back is what stops the box landing a few px short and showing a
    // scrollbar over text that actually fits.
    const borders = ta.offsetHeight - ta.clientHeight;
    ta.style.height = `${Math.min(ta.scrollHeight + borders, COMPOSER_MAX_H)}px`;
    // `started` is a dep because switching states remounts the textarea.
  }, [input, attachment, started]);

  // Shared composer (input + attach + send) used in both states.
  const Composer = (
    <div className="space-y-2">
      {/* Pending photo preview (before send) */}
      {(attachment || attaching) && (
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-2">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-black/40">
            {attaching ? (
              <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <img
                src={attachment!.dataUrl}
                alt="Card to analyze"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <span className="flex-1 text-xs text-muted-foreground">
            {attaching
              ? 'Preparing photo…'
              : 'Photo attached — ask about this card, or say “make a report on this”.'}
          </span>
          {attachment && !attaching && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAttachment(null)}
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-white"
              aria-label="Remove photo"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      {/* One bordered shell holding the text and its controls, so the box
          grows as a single unit instead of buttons floating beside it. The
          border/focus ring live here, not on the textarea. */}
      <div className="rounded-xl border border-white/10 bg-black/40 p-2 ring-offset-background transition-colors focus-within:border-white/20 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => pickFile(e.target.files?.[0])}
        />
        <textarea
          ref={taRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            attachment
              ? 'Ask about this card…'
              : started
                ? 'Ask a follow-up…'
                : EXAMPLE_PROMPTS[phIndex]
          }
          className="block w-full resize-none overflow-y-auto bg-transparent px-1.5 py-1 text-sm leading-5 min-h-[28px] max-h-[152px] text-white placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="mt-1 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileRef.current?.click()}
            disabled={thinking || attaching}
            className="h-8 w-8 shrink-0 p-0 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Add a photo of a card"
            title="Add a photo — take one or upload"
          >
            <ImagePlus className="h-[18px] w-[18px]" />
          </Button>
          <Button
            onClick={() => send(input)}
            disabled={(!input.trim() && !attachment) || thinking}
            className="ml-auto h-8 w-8 shrink-0 p-0 bg-[#B4FF39] text-black hover:bg-[#a2e833] disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <DeepDivesPanel refreshSignal={deepRefresh} chatDive={chatDive} />
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 flex flex-col max-h-[72vh] overflow-hidden">
      {/* Header + toolbar — same mark-then-label shape as AI Market Reports. */}
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-1.5 shrink-0">
        {/* Decorative: the label beside it already names the panel. */}
        <img src="/cardy-icon.png" alt="" className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wide text-white/80">
          Cardy AI
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-white"
          >
            <History className="h-3.5 w-3.5" /> History
          </Button>
          <DepthSettings value={depth} onChange={setDepth} disabled={thinking} />
          {started && (
            <Button
              variant="ghost"
              size="sm"
              onClick={newChat}
              disabled={thinking}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> New chat
            </Button>
          )}
        </div>
      </div>
      {!started ? (
        /* ---------- Empty state: search-bar landing ---------- */
        <div className="overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col items-center text-center">
            <img src="/cardy-icon.png" alt="Cardy" className="h-14 w-14" />
            <h2 className="mt-4 text-xl sm:text-2xl font-semibold text-white">
              Ask Cardy
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
                  <div key={m.id} className="flex flex-col items-end">
                    {m.image && (
                      <img
                        src={m.image.dataUrl}
                        alt="Card"
                        className="mb-1.5 max-h-52 max-w-[70%] rounded-2xl rounded-br-sm border border-white/10 object-contain"
                      />
                    )}
                    {m.text && (
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#B4FF39] text-black px-3.5 py-2.5 text-sm">
                        {m.text}
                      </div>
                    )}
                    {m.at && (
                      <div className="mt-1 mr-1 text-[10px] text-muted-foreground">
                        {moment(m.at).format('MMM D, h:mm A')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div key={m.id} className="flex items-start gap-2.5">
                    <img
                      src="/cardy-icon.png"
                      alt="Cardy"
                      className="mt-0.5 h-7 w-7 shrink-0"
                    />
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
                      {/* Structured, code-computed valuation — the hero. */}
                      {m.valuation && <ChatValuationCard v={m.valuation} />}
                      {/* A tool is running but no text yet — keep it alive so it
                          doesn't look frozen (value_card can take 15-30s). */}
                      {m.streaming && !m.text && (
                        <WorkingStatus tools={m.tools} />
                      )}
                      {(m.text || (!m.streaming && !m.valuation)) && (
                        <div className="rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 text-white/90 px-3.5 py-2.5 text-sm leading-relaxed">
                          <ChatMarkdown text={m.text} />
                          {m.streaming && (
                            <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-[#B4FF39]/70" />
                          )}
                        </div>
                      )}
                      {!m.streaming && (m.text || m.valuation) && (
                        <div className="ml-1 flex items-center gap-2">
                          {m.at && (
                            <span className="text-[10px] text-muted-foreground">
                              {moment(m.at).format('MMM D, h:mm A')}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => rate(m.id, 'up')}
                            aria-label="Good answer"
                            className={`transition-colors ${
                              m.feedback === 'up'
                                ? 'text-[#B4FF39]'
                                : 'text-muted-foreground/50 hover:text-white/80'
                            }`}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => rate(m.id, 'down')}
                            aria-label="Bad answer"
                            className={`transition-colors ${
                              m.feedback === 'down'
                                ? 'text-red-400'
                                : 'text-muted-foreground/50 hover:text-white/80'
                            }`}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}
              {thinking && (
                <div className="flex items-start gap-2.5">
                  <img
                    src="/cardy-icon.png"
                    alt="Cardy"
                    className="mt-0.5 h-7 w-7 shrink-0"
                  />
                  <div className="rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 px-3.5 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              {verify && (
                <div className="flex items-start gap-2.5">
                  <img
                    src="/cardy-icon.png"
                    alt="Cardy"
                    className="mt-0.5 h-7 w-7 shrink-0"
                  />
                  <div className="w-full max-w-[85%]">
                    <CardConfirm
                      candidate={verify.candidate}
                      loading={verify.loading}
                      imageLoading={verify.imageLoading}
                      name={verify.name}
                      onNameChange={v =>
                        setVerify(cur => (cur ? { ...cur, name: v } : cur))
                      }
                      onConfirm={confirmVerify}
                      onReidentify={() => runIdentify(verify.name)}
                      onCancel={() => setVerify(null)}
                      confirmLabel="Confirm card"
                      busy={thinking}
                    />
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

      <AiDisclaimer />

      <InsightsHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onOpenConversation={openConversation}
      />
    </>
  );
};
