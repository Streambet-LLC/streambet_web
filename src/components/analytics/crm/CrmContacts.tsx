import { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Plus,
  Search,
  Star,
  Trash2,
  StickyNote,
  X,
  Send,
  Upload,
} from 'lucide-react';
import { crmAPI } from '@/integrations/api/client';
import type {
  ApiCrmContact,
  ApiCrmNote,
  CrmContactKind,
} from '@/types/analytics-api';
import { CrmImport } from './CrmImport';

const STAGES = ['new', 'contacted', 'negotiating', 'active', 'archived'];
const STAGE_STYLE: Record<string, string> = {
  new: 'border-white/15 bg-white/5 text-white/70',
  contacted: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  negotiating: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  active: 'border-[#B4FF39]/30 bg-[#B4FF39]/10 text-[#B4FF39]',
  archived: 'border-white/10 bg-black/30 text-white/40',
};

const splitList = (s: string): string[] =>
  s
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-white/70">
    {children}
  </span>
);

/**
 * The CRM's manual "human layer": a managed list of buyer OR seller contacts —
 * add, star (preferred), move through pipeline stages, tag, and keep a note
 * timeline. Reused for both the Buyers and Sellers tabs via the `kind` prop.
 */
export const CrmContacts = ({ kind }: { kind: CrmContactKind }) => {
  const noun = kind === 'buyer' ? 'buyer' : 'seller';
  const [rows, setRows] = useState<ApiCrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');
  const [preferredOnly, setPreferredOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notesFor, setNotesFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crmAPI.listContacts({
        kind,
        search: search.trim() || undefined,
        stage,
        preferred: preferredOnly || undefined,
      });
      setRows(data);
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, [kind, search, stage, preferredOnly]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const patch = async (id: string, p: Partial<ApiCrmContact>) => {
    // Optimistic — reflect the change immediately, then persist.
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...p } : r)));
    try {
      await crmAPI.updateContact(id, p as never);
    } catch {
      load();
    }
  };

  const remove = async (id: string) => {
    setRows(rs => rs.filter(r => r.id !== id));
    try {
      await crmAPI.deleteContact(id);
    } catch {
      load();
    }
  };

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
      {/* Header + controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize text-white">
            {noun}s
          </span>
          <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-xs text-muted-foreground">
            {rows.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${noun}s`}
              className="h-8 w-40 border-white/10 bg-black/40 pl-8 text-xs text-white placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={stage}
            onChange={e => setStage(e.target.value)}
            className="h-8 rounded-md border border-white/10 bg-black/40 px-2 text-xs text-white/80 outline-none"
          >
            <option value="all">All stages</option>
            {STAGES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setPreferredOnly(v => !v)}
            className={`flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition-colors ${
              preferredOnly
                ? 'border-[#B4FF39]/40 bg-[#B4FF39]/10 text-[#B4FF39]'
                : 'border-white/10 bg-black/40 text-white/60 hover:text-white'
            }`}
          >
            <Star className="h-3.5 w-3.5" /> Preferred
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImporting(v => !v)}
            className="h-8 gap-1.5 border-white/10 bg-black/40 text-xs text-white/80 hover:bg-white/5 hover:text-white"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button
            size="sm"
            onClick={() => setAdding(a => !a)}
            className="h-8 gap-1.5 bg-[#B4FF39] text-xs font-semibold text-black hover:bg-[#B4FF39]/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add {noun}
          </Button>
        </div>
      </div>

      {importing && (
        <CrmImport
          kind={kind}
          onClose={() => setImporting(false)}
          onImported={() => load()}
        />
      )}

      {adding && (
        <AddContactForm
          kind={kind}
          onClose={() => setAdding(false)}
          onCreated={c => {
            setRows(rs => [c, ...rs]);
            setAdding(false);
          }}
        />
      )}

      {loading && rows.length === 0 ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No {noun}s yet. Add one, or convert a lead from the Leads tab.
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map(c => (
            <div
              key={c.id}
              className="rounded-lg border border-white/8 bg-black/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => patch(c.id, { preferred: !c.preferred })}
                      title={c.preferred ? 'Unstar' : 'Mark preferred'}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          c.preferred
                            ? 'fill-[#B4FF39] text-[#B4FF39]'
                            : 'text-white/25 hover:text-white/50'
                        }`}
                      />
                    </button>
                    <span className="truncate font-medium text-white">
                      {c.name}
                    </span>
                    {c.source !== 'manual' && (
                      <span className="rounded border border-white/10 bg-black/40 px-1.5 text-[10px] uppercase text-white/40">
                        {c.source}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {c.handle && <span>@{c.handle.replace(/^@/, '')}</span>}
                    {c.email && <span>{c.email}</span>}
                    {c.company && <span>{c.company}</span>}
                    {c.location && <span>{c.location}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <select
                    value={STAGES.includes(c.stage) ? c.stage : 'new'}
                    onChange={e => patch(c.id, { stage: e.target.value })}
                    className={`h-7 rounded-full border px-2 text-[11px] capitalize outline-none ${
                      STAGE_STYLE[c.stage] ?? STAGE_STYLE.new
                    }`}
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s} className="bg-black text-white">
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setNotesFor(v => (v === c.id ? null : c.id))
                    }
                    title="Notes"
                    className={`flex h-7 w-7 items-center justify-center rounded-md border border-white/10 ${
                      notesFor === c.id
                        ? 'bg-white/10 text-white'
                        : 'bg-black/40 text-white/50 hover:text-white'
                    }`}
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    title="Delete"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-black/40 text-white/40 hover:border-red-500/30 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {((c.tags && c.tags.length > 0) ||
                (c.interests && c.interests.length > 0)) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(c.interests ?? []).map((t, i) => (
                    <span
                      key={`i${i}`}
                      className="rounded-full border border-[#B4FF39]/20 bg-[#B4FF39]/5 px-2 py-0.5 text-[11px] text-[#B4FF39]/80"
                    >
                      {t}
                    </span>
                  ))}
                  {(c.tags ?? []).map((t, i) => (
                    <Chip key={`t${i}`}>#{t}</Chip>
                  ))}
                </div>
              )}

              {notesFor === c.id && <NoteTimeline contactId={c.id} />}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// --- Add-contact inline form -------------------------------------------------

const AddContactForm = ({
  kind,
  onClose,
  onCreated,
}: {
  kind: CrmContactKind;
  onClose: () => void;
  onCreated: (c: ApiCrmContact) => void;
}) => {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [interests, setInterests] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const c = await crmAPI.createContact({
        kind,
        name: name.trim(),
        handle: handle.trim() || null,
        email: email.trim() || null,
        company: company.trim() || null,
        location: location.trim() || null,
        tags: splitList(tags),
        interests: splitList(interests),
      });
      onCreated(c);
    } catch {
      setSaving(false);
    }
  };

  const field =
    'h-8 border-white/10 bg-black/40 text-xs text-white placeholder:text-muted-foreground';

  return (
    <div className="mb-4 rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-white/80">
          New {kind}
        </span>
        <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input className={field} placeholder="Name *" value={name} onChange={e => setName(e.target.value)} />
        <Input className={field} placeholder="Handle (@username)" value={handle} onChange={e => setHandle(e.target.value)} />
        <Input className={field} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input className={field} placeholder="Company / shop" value={company} onChange={e => setCompany(e.target.value)} />
        <Input className={field} placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
        <Input className={field} placeholder="Interests (comma-separated)" value={interests} onChange={e => setInterests(e.target.value)} />
        <Input className={`${field} sm:col-span-2`} placeholder="Tags (comma-separated)" value={tags} onChange={e => setTags(e.target.value)} />
      </div>
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          disabled={!name.trim() || saving}
          onClick={submit}
          className="h-8 gap-1.5 bg-[#B4FF39] text-xs font-semibold text-black hover:bg-[#B4FF39]/90"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Save {kind}
        </Button>
      </div>
    </div>
  );
};

// --- Note timeline (shared by contacts + leads) ------------------------------

export const NoteTimeline = ({
  contactId,
  leadId,
}: {
  contactId?: string;
  leadId?: string;
}) => {
  const [notes, setNotes] = useState<ApiCrmNote[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNotes(await crmAPI.listNotes({ contactId, leadId }));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [contactId, leadId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!body.trim() || saving) return;
    setSaving(true);
    try {
      const n = await crmAPI.addNote({ contactId, leadId, body: body.trim() });
      setNotes(ns => [n, ...ns]);
      setBody('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <div className="flex items-start gap-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add();
          }}
          rows={2}
          placeholder="Add a note… (⌘/Ctrl+Enter)"
          className="min-h-[38px] flex-1 resize-y rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white placeholder:text-muted-foreground outline-none focus:border-white/20"
        />
        <Button
          size="sm"
          disabled={!body.trim() || saving}
          onClick={add}
          className="h-8 gap-1 bg-white/10 text-xs text-white hover:bg-white/20"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {loading ? (
        <div className="mt-2 text-[11px] text-muted-foreground">Loading notes…</div>
      ) : notes.length === 0 ? (
        <div className="mt-2 text-[11px] text-muted-foreground">No notes yet.</div>
      ) : (
        <div className="mt-2 space-y-1.5">
          {notes.map(n => (
            <div key={n.id} className="flex items-start justify-between gap-2 rounded-md bg-black/20 px-2.5 py-1.5">
              <p className="whitespace-pre-wrap text-xs text-white/80">{n.body}</p>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {moment(n.createdAt).fromNow()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
