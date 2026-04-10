import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { handleMutationError } from '@/lib/mutationHelpers';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Plus, Edit } from 'lucide-react';

// ── Types ──

interface DiscountCode {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed_amount';
  discountPercent?: number;
  discountAmountCents?: number;
  usageType: 'per_account' | 'single_use';
  maxUses?: number | null;
  timesUsed: number;
  isActive: boolean;
  scope: 'cart' | 'cheapest_item';
  expiresAt?: string | null;
  createdAt: string;
}

interface FormState {
  code: string;
  discountType: 'percent' | 'fixed_amount';
  discountPercent: string;
  discountAmountCents: string;
  usageType: 'per_account' | 'single_use';
  maxUses: string;
  scope: 'cart' | 'cheapest_item';
  isActive: boolean;
  expiresAt: string;
}

const EMPTY_FORM: FormState = {
  code: '',
  discountType: 'percent',
  discountPercent: '',
  discountAmountCents: '',
  usageType: 'per_account',
  maxUses: '',
  scope: 'cart',
  isActive: true,
  expiresAt: '',
};

// ── Helpers ──

function formatDiscount(dc: DiscountCode): string {
  if (dc.discountType === 'percent' && dc.discountPercent) {
    return `${Number(dc.discountPercent)}%`;
  }
  if (dc.discountType === 'fixed_amount' && dc.discountAmountCents) {
    return `$${(dc.discountAmountCents / 100).toFixed(2)}`;
  }
  return '—';
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toLocalDatetimeString(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Component ──

export const DiscountCodesPanel = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Fetch
  const { data: discountCodes, isLoading } = useQuery<DiscountCode[]>({
    queryKey: ['admin', 'discount-codes'],
    queryFn: async () => {
      const res = await api.admin.getDiscountCodes();
      return res.data;
    },
  });

  // Create
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.admin.createDiscountCode>[0]) =>
      api.admin.createDiscountCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'discount-codes'] });
      toast({ title: 'Discount code created' });
      closeDialog();
    },
    onError: err => handleMutationError(err, 'Failed to create discount code'),
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof api.admin.updateDiscountCode>[1];
    }) => api.admin.updateDiscountCode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'discount-codes'] });
      toast({ title: 'Discount code updated' });
      closeDialog();
    },
    onError: err => handleMutationError(err, 'Failed to update discount code'),
  });

  // Toggle active
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.admin.updateDiscountCode(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'discount-codes'] });
    },
    onError: err => handleMutationError(err, 'Failed to toggle status'),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (dc: DiscountCode) => {
    setEditingId(dc.id);
    setForm({
      code: dc.code,
      discountType: dc.discountType,
      discountPercent: dc.discountPercent != null ? String(Number(dc.discountPercent)) : '',
      discountAmountCents: dc.discountAmountCents != null ? String(dc.discountAmountCents) : '',
      usageType: dc.usageType,
      maxUses: dc.maxUses != null ? String(dc.maxUses) : '',
      scope: dc.scope ?? 'cart',
      isActive: dc.isActive,
      expiresAt: toLocalDatetimeString(dc.expiresAt),
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    // Validate
    if (!editingId && !form.code.trim()) {
      toast({ title: 'Code is required', variant: 'destructive' });
      return;
    }
    if (form.discountType === 'percent' && !form.discountPercent) {
      toast({ title: 'Discount percent is required', variant: 'destructive' });
      return;
    }
    if (form.discountType === 'fixed_amount' && !form.discountAmountCents) {
      toast({ title: 'Discount amount is required', variant: 'destructive' });
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          discountType: form.discountType,
          discountPercent:
            form.discountType === 'percent' ? Number(form.discountPercent) : undefined,
          discountAmountCents:
            form.discountType === 'fixed_amount' ? Number(form.discountAmountCents) : undefined,
          usageType: form.usageType,
          maxUses: form.usageType === 'single_use' ? 1 : form.maxUses ? Number(form.maxUses) : null,
          scope: form.scope,
          isActive: form.isActive,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        },
      });
    } else {
      createMutation.mutate({
        code: form.code.trim(),
        discountType: form.discountType,
        discountPercent: form.discountType === 'percent' ? Number(form.discountPercent) : undefined,
        discountAmountCents:
          form.discountType === 'fixed_amount' ? Number(form.discountAmountCents) : undefined,
        usageType: form.usageType,
        maxUses: form.usageType === 'single_use' ? 1 : form.maxUses ? Number(form.maxUses) : undefined,
        scope: form.scope,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Discount Codes</h3>
        <Button
          onClick={openCreate}
          className="bg-electric-lime text-black font-bold rounded-md hover:bg-electric-lime-hover"
        >
          <Plus className="w-4 h-4 mr-1" /> Create Code
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      ) : !discountCodes?.length ? (
        <p className="text-center text-white/50 py-12">No discount codes yet</p>
      ) : (
        <div className="rounded-md border border-[#272727] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#272727] bg-[#0D0D0D]">
                <TableHead className="text-[#FFFFFFBF]">Code</TableHead>
                <TableHead className="text-[#FFFFFFBF]">Discount</TableHead>
                <TableHead className="text-[#FFFFFFBF]">Scope</TableHead>
                <TableHead className="text-[#FFFFFFBF]">Usage</TableHead>
                <TableHead className="text-[#FFFFFFBF] text-center">Used / Max</TableHead>
                <TableHead className="text-[#FFFFFFBF]">Expires</TableHead>
                <TableHead className="text-[#FFFFFFBF] text-center">Active</TableHead>
                <TableHead className="text-[#FFFFFFBF] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discountCodes.map(dc => (
                <TableRow key={dc.id} className="border-[#272727]">
                  <TableCell className="font-mono font-semibold text-[#BDFF00]">
                    {dc.code}
                  </TableCell>
                  <TableCell className="text-[#FFFFFFBF]">{formatDiscount(dc)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs capitalize border-[#272727] text-[#FFFFFFBF]"
                    >
                      {dc.scope === 'cheapest_item' ? 'Cheapest Item' : 'Whole Cart'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs capitalize border-[#272727] text-[#FFFFFFBF]"
                    >
                      {dc.usageType === 'per_account' ? 'Per Account' : 'Single Use'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-[#FFFFFFBF]">
                    {dc.timesUsed} / {dc.maxUses ?? '∞'}
                  </TableCell>
                  <TableCell className="text-[#FFFFFF99] text-sm">
                    {formatDate(dc.expiresAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={dc.isActive}
                      onCheckedChange={checked =>
                        toggleActiveMutation.mutate({ id: dc.id, isActive: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:text-[#BDFF00] transition-colors"
                      onClick={() => openEdit(dc)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent
          className="sm:max-w-[480px] border-2 border-[#7AFF14] text-white"
          style={{ background: '#0D0D0D' }}
        >
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Discount Code' : 'Create Discount Code'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingId
                ? 'Update the settings for this discount code.'
                : 'Create a new discount code for cart checkout.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Code */}
            {!editingId && (
              <div className="space-y-1.5">
                <Label className="text-white font-light">Code</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SAVE10"
                  className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                />
              </div>
            )}

            {/* Discount Type */}
            <div className="space-y-1.5">
              <Label className="text-white font-light">Discount Type</Label>
              <Select
                value={form.discountType}
                onValueChange={v =>
                  setForm({ ...form, discountType: v as FormState['discountType'] })
                }
              >
                <SelectTrigger className="bg-[#272727] border-[#272727] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Percent / Amount */}
            {form.discountType === 'percent' ? (
              <div className="space-y-1.5">
                <Label className="text-white font-light">Discount Percent (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.discountPercent}
                  onChange={e => setForm({ ...form, discountPercent: e.target.value })}
                  placeholder="e.g. 10"
                  className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-white font-light">Discount Amount (cents)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.discountAmountCents}
                  onChange={e => setForm({ ...form, discountAmountCents: e.target.value })}
                  placeholder="e.g. 500 = $5.00"
                  className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                />
              </div>
            )}

            {/* Scope */}
            <div className="space-y-1.5">
              <Label className="text-white font-light">Scope</Label>
              <Select
                value={form.scope}
                onValueChange={v => setForm({ ...form, scope: v as FormState['scope'] })}
              >
                <SelectTrigger className="bg-[#272727] border-[#272727] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cart">Whole Cart</SelectItem>
                  <SelectItem value="cheapest_item">Cheapest Item Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Usage Type */}
            <div className="space-y-1.5">
              <Label className="text-white font-light">Usage Type</Label>
              <Select
                value={form.usageType}
                onValueChange={v => setForm({ ...form, usageType: v as FormState['usageType'] })}
              >
                <SelectTrigger className="bg-[#272727] border-[#272727] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_account">Per Account (each user once)</SelectItem>
                  <SelectItem value="single_use">Single Use (one global use)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Uses */}
            <div className="space-y-1.5">
              <Label className="text-white font-light">Max Uses (leave blank for unlimited)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.maxUses}
                onChange={e => setForm({ ...form, maxUses: e.target.value })}
                placeholder="Unlimited"
                className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
              />
            </div>

            {/* Expiration */}
            <div className="space-y-1.5">
              <Label className="text-white font-light">Expires At (optional)</Label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                className="bg-[#272727] border-[#272727] text-white"
              />
            </div>

            {/* Active toggle (edit only) */}
            {editingId && (
              <div className="flex items-center justify-between">
                <Label className="text-white font-light">Active</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={checked => setForm({ ...form, isActive: checked })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={closeDialog}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-electric-lime text-black font-bold rounded-md hover:bg-electric-lime-hover"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
