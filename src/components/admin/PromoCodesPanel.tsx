import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import { handleMutationError } from '@/lib/mutationHelpers';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

interface PromoCode {
  id: string;
  code: string;
  currency: string;
  amount: number | string;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

interface FormState {
  code: string;
  amount: string;
  isActive: boolean;
  expiresAt: string;
}

const EMPTY_FORM: FormState = {
  code: '',
  amount: '',
  isActive: true,
  expiresAt: '',
};

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

export const PromoCodesPanel = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: promoCodes, isLoading } = useQuery<PromoCode[]>({
    queryKey: ['admin', 'promo-codes'],
    queryFn: async () => {
      const res = await api.admin.getPromoCodes();
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.admin.createPromoCode>[0]) =>
      api.admin.createPromoCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
      toast({ title: 'Promo code created' });
      closeDialog();
    },
    onError: err => handleMutationError(err, 'Failed to create promo code'),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof api.admin.updatePromoCode>[1];
    }) => api.admin.updatePromoCode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
      toast({ title: 'Promo code updated' });
      closeDialog();
    },
    onError: err => handleMutationError(err, 'Failed to update promo code'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.admin.updatePromoCode(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
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

  const openEdit = (pc: PromoCode) => {
    setEditingId(pc.id);
    setForm({
      code: pc.code,
      amount: String(Number(pc.amount ?? 0)),
      isActive: pc.isActive,
      expiresAt: toLocalDatetimeString(pc.expiresAt),
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingId && !form.code.trim()) {
      toast({ title: 'Code is required', variant: 'destructive' });
      return;
    }
    const amountNum = Number(form.amount);
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Amount must be greater than zero', variant: 'destructive' });
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          amount: amountNum,
          isActive: form.isActive,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        },
      });
    } else {
      createMutation.mutate({
        code: form.code.trim(),
        amount: amountNum,
        isActive: form.isActive,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Promo Codes</h3>
          <p className="text-sm text-white/50">
            Signup-bonus codes that grant CADE Coins to new users when entered during registration.
          </p>
        </div>
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
      ) : !promoCodes?.length ? (
        <p className="text-center text-white/50 py-12">No promo codes yet</p>
      ) : (
        <div className="rounded-md border border-[#272727] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#272727] bg-[#0D0D0D]">
                <TableHead className="text-[#FFFFFFBF]">Code</TableHead>
                <TableHead className="text-[#FFFFFFBF] text-right">CADE Coins</TableHead>
                <TableHead className="text-[#FFFFFFBF]">Expires</TableHead>
                <TableHead className="text-[#FFFFFFBF] text-center">Active</TableHead>
                <TableHead className="text-[#FFFFFFBF] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoCodes.map(pc => (
                <TableRow key={pc.id} className="border-[#272727]">
                  <TableCell className="font-mono font-semibold text-[#BDFF00]">
                    {pc.code}
                  </TableCell>
                  <TableCell className="text-right text-[#FFFFFFBF]">
                    {Number(pc.amount).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-[#FFFFFF99] text-sm">
                    {formatDate(pc.expiresAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={pc.isActive}
                      onCheckedChange={checked =>
                        toggleActiveMutation.mutate({ id: pc.id, isActive: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:text-[#BDFF00] transition-colors"
                      onClick={() => openEdit(pc)}
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
            <DialogTitle>{editingId ? 'Edit Promo Code' : 'Create Promo Code'}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingId
                ? 'Update the settings for this signup-bonus promo code.'
                : 'Create a new promo code that grants CADE Coins on signup.'}
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
                  placeholder="e.g. WELCOME100"
                  className="bg-[#272727] border-[#272727] text-white placeholder:text-gray-400"
                />
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-white font-light">CADE Coins Amount</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 100"
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

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-white font-light">Active</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={checked => setForm({ ...form, isActive: checked })}
              />
            </div>
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
