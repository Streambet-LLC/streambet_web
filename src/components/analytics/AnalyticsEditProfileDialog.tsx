/**
 * Admin-only dialog for editing a collector's connected socials and
 * analytics annotations (notes, persona override, interests, etc.).
 *
 * Socials are persisted on `analytics_profile.socials` (multiple entries
 * per platform allowed, each with an optional label). The public
 * `users.socials` map — which feeds the user's profile + shop pages — is
 * only touched when the "Apply to public profile" checkbox is on.
 */

import { useEffect, useMemo, useState } from 'react';
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
import {
  COLLECTOR_PERSONA_OPTIONS,
  SPORT_OPTIONS,
  normalizeCollectorPersona,
} from '@/types/analytics-api';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import {
  useCollectorProfileDetailRaw,
  useUpdateCollectorAnalyticsProfile,
  useUpdateCollectorSocials,
} from '@/hooks/useCollectorAnalytics';
import type {
  ApiAnalyticsSocialPlatform,
  ApiCollectorAnalyticsAnnotations,
  ApiCollectorSocial,
} from '@/types/analytics-api';

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

/** Draft row used while editing. `id` is preserved for analytics rows. */
interface SocialRow {
  /** UI key, stable across edits. */
  key: string;
  /** Server-side id (only present for existing analytics rows). */
  id?: string;
  platform: ApiAnalyticsSocialPlatform;
  value: string;
  label: string;
}

interface Props {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Radix Select forbids empty-string item values, so use a sentinel for "none". */
const PERSONA_NONE = '__none__';

const parseTags = (raw: string): string[] =>
  raw
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 40);

const formatTags = (tags?: string[]): string => (tags ?? []).join(', ');

let rowKeyCounter = 0;
const nextRowKey = () => `row_${++rowKeyCounter}`;

/**
 * Build the initial editable rows from the API payload. ONLY
 * analytics-source rows are seeded — the public canonical socials
 * (`users.socials`, one per platform) are surfaced read-only above the
 * editor so admins know what currently lives on the public profile.
 *
 * Why not seed public rows? `updateSocials` writes whatever we send into
 * `analytics_profile.socials`. Round-tripping public entries through
 * this editor would copy them into analytics and, on the next open,
 * they'd appear twice in the merged list (once from `users.socials`,
 * once from analytics) — multiplying on every save.
 */
const seedRowsFromApi = (socials: ApiCollectorSocial[]): SocialRow[] =>
  socials
    .filter(s => s.source === 'analytics')
    .map<SocialRow>(s => ({
      key: nextRowKey(),
      id: s.id,
      platform: s.platform,
      value: s.handle,
      label: s.label ?? '',
    }));

export const AnalyticsEditProfileDialog = ({ userId, open, onOpenChange }: Props) => {
  const { data: detail, isLoading } = useCollectorProfileDetailRaw(open ? userId : undefined);
  const updateSocials = useUpdateCollectorSocials(userId);
  const updateProfile = useUpdateCollectorAnalyticsProfile(userId);

  // Socials draft state.
  const [rows, setRows] = useState<SocialRow[]>([]);
  const [applyToPublic, setApplyToPublic] = useState(false);

  // Annotations draft state.
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [personaOverride, setPersonaOverride] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [preferredSports, setPreferredSports] = useState<string[]>([]);
  const [preferredTeamsText, setPreferredTeamsText] = useState('');

  const toggleSport = (sport: string) =>
    setPreferredSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  const [interests, setInterests] = useState('');
  const [preferences, setPreferences] = useState('');
  const [notes, setNotes] = useState('');

  // Hydrate from the API payload every time the dialog opens.
  useEffect(() => {
    if (!detail) return;
    setRows(seedRowsFromApi(detail.socials));
    setApplyToPublic(false);
    const ann: ApiCollectorAnalyticsAnnotations = detail.analyticsProfile ?? {};
    setDisplayName(ann.displayName ?? '');
    setBio(ann.bio ?? '');
    setPersonaOverride(normalizeCollectorPersona(ann.personaOverride));
    setAffiliation(ann.affiliation ?? '');
    setPreferredSports(ann.preferredSports ?? []);
    setPreferredTeamsText((ann.preferredTeams ?? []).join(', '));
    setInterests(formatTags(ann.interests));
    setPreferences(formatTags(ann.preferences));
    setNotes(ann.notes ?? '');
  }, [detail]);

  /** Counts per platform for the heads-up display. */
  const perPlatform = useMemo(() => {
    const c: Partial<Record<ApiAnalyticsSocialPlatform, number>> = {};
    for (const r of rows) {
      if (!r.value.trim()) continue;
      c[r.platform] = (c[r.platform] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const addRow = (platform: ApiAnalyticsSocialPlatform = 'instagram') => {
    setRows(prev => [...prev, { key: nextRowKey(), platform, value: '', label: '' }]);
  };

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r.key !== key));
  };

  const updateRow = (key: string, patch: Partial<SocialRow>) => {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));
  };

  const isSaving = updateSocials.isPending || updateProfile.isPending;

  const handleSave = async () => {
    try {
      // IMPORTANT: these must run sequentially, not in parallel.
      // Both backend handlers load the user row, mutate
      // `analytics_profile`, and save. Running them concurrently means the
      // second handler spreads a stale `prev.socials` over the first
      // handler's write, silently dropping just-added rows.
      // Strip empties + collapse exact platform/value/label duplicates.
      // The seeded analytics rows historically picked up copies of the
      // public canonical socials (now fixed), so existing collectors may
      // open the editor with leftover dupes — dedupe on save cleans them
      // up the first time they hit Save.
      const seen = new Set<string>();
      const dedupedEntries: Array<{
        id?: string;
        platform: ApiAnalyticsSocialPlatform;
        value: string;
        label?: string;
      }> = [];
      for (const r of rows) {
        const value = r.value.trim();
        if (!value) continue;
        const label = r.label.trim();
        const key = `${r.platform}|${value.toLowerCase()}|${label.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dedupedEntries.push({
          id: r.id,
          platform: r.platform,
          value,
          label: label || undefined,
        });
      }

      await updateSocials.mutateAsync({
        applyToPublic,
        entries: dedupedEntries,
      });
      await updateProfile.mutateAsync({
        displayName: displayName.trim(),
        bio: bio.trim(),
        personaOverride: personaOverride.trim(),
        affiliation: affiliation.trim(),
        preferredSports,
        preferredTeams: parseTags(preferredTeamsText),
        interests: parseTags(interests),
        preferences: parseTags(preferences),
        notes: notes.trim(),
      });
      toast.success(
        applyToPublic
          ? 'Collector profile updated (public socials synced)'
          : 'Collector profile updated'
      );
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update collector';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[rgba(18,18,18,1)] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit collector profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Admin-only collector profile.
          </DialogDescription>
        </DialogHeader>

        {isLoading && !detail ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading profile…
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Socials */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-white">Connected socials</h3>
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

              {detail?.socials?.some(s => s.source === 'public') && (
                <div className="rounded-md border border-white/5 bg-black/30 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Currently on public profile
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.socials
                      .filter(s => s.source === 'public')
                      .map(s => (
                        <Badge
                          key={`pub-${s.platform}-${s.handle}`}
                          variant="outline"
                          className="bg-white/5 border-white/10 text-white/80 text-[11px] font-normal"
                        >
                          {PLATFORM_LABEL[s.platform]}: {s.handle}
                        </Badge>
                      ))}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2">
                    Socials list preview
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {rows.length === 0 &&
                  !detail?.socials?.some(s => s.source === 'public') && (
                    <div className="text-xs text-muted-foreground italic">
                      No socials yet. Click “Add” to inject one.
                    </div>
                  )}
                {rows.map(row => {
                  const dupes = (perPlatform[row.platform] ?? 0) > 1;
                  return (
                    <div key={row.key} className="flex flex-wrap items-center gap-2">
                      <select
                        value={row.platform}
                        onChange={e =>
                          updateRow(row.key, {
                            platform: e.target.value as ApiAnalyticsSocialPlatform,
                          })
                        }
                        className="h-9 rounded-md border border-white/10 bg-black/40 px-2 text-sm text-white"
                      >
                        {SUPPORTED_PLATFORMS.map(p => (
                          <option key={p} value={p}>
                            {PLATFORM_LABEL[p]}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={row.value}
                        onChange={e => updateRow(row.key, { value: e.target.value })}
                        placeholder="@handle or full URL"
                        className="flex-1 min-w-[160px] bg-black/40 border-white/10 text-white placeholder:text-muted-foreground"
                      />
                      <Input
                        value={row.label}
                        onChange={e => updateRow(row.key, { label: e.target.value })}
                        placeholder="Label (e.g. Shop)"
                        className="w-[140px] bg-black/40 border-white/10 text-white placeholder:text-muted-foreground"
                      />
                      {dupes && (
                        <Badge
                          variant="outline"
                          className="bg-[#B4FF39]/10 text-[#B4FF39] border-[#B4FF39]/30 text-[10px]"
                          title="Multiple entries on this platform"
                        >
                          ×{perPlatform[row.platform]}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-red-300"
                        onClick={() => removeRow(row.key)}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-md border border-white/5 bg-black/30 p-3 flex items-start gap-2">
                <Checkbox
                  id="applyToPublic"
                  checked={applyToPublic}
                  onCheckedChange={v => setApplyToPublic(!!v)}
                  className="mt-0.5 border-white/20 data-[state=checked]:bg-[#B4FF39] data-[state=checked]:border-[#B4FF39] data-[state=checked]:text-black"
                />
                <div className="flex-1">
                  <Label htmlFor="applyToPublic" className="text-sm text-white cursor-pointer">
                    Also apply to the public profile
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    By default these changes only live in analytics. Turn this on to overwrite the
                    canonical socials shown on the user’s profile and shop page (one per platform —
                    the first row in this list wins).
                  </p>
                  {applyToPublic && (
                    <div className="mt-2 flex items-start gap-1.5 text-[11px] text-yellow-200/90">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>This will replace what the user has set themselves.</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <Separator className="bg-white/5" />

            {/* AI annotations */}
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-white">AI profile annotations</h3>
                <p className="text-xs text-muted-foreground">
                  Free-form fields persisted on the user. The future AI integration consumes these
                  directly.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Display name override</Label>
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. The Pokémon Whale"
                    className="bg-black/40 border-white/10 text-white placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Persona override</Label>
                  <Select
                    value={personaOverride || PERSONA_NONE}
                    onValueChange={v =>
                      setPersonaOverride(v === PERSONA_NONE ? '' : v)
                    }
                  >
                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                      <SelectValue placeholder="Select persona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PERSONA_NONE}>— None —</SelectItem>
                      {COLLECTOR_PERSONA_OPTIONS.map(p => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Affiliation</Label>
                  <Input
                    value={affiliation}
                    onChange={e => setAffiliation(e.target.value)}
                    placeholder="e.g. Dragon Shield Breakers (optional)"
                    className="bg-black/40 border-white/10 text-white placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Preferred sports (Sports only)
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SPORT_OPTIONS.map(s => {
                      const active = preferredSports.includes(s);
                      return (
                        <button
                          type="button"
                          key={s}
                          onClick={() => toggleSport(s)}
                          className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${
                            active
                              ? 'bg-sky-500/20 text-sky-200 border-sky-500/40'
                              : 'bg-black/40 text-white/60 border-white/10 hover:border-white/25'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {preferredSports.length
                      ? 'Overriding auto-derived. Click to toggle; clear all to revert to auto.'
                      : 'Auto-derived from purchases. Click a sport to override.'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Preferred teams (Sports only)
                  </Label>
                  <Textarea
                    value={preferredTeamsText}
                    onChange={e => setPreferredTeamsText(e.target.value)}
                    placeholder="Auto-derived; comma or newline separated to override"
                    rows={2}
                    className="bg-black/40 border-white/10 text-white placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bio</Label>
                <Textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Short bio surfaced on the collector card."
                  rows={3}
                  className="bg-black/40 border-white/10 text-white placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Interests (comma or newline separated)
                </Label>
                <Textarea
                  value={interests}
                  onChange={e => setInterests(e.target.value)}
                  placeholder="vintage, japanese, 1st-edition"
                  rows={2}
                  className="bg-black/40 border-white/10 text-white placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Buying preferences (comma or newline separated)
                </Label>
                <Textarea
                  value={preferences}
                  onChange={e => setPreferences(e.target.value)}
                  placeholder="PSA10, sealed, lorcana"
                  rows={2}
                  className="bg-black/40 border-white/10 text-white placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Internal notes (admin-only)</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anything the AI / outreach team should know."
                  rows={4}
                  className="bg-black/40 border-white/10 text-white placeholder:text-muted-foreground"
                />
              </div>
            </section>
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-white/5">
          <Button
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:bg-white/15 hover:text-white hover:border-white/20"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#B4FF39] text-black hover:bg-[#B4FF39]/90"
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnalyticsEditProfileDialog;
