import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  ChevronDown,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  Layers,
  FlaskConical,
} from 'lucide-react';
import { marketTaxonomyAPI } from '@/integrations/api/client';
import type { ApiTaxonomyNode, ApiTaxonomyTags } from '@/types/analytics-api';

const KIND_META: Record<string, { label: string; color: string }> = {
  market: { label: 'Market', color: '#B4FF39' },
  subcategory: { label: 'Sub-cat', color: '#60a5fa' },
  set: { label: 'Set', color: '#fbbf24' },
  player: { label: 'Player', color: '#f472b6' },
  card: { label: 'Card', color: '#a78bfa' },
};

const MARKET_OPTIONS = ['pokemon', 'one_piece', 'sports', 'magic', 'lorcana'];
const KIND_OPTIONS = ['subcategory', 'set', 'player', 'card'];

const KindBadge = ({ kind }: { kind: string }) => {
  const m = KIND_META[kind] ?? { label: kind, color: '#9ca3af' };
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide"
      style={{ color: m.color, background: `${m.color}1a` }}
    >
      {m.label}
    </span>
  );
};

/** Inline edit form for a single node's label / match terms / query. */
const NodeEditForm = ({
  node,
  onSaved,
  onCancel,
}: {
  node: ApiTaxonomyNode;
  onSaved: () => void;
  onCancel: () => void;
}) => {
  const [label, setLabel] = useState(node.label);
  const [terms, setTerms] = useState((node.matchTerms ?? []).join(', '));
  const [query, setQuery] = useState(node.query ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await marketTaxonomyAPI.updateNode(node.key, {
        label: label.trim() || node.label,
        matchTerms: terms
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        query: query.trim() || null,
      });
      toast.success(`Updated ${node.label}`);
      onSaved();
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-white/25';

  return (
    <div className="flex-1 space-y-1.5">
      <input className={inputCls} value={label} onChange={e => setLabel(e.target.value)} placeholder="Label" />
      <input
        className={inputCls}
        value={terms}
        onChange={e => setTerms(e.target.value)}
        placeholder="match terms, comma-separated"
      />
      <input
        className={inputCls}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="eBay query (blank = not snapshotted)"
      />
      <div className="flex gap-1.5">
        <Button size="sm" onClick={save} disabled={saving} className="h-7 gap-1 bg-[#B4FF39] text-xs text-black hover:bg-[#a3ee28]">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 gap-1 text-xs text-white/60 hover:text-white">
          <X className="h-3 w-3" /> Cancel
        </Button>
      </div>
    </div>
  );
};

/** Recursive tree row. */
const TreeNode = ({
  node,
  depth,
  onChanged,
}: {
  node: ApiTaxonomyNode;
  depth: number;
  onChanged: () => void;
}) => {
  const [open, setOpen] = useState(depth < 1);
  const [editing, setEditing] = useState(false);
  const hasChildren = !!node.children?.length;

  const remove = async () => {
    if (!window.confirm(`Delete "${node.label}"?`)) return;
    try {
      await marketTaxonomyAPI.deleteNode(node.key);
      toast.success(`Deleted ${node.label}`);
      onChanged();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Delete failed (node may have children)';
      toast.error(msg);
    }
  };

  return (
    <div>
      <div
        className="group flex items-start gap-2 rounded px-1.5 py-1 hover:bg-white/[0.03]"
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        {hasChildren ? (
          <button type="button" onClick={() => setOpen(o => !o)} className="mt-0.5 text-white/40 hover:text-white">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {editing ? (
          <NodeEditForm node={node} onSaved={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />
        ) : (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <KindBadge kind={node.kind} />
            <span className="font-medium text-white">{node.label}</span>
            {node.curated && (
              <span className="rounded bg-white/5 px-1 text-[9px] text-white/40" title="Hand-curated — preserved on re-seed">
                curated
              </span>
            )}
            {(node.matchTerms ?? []).slice(0, 5).map(t => (
              <span key={t} className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white/45">
                {t}
              </span>
            ))}
            {node.query && (
              <span className="text-[10px] italic text-white/30">“{node.query}”</span>
            )}
            <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button type="button" onClick={() => setEditing(true)} className="rounded p-1 text-white/40 hover:text-[#B4FF39]" title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={remove} className="rounded p-1 text-white/40 hover:text-red-400" title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        )}
      </div>

      {open &&
        node.children?.map(c => (
          <TreeNode key={c.key} node={c} depth={depth + 1} onChanged={onChanged} />
        ))}
    </div>
  );
};

/** Add-node form. */
const AddNodeForm = ({ onAdded }: { onAdded: () => void }) => {
  const [rootMarket, setRootMarket] = useState('pokemon');
  const [kind, setKind] = useState<ApiTaxonomyNode['kind']>('player');
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [terms, setTerms] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!key.trim() || !label.trim()) {
      toast.error('Key and label are required');
      return;
    }
    setSaving(true);
    try {
      await marketTaxonomyAPI.createNode({
        key: key.trim(),
        kind,
        rootMarket,
        parentKey: rootMarket, // default: hang under the market root
        label: label.trim(),
        matchTerms: terms.split(',').map(t => t.trim()).filter(Boolean),
        query: query.trim() || undefined,
        heatScope: kind === 'set' ? 'set' : kind === 'player' ? 'player' : kind === 'card' ? 'card' : undefined,
      });
      toast.success(`Added ${label}`);
      setKey(''); setLabel(''); setTerms(''); setQuery('');
      onAdded();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Create failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const cls =
    'rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-white/25';

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-white/8 bg-black/20 p-3 sm:grid-cols-3">
      <select value={rootMarket} onChange={e => setRootMarket(e.target.value)} className={cls}>
        {MARKET_OPTIONS.map(m => <option key={m} value={m} className="bg-[#161616]">{m}</option>)}
      </select>
      <select value={kind} onChange={e => setKind(e.target.value as ApiTaxonomyNode['kind'])} className={cls}>
        {KIND_OPTIONS.map(k => <option key={k} value={k} className="bg-[#161616]">{k}</option>)}
      </select>
      <input className={cls} value={key} onChange={e => setKey(e.target.value)} placeholder="key (unique slug)" />
      <input className={cls} value={label} onChange={e => setLabel(e.target.value)} placeholder="label" />
      <input className={cls} value={terms} onChange={e => setTerms(e.target.value)} placeholder="match terms, comma" />
      <input className={cls} value={query} onChange={e => setQuery(e.target.value)} placeholder="eBay query (optional)" />
      <Button size="sm" onClick={submit} disabled={saving} className="col-span-2 h-8 gap-1 bg-[#B4FF39] text-xs text-black hover:bg-[#a3ee28] sm:col-span-3">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add node
      </Button>
    </div>
  );
};

/** Classify tester — type a card name, see how it auto-tags. */
const ClassifyTester = () => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [result, setResult] = useState<ApiTaxonomyTags | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      setResult(await marketTaxonomyAPI.classify(name.trim(), brand.trim() || undefined));
    } catch {
      toast.error('Classify failed');
    } finally {
      setBusy(false);
    }
  };

  const cls =
    'rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-white/25';

  return (
    <div className="rounded-lg border border-white/8 bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-white/70">
        <FlaskConical className="h-3.5 w-3.5 text-[#B4FF39]" /> Auto-tag tester
      </div>
      <div className="flex flex-wrap gap-2">
        <input className={`${cls} min-w-[200px] flex-1`} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} placeholder='e.g. "Charizard VMAX Alt Art PSA 10"' />
        <input className={`${cls} w-28`} value={brand} onChange={e => setBrand(e.target.value)} placeholder="brand (opt)" />
        <Button size="sm" onClick={run} disabled={busy} className="h-8 border-white/10 bg-black/40 text-xs text-white/80 hover:bg-white/5" variant="outline">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Classify'}
        </Button>
      </div>
      {result && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          {(['marketKey', 'subCategoryKey', 'setKey', 'playerKey', 'cardKey'] as const).map(k => (
            <span key={k} className="text-muted-foreground">
              {k.replace('Key', '')}:{' '}
              <span className={result[k] ? 'text-[#B4FF39]' : 'text-white/30'}>{result[k] ?? '—'}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Market taxonomy curation — the market → sub-category → set → player/card
 * backbone that every heat & engagement metric slices by. Auto-seeded; edit
 * here. Edits are pinned (survive re-seeds).
 */
export const MarketTaxonomyPanel = () => {
  const [tree, setTree] = useState<ApiTaxonomyNode[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        marketTaxonomyAPI.tree(),
        marketTaxonomyAPI.stats().catch(() => ({})),
      ]);
      setTree(t);
      setStats(s);
    } catch {
      /* keep last known */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reseed = async () => {
    setSeeding(true);
    try {
      const r = await marketTaxonomyAPI.seed();
      toast.success(`Seeded defaults — ${r.total} nodes total`);
      await load();
    } catch {
      toast.error('Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#B4FF39]" />
          <span className="text-sm font-medium text-white">Market taxonomy</span>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            market → sub-category → set → player/card — every metric slices by this
          </span>
        </div>
        <div className="flex items-center gap-2">
          {stats.total != null && (
            <span className="text-[11px] text-muted-foreground">
              {stats.total} nodes · {stats.set ?? 0} sets · {stats.player ?? 0} players
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowAdd(s => !s)} className="h-8 gap-1.5 border-white/10 bg-black/40 text-xs text-white/80 hover:bg-white/5">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
          <Button variant="outline" size="sm" onClick={reseed} disabled={seeding} className="h-8 gap-1.5 border-white/10 bg-black/40 text-xs text-white/80 hover:bg-white/5">
            {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Re-seed defaults
          </Button>
        </div>
      </div>

      {showAdd && <AddNodeForm onAdded={load} />}

      <div className="my-3">
        <ClassifyTester />
      </div>

      {loading && tree.length === 0 ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading taxonomy…
        </div>
      ) : tree.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No taxonomy yet — hit "Re-seed defaults" to build the starting tree.
        </div>
      ) : (
        <div className="max-h-[560px] space-y-0.5 overflow-y-auto pr-1 text-xs">
          {tree.map(n => (
            <TreeNode key={n.key} node={n} depth={0} onChanged={load} />
          ))}
        </div>
      )}
    </Card>
  );
};
