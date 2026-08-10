import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  Link2,
  X,
  Check,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { analyticsAPI, crmAPI } from '@/integrations/api/client';
import type { ApiCrmContactInput, CrmContactKind } from '@/types/analytics-api';

type FieldKey =
  | 'name'
  | 'handle'
  | 'email'
  | 'company'
  | 'location'
  | 'interests'
  | 'tags';

const FIELDS: { key: FieldKey; label: string; required?: boolean; kw: string[] }[] = [
  { key: 'name', label: 'Name', required: true, kw: ['name', 'contact', 'full'] },
  { key: 'handle', label: 'Handle / username', kw: ['handle', 'username', 'user', 'social', 'reddit', 'instagram', 'twitter', 'ig', 'discord'] },
  { key: 'email', label: 'Email', kw: ['email', 'e-mail', 'mail'] },
  { key: 'company', label: 'Company / shop', kw: ['company', 'shop', 'store', 'business', 'org'] },
  { key: 'location', label: 'Location', kw: ['location', 'city', 'state', 'country', 'region', 'address', 'area'] },
  { key: 'interests', label: 'Interests', kw: ['interest', 'card', 'categor', 'want', 'looking', 'collect', 'player', 'set'] },
  { key: 'tags', label: 'Tags', kw: ['tag', 'label', 'note', 'source'] },
];

const splitList = (s: string): string[] =>
  s
    .split(/[,;|]/)
    .map(x => x.trim())
    .filter(Boolean);

const autoMap = (headers: string[]): Record<FieldKey, number> => {
  const map = {} as Record<FieldKey, number>;
  const used = new Set<number>();
  for (const f of FIELDS) {
    let idx = -1;
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue;
      const h = headers[i].toLowerCase();
      if (f.kw.some(k => h.includes(k))) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) used.add(idx);
    map[f.key] = idx;
  }
  return map;
};

// --- Downloadable template (headers match autoMap, so a filled-in template
//     imports with zero manual mapping) ----------------------------------------

const TEMPLATE_HEADERS = [
  'Name',
  'Handle',
  'Email',
  'Company',
  'Location',
  'Interests',
  'Tags',
];

const templateRows = (kind: CrmContactKind): string[][] =>
  kind === 'seller'
    ? [
        ['Card Shop Co', '@cardshopco', 'sales@cardshopco.com', 'Card Shop Co', 'Dallas, TX', 'Sports; Basketball; Vintage', 'wholesale; preferred'],
        ['Jane Collector', 'u/janecards', 'jane@example.com', '', 'Austin, TX', 'Pokemon; Sealed', 'local'],
      ]
    : [
        ['Ash K', 'u/ashk', 'ash@example.com', '', 'Pallet Town', 'Pokemon; Charizard; PSA 10', 'vip; high-budget'],
        ['Mike Buyer', '@mikebuys', 'mike@example.com', "Mike's Cards", 'Chicago, IL', 'Sports; Football', 'repeat'],
      ];

const csvCell = (v: unknown): string => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

const downloadBlob = (content: BlobPart, filename: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadCsvTemplate = (kind: CrmContactKind) => {
  const rows = [TEMPLATE_HEADERS, ...templateRows(kind)];
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  downloadBlob(
    '﻿' + csv, // BOM so Excel opens UTF-8 cleanly
    `cardcade-${kind}s-template.csv`,
    'text/csv;charset=utf-8;'
  );
};

const downloadXlsxTemplate = async (kind: CrmContactKind) => {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...templateRows(kind)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${kind}s`);
  XLSX.writeFile(wb, `cardcade-${kind}s-template.xlsx`);
};

/**
 * Bulk-import buyer/seller contacts from an Excel/CSV upload or a connected
 * Google Sheet. Parses client-side, auto-maps columns to CRM fields (with
 * manual override), previews, then posts normalized rows to the import
 * endpoint (which de-dupes within the kind).
 */
export const CrmImport = ({
  kind,
  onClose,
  onImported,
}: {
  kind: CrmContactKind;
  onClose: () => void;
  onImported: (created: number) => void;
}) => {
  const [mode, setMode] = useState<'upload' | 'google'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, number>>(
    {} as Record<FieldKey, number>
  );
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const ingestRows = useCallback((rows: string[][], label: string) => {
    const clean = rows.filter(r => r.some(c => String(c ?? '').trim()));
    if (clean.length < 2) {
      setError('That sheet needs a header row and at least one data row.');
      return;
    }
    const hdrs = clean[0].map(c => String(c ?? '').trim());
    setHeaders(hdrs);
    setDataRows(clean.slice(1));
    setMapping(autoMap(hdrs));
    setFileName(label);
    setError(null);
  }, []);

  const onFile = async (file: File) => {
    setParsing(true);
    setError(null);
    setResult(null);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
        header: 1,
        blankrows: false,
        defval: '',
      });
      ingestRows(rows as string[][], file.name);
    } catch {
      setError('Could not read that file. Use .xlsx, .xls or .csv.');
    } finally {
      setParsing(false);
    }
  };

  const buildContacts = (): ApiCrmContactInput[] =>
    dataRows
      .map(row => {
        const get = (k: FieldKey) => {
          const i = mapping[k];
          return i >= 0 ? String(row[i] ?? '').trim() : '';
        };
        const name = get('name');
        if (!name) return null;
        return {
          kind,
          name,
          handle: get('handle') || null,
          email: get('email') || null,
          company: get('company') || null,
          location: get('location') || null,
          interests: splitList(get('interests')),
          tags: splitList(get('tags')),
          source: 'import',
        } as ApiCrmContactInput;
      })
      .filter((c): c is ApiCrmContactInput => c !== null);

  const doImport = async () => {
    if (mapping.name < 0 || importing) return;
    const contacts = buildContacts();
    if (contacts.length === 0) {
      setError('No rows have a mapped Name value.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const r = await crmAPI.importContacts(kind, contacts);
      setResult({ created: r.created, skipped: r.skipped });
      onImported(r.created);
    } catch {
      setError('Import failed. Check the mapping and try again.');
    } finally {
      setImporting(false);
    }
  };

  const preview = dataRows.slice(0, 4);
  const mappedCount = buildContacts().length;

  return (
    <div className="mb-4 rounded-lg border border-white/10 bg-black/30 p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-white">
          Import {kind}s from a sheet
        </span>
        <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {result ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-[#B4FF39]" />
          <div className="text-sm text-white">
            Imported <span className="font-semibold text-[#B4FF39]">{result.created}</span>{' '}
            {kind}
            {result.created === 1 ? '' : 's'}
            {result.skipped > 0 && (
              <span className="text-muted-foreground">
                {' '}· skipped {result.skipped} (duplicate or unnamed)
              </span>
            )}
          </div>
          <Button size="sm" onClick={onClose} className="mt-1 h-8 bg-white/10 text-xs text-white hover:bg-white/20">
            Done
          </Button>
        </div>
      ) : (
        <>
          {/* Template download — headers match our auto-mapping */}
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-white/8 bg-black/20 px-3 py-2 text-xs text-muted-foreground">
            <Download className="h-3.5 w-3.5 text-[#B4FF39]/70" />
            <span>Match your columns to our template:</span>
            <button
              type="button"
              onClick={() => downloadCsvTemplate(kind)}
              className="font-medium text-[#B4FF39] hover:underline"
            >
              CSV
            </button>
            <span className="text-white/20">·</span>
            <button
              type="button"
              onClick={() => downloadXlsxTemplate(kind)}
              className="font-medium text-[#B4FF39] hover:underline"
            >
              Excel
            </button>
          </div>

          {/* Source tabs */}
          <div className="mb-3 inline-flex rounded-md border border-white/10 bg-black/40 p-0.5">
            {(
              [
                { k: 'upload', label: 'Upload file', icon: Upload },
                { k: 'google', label: 'Google Sheet', icon: Link2 },
              ] as const
            ).map(t => (
              <button
                key={t.k}
                type="button"
                onClick={() => setMode(t.k)}
                className={`flex h-8 items-center gap-1.5 rounded px-3 text-xs transition-colors ${
                  mode === t.k ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'
                }`}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {mode === 'upload' ? (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/20 px-4 py-6 text-center hover:border-[#B4FF39]/40">
              <FileSpreadsheet className="h-6 w-6 text-[#B4FF39]/70" />
              <span className="text-sm text-white/80">
                {fileName || 'Choose an Excel or CSV file'}
              </span>
              <span className="text-[11px] text-muted-foreground">.xlsx, .xls, .csv</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>
          ) : (
            <GoogleSheetSource onRows={ingestRows} />
          )}

          {parsing && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading…
            </div>
          )}

          {/* Column mapping + preview */}
          {headers.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Map columns ({dataRows.length} rows)
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FIELDS.map(f => (
                  <div key={f.key} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 text-xs text-white/70">
                      {f.label}
                      {f.required && <span className="text-[#B4FF39]"> *</span>}
                    </span>
                    <select
                      value={mapping[f.key] ?? -1}
                      onChange={e =>
                        setMapping(m => ({ ...m, [f.key]: Number(e.target.value) }))
                      }
                      className="h-8 flex-1 rounded-md border border-white/10 bg-black/40 px-2 text-xs text-white/80 outline-none"
                    >
                      <option value={-1}>— none —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="overflow-x-auto rounded-lg border border-white/8">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-white/10 text-muted-foreground">
                      {FIELDS.filter(f => mapping[f.key] >= 0).map(f => (
                        <th key={f.key} className="px-2 py-1.5 font-medium capitalize">
                          {f.key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, ri) => (
                      <tr key={ri} className="border-b border-white/5 text-white/70">
                        {FIELDS.filter(f => mapping[f.key] >= 0).map(f => (
                          <td key={f.key} className="max-w-[160px] truncate px-2 py-1.5">
                            {String(row[mapping[f.key]] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {mappedCount} {kind}
                  {mappedCount === 1 ? '' : 's'} ready to import
                  {mapping.name < 0 && (
                    <span className="text-amber-300"> · map a Name column first</span>
                  )}
                  {mappedCount > 5000 && (
                    <span className="text-amber-300"> · only the first 5,000 will import</span>
                  )}
                </span>
                <Button
                  size="sm"
                  disabled={mapping.name < 0 || mappedCount === 0 || importing}
                  onClick={doImport}
                  className="h-8 gap-1.5 bg-[#B4FF39] text-xs font-semibold text-black hover:bg-[#B4FF39]/90"
                >
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Import {mappedCount} {kind}
                  {mappedCount === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- Google Sheet source ----------------------------------------------------

const GoogleSheetSource = ({
  onRows,
}: {
  onRows: (rows: string[][], label: string) => void;
}) => {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [authUrl, setAuthUrl] = useState('');
  const [code, setCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [url, setUrl] = useState('');
  const [reading, setReading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await analyticsAPI.getGoogleAuthUrl();
        setConfigured(r.configured);
        setAuthUrl(r.url);
      } catch {
        setConfigured(false);
      }
    })();
  }, []);

  const connect = async () => {
    if (!code.trim() || connecting) return;
    setConnecting(true);
    setErr(null);
    try {
      const r = await analyticsAPI.exchangeGoogleCode(code.trim());
      setConnected(r.connected);
      if (!r.connected) setErr('Could not connect — check the code and retry.');
    } catch {
      setErr('Connection failed.');
    } finally {
      setConnecting(false);
    }
  };

  const read = async () => {
    if (!url.trim() || reading) return;
    setReading(true);
    setErr(null);
    try {
      const r = await analyticsAPI.readGoogleSheet({ url: url.trim() });
      onRows(r.rows, r.title || 'Google Sheet');
    } catch {
      setErr('Could not read that sheet. Make sure you connected Google above and the sheet is shared with that account.');
    } finally {
      setReading(false);
    }
  };

  if (configured === null)
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking Google connection…
      </div>
    );

  if (!configured)
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-4 text-xs text-muted-foreground">
        Google Sheets isn't configured on the server (needs GOOGLE_CLIENT_ID /
        GOOGLE_CLIENT_SECRET / GOOGLE_OAUTH_REDIRECT_URI). Use file upload
        instead, or ask an admin to set those.
      </div>
    );

  return (
    <div className="space-y-3">
      {!connected && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-white/70">
            1. Connect a Google account
          </div>
          <a
            href={authUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-[#B4FF39] hover:underline"
          >
            Open Google consent <Link2 className="h-3 w-3" />
          </a>
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Paste the code from the redirect"
              className="h-8 flex-1 border-white/10 bg-black/40 text-xs text-white placeholder:text-muted-foreground"
            />
            <Button
              size="sm"
              disabled={!code.trim() || connecting}
              onClick={connect}
              className="h-8 bg-white/10 text-xs text-white hover:bg-white/20"
            >
              {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect'}
            </Button>
          </div>
        </div>
      )}
      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="flex items-center gap-1.5 text-xs text-white/70">
          {connected && <Check className="h-3.5 w-3.5 text-[#B4FF39]" />}
          {connected ? '2. Read a sheet' : 'Read a sheet (once connected)'}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Paste a Google Sheet URL"
            className="h-8 flex-1 border-white/10 bg-black/40 text-xs text-white placeholder:text-muted-foreground"
          />
          <Button
            size="sm"
            disabled={!url.trim() || reading}
            onClick={read}
            className="h-8 bg-[#B4FF39] text-xs font-semibold text-black hover:bg-[#B4FF39]/90"
          >
            {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Read'}
          </Button>
        </div>
      </div>
      {err && (
        <div className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {err}
        </div>
      )}
    </div>
  );
};
