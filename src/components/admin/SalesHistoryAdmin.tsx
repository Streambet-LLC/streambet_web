import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import TableLoader from '@/components/TableLoader';

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n || 0);

const fmtMonth = (iso: string) => {
  // The API returns each bucket as a UTC midnight on the 1st of the month
  // (e.g. "2026-04-01T00:00:00.000Z" = April 2026 in UTC). Formatting that
  // with the browser's LOCAL timezone shifts the label back a day for any
  // admin west of UTC, which made every row appear one month early. Always
  // format using UTC parts so the label matches the underlying bucket.
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PAGE_SIZE = 25;

/**
 * Admin Sales History panel.
 *
 * Top: monthly summary (last 12 months) — total revenue, crypto vs non-crypto
 * split, and order counts. Numbers come from `/admin/prizes/sales-summary`
 * and aggregate completed orders only (status IN paid/shipped/delivered).
 *
 * Bottom: paginated transactions table with date-range, payment-method, and
 * free-text search filters, backed by `/admin/prizes/sales-history`.
 */
export default function SalesHistoryAdmin() {
  // ── Filters (transactions) ─────────────────────────────────────────
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<
    'all' | 'crypto' | 'noncrypto'
  >('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ── Monthly summary ────────────────────────────────────────────────
  const summaryQuery = useQuery({
    queryKey: ['admin', 'sales-summary', 12],
    queryFn: () => api.admin.getSalesSummary({ months: 12 }),
  });

  const summary = summaryQuery.data;
  // API returns months in DESC order already; keep it that way for display.
  const months = useMemo(() => summary?.months ?? [], [summary]);
  const totals = summary?.totals;

  // ── Transactions list ──────────────────────────────────────────────
  const offset = (page - 1) * PAGE_SIZE;
  const txQuery = useQuery({
    queryKey: [
      'admin',
      'sales-history',
      { from, to, paymentMethod, search, page },
    ],
    queryFn: () =>
      api.admin.getSalesHistory({
        from: from || undefined,
        to: to || undefined,
        paymentMethod,
        q: search || undefined,
        range: `[${offset},${PAGE_SIZE}]`,
      }),
  });

  const txs = txQuery.data?.data ?? [];
  const total = txQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetFilters = () => {
    setFrom('');
    setTo('');
    setPaymentMethod('all');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* ─── Window totals ───────────────────────────────────────── */}
      <Card className="p-6 bg-[#0D0D0D] border-[#191D24]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Last 12 months</h2>
          {summaryQuery.isFetching && (
            <span className="text-xs text-muted-foreground">Refreshing…</span>
          )}
        </div>

        {summaryQuery.isError ? (
          <div className="text-sm text-red-400">
            Failed to load summary:{' '}
            {summaryQuery.error instanceof Error
              ? summaryQuery.error.message
              : 'Unknown error'}
          </div>
        ) : totals ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Stat
                label="Platform fees (estimated)"
                value={fmtUSD(totals.platformFees)}
                sub={`Crypto ${fmtUSD(
                  totals.cryptoPlatformFees,
                )} · Non-crypto ${fmtUSD(totals.nonCryptoPlatformFees)}`}
                highlight
              />
              <Stat
                label="Total revenue (GMV)"
                value={fmtUSD(totals.totalRevenue)}
              />
              <Stat
                label="Total orders"
                value={String(totals.orderCount)}
                sub="completed only"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <Stat
                label="Crypto revenue"
                value={fmtUSD(totals.cryptoRevenue)}
                sub={`${totals.cryptoOrderCount} orders`}
              />
              <Stat
                label="Non-crypto revenue"
                value={fmtUSD(totals.nonCryptoRevenue)}
                sub={`${totals.nonCryptoOrderCount} orders`}
              />
            </div>
            {summary?.feeAssumptions && (
              <p className="text-xs text-muted-foreground">
                Fee estimate uses{' '}
                {summary.feeAssumptions.nonCryptoBuyerFeePercent}% buyer +{' '}
                {summary.feeAssumptions.nonCryptoSellerFeePercent}% seller on
                non-crypto subtotals, and{' '}
                {(summary.feeAssumptions.cryptoCombinedBps / 100).toFixed(2)}%
                combined on crypto totals. Per-seller overrides are not
                applied.
              </p>
            )}
          </div>
        ) : (
          <TableLoader label="Loading summary…" />
        )}
      </Card>

      {/* ─── Monthly breakdown ─────────────────────────────────────── */}
      <Card className="p-0 bg-[#0D0D0D] border-[#191D24]">
        <div className="px-6 py-4 border-b border-[#191D24]">
          <h2 className="text-lg font-medium">Monthly breakdown</h2>
          <p className="text-xs text-muted-foreground">
            Revenue is gross merchandise value (USD). Includes only orders in
            paid / shipped / delivered status.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Total revenue</TableHead>
                <TableHead className="text-right">Crypto</TableHead>
                <TableHead className="text-right">Non-crypto</TableHead>
                <TableHead className="text-right">Platform fees</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Crypto orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.length === 0 && !summaryQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-6"
                  >
                    No sales data yet
                  </TableCell>
                </TableRow>
              ) : (
                months.map(m => (
                  <TableRow key={m.month}>
                    <TableCell>{fmtMonth(m.month)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {fmtUSD(m.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtUSD(m.cryptoRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtUSD(m.nonCryptoRevenue)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-300 font-medium">
                      {fmtUSD(m.platformFees)}
                    </TableCell>
                    <TableCell className="text-right">{m.orderCount}</TableCell>
                    <TableCell className="text-right">
                      {m.cryptoOrderCount}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ─── Transactions ─────────────────────────────────────────── */}
      <Card className="p-0 bg-[#0D0D0D] border-[#191D24]">
        <div className="px-6 py-4 border-b border-[#191D24] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Transactions</h2>
            <span className="text-xs text-muted-foreground">
              {total.toLocaleString()} matching
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={from}
                onChange={e => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={to}
                onChange={e => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Payment method
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={v => {
                  setPaymentMethod(v as typeof paymentMethod);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="crypto">Crypto (USDC)</SelectItem>
                  <SelectItem value="noncrypto">Non-crypto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Input
                placeholder="Item, buyer, seller…"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline justify-self-start md:justify-self-end"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {txQuery.isLoading ? (
            <TableLoader label="Loading transactions…" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total (USD)</TableHead>
                  <TableHead>Tx</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-6"
                    >
                      No transactions match these filters
                    </TableCell>
                  </TableRow>
                ) : (
                  txs.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(t.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        {t.itemName}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{t.buyerUsername}</span>
                          {t.buyerEmail && (
                            <span className="text-xs text-muted-foreground">
                              {t.buyerEmail}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{t.sellerUsername}</TableCell>
                      <TableCell>
                        <PaymentBadge method={t.paymentMethod} />
                      </TableCell>
                      <TableCell className="capitalize">{t.status}</TableCell>
                      <TableCell className="text-right font-medium">
                        {fmtUSD(t.totalPrice)}
                      </TableCell>
                      <TableCell>
                        {t.cryptoTxSignature ? (
                          <a
                            href={`https://solscan.io/tx/${t.cryptoTxSignature}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-400 hover:underline"
                          >
                            {t.cryptoTxSignature.slice(0, 8)}…
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#191D24]">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    aria-disabled={page <= 1}
                    className={
                      page <= 1 ? 'pointer-events-none opacity-50' : ''
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    aria-disabled={page >= totalPages}
                    className={
                      page >= totalPages
                        ? 'pointer-events-none opacity-50'
                        : ''
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-md border ${
        highlight
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-[#15191F] border-[#191D24]'
      }`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-xl font-semibold mt-1 ${
          highlight ? 'text-emerald-300' : ''
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
      )}
    </div>
  );
}

function PaymentBadge({
  method,
}: {
  method: 'coins' | 'usd' | 'combined' | 'crypto';
}) {
  const styles: Record<typeof method, string> = {
    crypto: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    usd: 'bg-green-500/20 text-green-300 border-green-500/30',
    coins: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    combined: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };
  const label =
    method === 'crypto'
      ? 'USDC'
      : method === 'usd'
        ? 'USD'
        : method === 'coins'
          ? 'Coins'
          : 'Combined';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${styles[method]}`}
    >
      {label}
    </span>
  );
}
