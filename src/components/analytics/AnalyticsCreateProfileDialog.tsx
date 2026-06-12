/**
 * Admin-only dialog for creating a brand-new collector profile from the
 * Analytics surface.
 *
 * Backs a real (non-login) `users` row so the new profile shows up in the
 * profiles list and can be annotated like any other. `username` + `email`
 * are required; everything else maps onto the same analytics annotations +
 * socials the edit dialog manages. Seeded socials stay analytics-only unless
 * "Apply to public profile" is checked.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useCreateCollectorProfile } from '@/hooks/useCollectorAnalytics';
import type { ApiAnalyticsSocialPlatform } from '@/types/analytics-api';

const SUPPORTED_PLATFORMS: ApiAnalyticsSocialPlatform[] = [
  'instagram',
  'twitter',
  'tiktok',
  'youtube',
  'facebook',
  'twitch',
  'ebay',
];

const PLATFORM_LABEL: Record<ApiAnalyticsSocialPlatform, string> = {
  instagram: 'Instagram',
  twitter: 'Twitter / X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
  twitch: 'Twitch',
  ebay: 'eBay',
};

interface SocialRow {
  key: string;
  platform: ApiAnalyticsSocialPlatform;
  value: string;
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const parseTags = (raw: string): string[] =>
  raw
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 40);

let rowKeyCounter = 0;
const nextRowKey = () => `new_row_${++rowKeyCounter}`;

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AnalyticsCreateProfileDialog = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const createProfile = useCreateCollectorProfile();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [personaOverride, setPersonaOverride] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [interests, setInterests] = useState('');
  const [preferences, setPreferences] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<SocialRow[]>([]);
  const [applyToPublic, setApplyToPublic] = useState(false);

  const reset = () => {
    setUsername('');
    setEmail('');
    setDisplayName('');
    setBio('');
    setPersonaOverride('');
    setAffiliation('');
    setInterests('');
    setPreferences('');
    setNotes('');
    setRows([]);
    setApplyToPublic(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const addRow = (platform: ApiAnalyticsSocialPlatform = 'instagram') => {
    setRows(prev => [...prev, { key: nextRowKey(), platform, value: '', label: '' }]);
  };

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r.key !== key));
  };

  const updateRow = (key: string, patch: Partial<SocialRow>) => {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));
  };

  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim();
  // Light format checks — only enforced when the field is actually filled in.
  const usernameValid =
    !trimmedUsername || (USERNAME_RE.test(trimmedUsername) && trimmedUsername.length >= 3);
  const emailValid = !trimmedEmail || EMAIL_RE.test(trimmedEmail);

  const filledSocials = rows.some(r => r.value.trim());
  // Nothing is required — we just need at least ONE piece of data so we don't
  // create an empty record. Username/email are auto-generated server-side.
  const hasAnyData =
    !!trimmedUsername ||
    !!trimmedEmail ||
    !!displayName.trim() ||
    !!bio.trim() ||
    !!personaOverride.trim() ||
    !!affiliation.trim() ||
    !!interests.trim() ||
    !!preferences.trim() ||
    !!notes.trim() ||
    filledSocials;
  const canSubmit = hasAnyData && usernameValid && emailValid && !createProfile.isPending;

  const handleCreate = async () => {
    if (!canSubmit) return;
    try {
      const socials = rows
        .map(r => ({
          platform: r.platform,
          value: r.value.trim(),
          label: r.label.trim() || undefined,
        }))
        .filter(s => s.value);

      const created = await createProfile.mutateAsync({
        username: trimmedUsername || undefined,
        email: trimmedEmail.toLowerCase() || undefined,
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        personaOverride: personaOverride.trim() || undefined,
        affiliation: affiliation.trim() || undefined,
        interests: parseTags(interests),
        preferences: parseTags(preferences),
        notes: notes.trim() || undefined,
        socials,
        applyToPublic,
      });
      toast.success('Collector profile created');
      handleOpenChange(false);
      navigate(`/analytics/${created.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create collector';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[rgba(18,18,18,1)] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add collector profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Admin-only. Creates a new (non-login) collector record you can annotate. Add whatever
            data you have — nothing is required. Username and email are auto-generated when left
            blank.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Identity */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-white">Identity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-username" className="text-xs text-muted-foreground">
                  Username
                </Label>
                <Input
                  id="new-username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Auto-generated if blank"
                  className="bg-black/40 border-white/10"
                />
                {!!trimmedUsername && !usernameValid && (
                  <p className="text-[11px] text-red-400">
                    Min 3 chars; letters, numbers, underscores, hyphens only.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-email" className="text-xs text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="new-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Auto-generated if blank"
                  className="bg-black/40 border-white/10"
                />
                {!!trimmedEmail && !emailValid && (
                  <p className="text-[11px] text-red-400">Enter a valid email address.</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-display-name" className="text-xs text-muted-foreground">
                Display name
              </Label>
              <Input
                id="new-display-name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Real / public name"
                className="bg-black/40 border-white/10"
              />
            </div>
          </section>

          <Separator className="bg-white/5" />

          {/* Socials */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Connected socials</h3>
                <p className="text-xs text-muted-foreground">
                  Optional. Multiple entries per platform are allowed. Empty rows are dropped.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 text-white hover:bg-white/15 hover:text-white hover:border-white/20"
                onClick={() => addRow()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>

            {rows.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No socials added yet.</p>
            )}

            <div className="space-y-2">
              {rows.map(row => (
                <div key={row.key} className="flex flex-col sm:flex-row gap-2">
                  <Select
                    value={row.platform}
                    onValueChange={v =>
                      updateRow(row.key, { platform: v as ApiAnalyticsSocialPlatform })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[140px] bg-black/40 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_PLATFORMS.map(p => (
                        <SelectItem key={p} value={p}>
                          {PLATFORM_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={row.value}
                    onChange={e => updateRow(row.key, { value: e.target.value })}
                    placeholder="@handle or URL"
                    className="flex-1 bg-black/40 border-white/10"
                  />
                  <Input
                    value={row.label}
                    onChange={e => updateRow(row.key, { label: e.target.value })}
                    placeholder="Label (optional)"
                    className="w-full sm:w-[140px] bg-black/40 border-white/10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-400"
                    onClick={() => removeRow(row.key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={applyToPublic}
                onCheckedChange={v => setApplyToPublic(v === true)}
              />
              Also apply socials to the public profile (one per platform).
            </label>
          </section>

          <Separator className="bg-white/5" />

          {/* Annotations */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-white">Analytics annotations</h3>
            <div className="space-y-1.5">
              <Label htmlFor="new-persona" className="text-xs text-muted-foreground">
                Persona override
              </Label>
              <Input
                id="new-persona"
                value={personaOverride}
                onChange={e => setPersonaOverride(e.target.value)}
                placeholder="e.g. Whale Collector"
                className="bg-black/40 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-affiliation" className="text-xs text-muted-foreground">
                Affiliation
              </Label>
              <Input
                id="new-affiliation"
                value={affiliation}
                onChange={e => setAffiliation(e.target.value)}
                placeholder="e.g. Dragon Shield Breakers (optional)"
                className="bg-black/40 border-white/10"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-interests" className="text-xs text-muted-foreground">
                  Interests (comma-separated)
                </Label>
                <Input
                  id="new-interests"
                  value={interests}
                  onChange={e => setInterests(e.target.value)}
                  placeholder="vintage, graded, 1st-edition"
                  className="bg-black/40 border-white/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-preferences" className="text-xs text-muted-foreground">
                  Preferences (comma-separated)
                </Label>
                <Input
                  id="new-preferences"
                  value={preferences}
                  onChange={e => setPreferences(e.target.value)}
                  placeholder="PSA10, japanese, sealed"
                  className="bg-black/40 border-white/10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-bio" className="text-xs text-muted-foreground">
                Bio
              </Label>
              <Textarea
                id="new-bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Short summary about this collector…"
                className="bg-black/40 border-white/10 min-h-[72px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-notes" className="text-xs text-muted-foreground">
                Internal notes
              </Label>
              <Textarea
                id="new-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Admin-only notes…"
                className="bg-black/40 border-white/10 min-h-[72px]"
              />
            </div>
          </section>
        </div>

        <DialogFooter className="pt-2 border-t border-white/5">
          <Button
            variant="outline"
            className="border-white/10 bg-white/5 hover:bg-white/10"
            onClick={() => handleOpenChange(false)}
            disabled={createProfile.isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#B4FF39] text-black hover:bg-[#a2e833]"
            onClick={handleCreate}
            disabled={!canSubmit}
          >
            {createProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
