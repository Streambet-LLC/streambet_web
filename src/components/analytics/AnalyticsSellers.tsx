import { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatUsd } from '@/utils/format';
import { analyticsAPI } from '@/integrations/api/client';
import type {

  ApiInventoryItemInput,
  ApiSellerInventoryDetail,
  ApiSellerInventoryUploadSummary,
  ApiSellerMatchedBuyer,
  SellerInventorySource,
} from '@/types/analytics-api';
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  ArrowUpRight,
  ArrowLeft,
  Trash2,
  Users,
  Package,
  Sparkles,
  ChevronDown,
  Link2,
  X,
} from 'lucide-react';

// ----- parsing -------------------------------------------------------------

interface Parsed {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  source: SellerInventorySource;
}

const aoaToRows = (
  headers: string[],
  body: string[][],
): Record<string, string>[] =>
  body
    .filter(r => r.some(c => String(c ?? '').trim() !== ''))
    .map(r => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = String(r[i] ?? '').trim();
      });
      return obj;
    });

const parseCsv = (file: File): Promise<Parsed> =>
  new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: res =>
        resolve({
          headers: (res.meta.fields ?? []).map(h => h.trim()),
          rows: res.data,
          fileName: file.name,
          source: 'csv',
        }),
      error: reject,
    });
  });

const parseExcel = async (file: File): Promise<Parsed> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    blankrows: false,
    defval: '',
  });
  const headers = (aoa[0] ?? []).map(h => String(h ?? '').trim());
  return {
    headers,
    rows: aoaToRows(headers, aoa.slice(1) as string[][]),
    fileName: file.name,
    source: 'excel',
  };
};

// ----- column mapping ------------------------------------------------------

type MapField =
  | 'productName'
  | 'sku'
  | 'setName'
  | 'condition'
  | 'grade'
  | 'quantity'
  | 'priceUsd';

const MAP_FIELDS: { key: MapField; label: string; required?: boolean }[] = [
  { key: 'productName', label: 'Product / card name', required: true },
  { key: 'sku', label: 'SKU / card #' },
  { key: 'setName', label: 'Set / edition' },
  { key: 'condition', label: 'Condition' },
  { key: 'grade', label: 'Grade' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'priceUsd', label: 'Price (USD)' },
];

const AUTO_MATCH: Record<MapField, RegExp> = {
  productName: /^(product|name|item|title|card|description|player)/i,
  sku: /sku|card\s*#|card\s*no|^id$|number/i,
  setName: /set|edition|series|release/i,
  condition: /condition|cond\b/i,
  grade: /grade|psa|bgs|cgc/i,
  quantity: /qty|quantity|count|stock|on\s*hand/i,
  priceUsd: /price|cost|value|msrp|ask|amount/i,
};

const autoMap = (headers: string[]): Record<MapField, string> => {
  const used = new Set<string>();
  const out = {} as Record<MapField, string>;
  for (const { key } of MAP_FIELDS) {
    const hit = headers.find(h => !used.has(h) && AUTO_MATCH[key].test(h));
    out[key] = hit ?? '';
    if (hit) used.add(hit);
  }
  return out;
};

const numOrUndef = (v: string | undefined): number | undefined => {
  if (!v) return undefined;
  const n = Number.parseFloat(v.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

// ----- small UI bits -------------------------------------------------------

const VOLUME_STYLES: Record<'High' | 'Medium' | 'Low', string> = {
  High: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Low: 'bg-white/5 text-white/60 border-white/10',
};

const Stat = ({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
}) => (
  <div className="rounded-xl border border-white/5 bg-black/30 p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {icon}
      {label}
    </div>
    <div
      className={`mt-1 text-2xl font-semibold ${accent ? 'text-[#B4FF39]' : 'text-white'}`}
    >
      {value}
    </div>
  </div>
);

const BuyerRow = ({ b }: { b: ApiSellerMatchedBuyer }) => {
  return (
    <div className="group w-full flex items-center gap-3 rounded-lg border border-white/5 bg-black/30 px-3 py-2.5 text-left">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {b.name || b.username || 'Unknown buyer'}
          </span>
          {b.volume && (
            <span
              className={`text-[10px] rounded px-1.5 py-0.5 border shrink-0 ${VOLUME_STYLES[b.volume]}`}
            >
              {b.volume}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {b.username ? `@${b.username}` : 'no account'}
          {b.location ? ` · ${b.location}` : ''}
          {b.email ? ` · ${b.email}` : ''}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold text-white">
          {formatUsd(b.lifetimeSpendUsd)}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {b.unitsBought} bought
        </div>
      </div>
    </div>
  );
};

// ----- main ----------------------------------------------------------------

type Stage = 'idle' | 'mapping' | 'busy' | 'results';

export const AnalyticsSellers = () => {
  const [stage, setStage] = useState<Stage>('idle');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Record<MapField, string>>(
    {} as Record<MapField, string>,
  );
  const [sellerLabel, setSellerLabel] = useState('');
  const [result, setResult] = useState<ApiSellerInventoryDetail | null>(null);
  const [uploads, setUploads] = useState<ApiSellerInventoryUploadSummary[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [googleUrl, setGoogleUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load prior uploads for the history list.
  const refreshUploads = () => {
    analyticsAPI
      .listSellerInventory()
      .then(setUploads)
      .catch(() => void 0);
  };
  useEffect(refreshUploads, []);

  const beginMapping = (p: Parsed) => {
    if (!p.headers.length || !p.rows.length) {
      toast.error('No rows found in that file.');
      return;
    }
    setParsed(p);
    setMapping(autoMap(p.headers));
    setStage('mapping');
  };

  const handleFile = async (file: File) => {
    try {
      const lower = file.name.toLowerCase();
      const p =
        lower.endsWith('.xlsx') || lower.endsWith('.xls')
          ? await parseExcel(file)
          : await parseCsv(file);
      beginMapping(p);
    } catch {
      toast.error('Could not parse that file.');
    }
  };

  const connectGoogle = async () => {
    try {
      const { url, configured } = await analyticsAPI.getGoogleAuthUrl();
      if (!configured) {
        toast.error(
          'Google integration is not configured yet (needs OAuth credentials).',
        );
        return;
      }
      window.open(url, '_blank', 'noopener');
      toast.info('Authorize in the new tab, then paste your Sheet link.');
    } catch {
      toast.error('Could not start Google connection.');
    }
  };

  const importGoogleSheet = async () => {
    if (!googleUrl.trim()) return;
    setStage('busy');
    try {
      const { title, rows } = await analyticsAPI.readGoogleSheet({
        url: googleUrl.trim(),
      });
      const headers = (rows[0] ?? []).map(h => String(h ?? '').trim());
      beginMapping({
        headers,
        rows: aoaToRows(headers, rows.slice(1)),
        fileName: title,
        source: 'google_sheets',
      });
    } catch (e) {
      setStage('idle');
      toast.error(
        e instanceof Error ? e.message : 'Could not read that Google Sheet.',
      );
    }
  };

  const itemsToIngest = useMemo<ApiInventoryItemInput[]>(() => {
    if (!parsed || !mapping.productName) return [];
    return parsed.rows
      .map(row => {
        const productName = (row[mapping.productName] ?? '').trim();
        if (!productName) return null;
        return {
          productName,
          sku: row[mapping.sku]?.trim() || undefined,
          setName: row[mapping.setName]?.trim() || undefined,
          condition: row[mapping.condition]?.trim() || undefined,
          grade: row[mapping.grade]?.trim() || undefined,
          quantity: numOrUndef(row[mapping.quantity]),
          priceUsd: numOrUndef(row[mapping.priceUsd]),
          raw: row,
        } as ApiInventoryItemInput;
      })
      .filter((x): x is ApiInventoryItemInput => x !== null);
  }, [parsed, mapping]);

  const runIngest = async () => {
    if (!parsed || !itemsToIngest.length) {
      toast.error('Map a product-name column with at least one row.');
      return;
    }
    setStage('busy');
    try {
      const detail = await analyticsAPI.ingestSellerInventory({
        source: parsed.source,
        fileName: parsed.fileName,

        sellerLabel: sellerLabel.trim() || undefined,
        items: itemsToIngest,
      });
      setResult(detail);
      setStage('results');
      refreshUploads();
      toast.success(
        `Matched ${detail.matchedBuyerCount} buyer${detail.matchedBuyerCount === 1 ? '' : 's'} across ${detail.matchedItemCount} item${detail.matchedItemCount === 1 ? '' : 's'}.`,
      );
    } catch (e) {
      setStage('mapping');
      toast.error(e instanceof Error ? e.message : 'Ingest failed.');
    }
  };

  const openUpload = async (id: string) => {
    setStage('busy');
    try {
      const detail = await analyticsAPI.getSellerInventory(id);
      setResult(detail);
      setStage('results');
    } catch {
      setStage('idle');
      toast.error('Could not load that upload.');
    }
  };

  const deleteUpload = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await analyticsAPI.deleteSellerInventory(id);
      setUploads(u => u.filter(x => x.id !== id));
      toast.success('Upload deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const reset = () => {
    setParsed(null);
    setResult(null);
    setSellerLabel('');
    setGoogleUrl('');
    setStage('idle');
    refreshUploads();
  };

  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ---------- render ----------

  if (stage === 'busy') {
    return (
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-16 flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#B4FF39]" />
      </Card>
    );
  }

  if (stage === 'results' && result) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-white -ml-2"
            onClick={reset}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> New upload
          </Button>
          <div className="text-sm text-muted-foreground truncate">
            {result.fileName}
            {result.sellerLabel ? ` · ${result.sellerLabel}` : ''}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat
            icon={<Package className="h-3.5 w-3.5" />}
            label="Inventory rows"
            value={result.rowCount.toLocaleString()}
          />
          <Stat
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Items with buyers"
            value={`${result.matchedItemCount} / ${result.rowCount}`}
          />
          <Stat
            icon={<Users className="h-3.5 w-3.5" />}
            label="Buyers matched"
            value={result.matchedBuyerCount.toLocaleString()}
            accent
          />
        </div>

        {/* De-duped buyer roster */}
        <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5">
          <div className="text-sm font-medium text-white mb-3">
            Matched buyers ({result.buyers.length})
          </div>
          {result.buyers.length ? (
            <div className="space-y-1.5">
              {result.buyers.map(b => (
                <BuyerRow key={b.userId} b={b} />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
              No collectIQ buyers matched this inventory yet.
            </div>
          )}
        </Card>

        {/* Per-item breakdown */}
        <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5">
          <div className="text-sm font-medium text-white mb-3">
            Inventory items ({result.items.length})
          </div>
          <div className="space-y-1.5">
            {result.items.map(it => {
              const open = expanded.has(it.id);
              return (
                <div
                  key={it.id}
                  className="rounded-lg border border-white/5 bg-black/30 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => it.matchedBuyerCount && toggleExpand(it.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${it.matchedBuyerCount ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">
                        {it.productName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[
                          it.setName,
                          it.condition,
                          it.grade,
                          it.quantity != null ? `qty ${it.quantity}` : null,
                          it.priceUsd != null ? formatUsd(it.priceUsd) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[11px] font-normal ${
                        it.matchedBuyerCount
                          ? 'border-[#B4FF39]/30 bg-[#B4FF39]/10 text-[#B4FF39]'
                          : 'border-white/10 bg-white/5 text-white/40'
                      }`}
                    >
                      {it.matchedBuyerCount} buyer
                      {it.matchedBuyerCount === 1 ? '' : 's'}
                    </Badge>
                    {it.matchedBuyerCount > 0 && (
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>
                  {open && (
                    <div className="px-3 pb-3 space-y-1.5 border-t border-white/5 pt-2">
                      {it.buyers.map(b => (
                        <BuyerRow key={b.userId} b={b} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  if (stage === 'mapping' && parsed) {
    return (
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-white">Map columns</div>
            <div className="text-xs text-muted-foreground truncate">
              {parsed.fileName} · {parsed.rows.length.toLocaleString()} rows
            </div>
          </div>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-white"
            onClick={reset}
          >
            Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MAP_FIELDS.map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                {f.label}
                {f.required && <span className="text-[#B4FF39]"> *</span>}
              </label>
              <Select
                value={mapping[f.key] || '__none__'}
                onValueChange={v =>
                  setMapping(m => ({ ...m, [f.key]: v === '__none__' ? '' : v }))
                }
              >
                <SelectTrigger className="bg-black/40 border-white/10">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— none —</SelectItem>
                  {parsed.headers.map(h => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Seller label (free text) */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Seller label (optional)
          </label>
          <Input
            value={sellerLabel}
            onChange={e => setSellerLabel(e.target.value)}
            placeholder="e.g. Joe's Cards, eBay store name…"
            className="bg-black/40 border-white/10"
          />
        </div>

        {/* Preview */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            Preview ({Math.min(parsed.rows.length, 5)} of{' '}
            {parsed.rows.length.toLocaleString()})
          </div>
          <div className="rounded-lg border border-white/5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-white/5">
                  {parsed.headers.map(h => (
                    <th key={h} className="px-3 py-2 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    {parsed.headers.map(h => (
                      <td
                        key={h}
                        className="px-3 py-2 text-white/80 whitespace-nowrap max-w-[220px] truncate"
                      >
                        {r[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-xs text-muted-foreground">
            {itemsToIngest.length.toLocaleString()} rows ready to match
          </div>
          <Button
            className="bg-[#B4FF39] text-black hover:bg-[#a2e833]"
            onClick={runIngest}
            disabled={!mapping.productName || !itemsToIngest.length}
          >
            <Sparkles className="h-4 w-4 mr-1.5" /> Match buyers
          </Button>
        </div>
      </Card>
    );
  }

  // ---- idle: upload + google + history ----
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* File upload */}
        <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5">
          <div className="text-sm font-medium text-white mb-1">
            Upload inventory
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            CSV or Excel (.xlsx). We'll match your products to collectIQ buyers.
          </p>
          <div
            onDragOver={e => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
              dragOver
                ? 'border-[#B4FF39]/50 bg-[#B4FF39]/5'
                : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
            }`}
          >
            <Upload className="h-7 w-7 text-muted-foreground" />
            <div className="text-sm text-white">Drop a file or click to browse</div>
            <div className="text-xs text-muted-foreground">.csv · .xlsx · .xls</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </Card>

        {/* Google Sheets */}
        <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5">
          <div className="text-sm font-medium text-white mb-1">
            Import from Google Sheets
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Connect Google, then paste a Sheet link to pull its rows.
          </p>
          <Button
            variant="outline"
            className="w-full border-white/10 bg-white/5 hover:bg-white/10 mb-3"
            onClick={connectGoogle}
          >
            <Link2 className="h-4 w-4 mr-2" /> Connect Google account
          </Button>
          <div className="flex items-center gap-2">
            <Input
              value={googleUrl}
              onChange={e => setGoogleUrl(e.target.value)}
              placeholder="Paste Google Sheets link…"
              className="bg-black/40 border-white/10"
            />
            <Button
              className="bg-[#B4FF39] text-black hover:bg-[#a2e833] shrink-0"
              onClick={importGoogleSheet}
              disabled={!googleUrl.trim()}
            >
              Import
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Requires Google OAuth credentials configured on the API.
          </p>
        </Card>
      </div>

      {/* History */}
      <Card className="bg-[rgba(22,22,22,1)] border-white/5 p-5">
        <div className="text-sm font-medium text-white mb-3">
          Recent uploads
        </div>
        {uploads.length ? (
          <div className="space-y-1.5">
            {uploads.map(u => (
              <div
                key={u.id}
                onClick={() => openUpload(u.id)}
                className="group flex items-center gap-3 rounded-lg border border-white/5 bg-black/30 px-3 py-2.5 cursor-pointer hover:bg-white/5 hover:border-white/10 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">
                    {u.fileName || 'Untitled'}
                    {u.sellerLabel ? ` · ${u.sellerLabel}` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {u.rowCount} rows · {u.matchedBuyerCount} buyers ·{' '}
                    {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] font-normal border-white/10 bg-white/5 text-white/50 uppercase"
                >
                  {u.source === 'google_sheets' ? 'sheets' : u.source}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-rose-300 opacity-0 group-hover:opacity-100"
                  onClick={e => deleteUpload(u.id, e)}
                  aria-label="Delete upload"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
            No uploads yet. Add a CSV, Excel file, or Google Sheet above.
          </div>
        )}
      </Card>
    </div>
  );
};
