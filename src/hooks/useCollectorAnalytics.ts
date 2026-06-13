/**
 * React Query hooks for the admin "Collector Analytics" feature.
 *
 * These wrap the new `/admin/analytics/collectors/*` endpoints and merge the
 * responses onto the existing Analytics UI shapes via
 * `lib/analytics-merge.ts`, so components keep consuming `AnalyticsUser` /
 * `AnalyticsOverview` while real CardCade buy/sell data is wired through.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import type {
  ApiCollectorAnalyticsAnnotations,
  ApiCollectorAnalyticsOverview,
  ApiCollectorListParams,
  ApiCollectorProfileDetail,
  ApiCollectorProfilesList,
  ApiCollectorProfileSummary,
  ApiCollectorSocial,
  ApiCreateCollectorProfilePayload,
  ApiUpdateCollectorAnalyticsProfilePayload,
  ApiUpdateCollectorSocialsPayload,
} from '@/types/analytics-api';
import { mergeOverview, mergeProfileIntoAnalyticsUser } from '@/lib/analytics-merge';
import type { AnalyticsOverview, AnalyticsUser } from '@/mocks/analytics';
import { useIsRealDataOnly } from '@/hooks/useRealDataOnly';

const ONE_MINUTE = 60 * 1000;

export const useCollectorAnalyticsOverview = () => {
  const realOnly = useIsRealDataOnly();
  return useQuery<ApiCollectorAnalyticsOverview, Error, AnalyticsOverview>({
    queryKey: ['analytics', 'collectors', 'overview', realOnly],
    queryFn: () => api.analytics.getCollectorsOverview(),
    select: data => mergeOverview(data, realOnly),
    staleTime: 5 * ONE_MINUTE,
    refetchOnWindowFocus: false,
  });
};

export const useCollectorProfiles = (params: ApiCollectorListParams = {}) => {
  const realOnly = useIsRealDataOnly();
  return useQuery<
    ApiCollectorProfilesList,
    Error,
    { total: number; rows: AnalyticsUser[]; raw: ApiCollectorProfileSummary[] }
  >({
    queryKey: ['analytics', 'collectors', 'list', params, realOnly],
    queryFn: () => api.analytics.listCollectorProfiles(params),
    select: result => ({
      total: result.total,
      raw: result.data,
      rows: result.data.map(p => mergeProfileIntoAnalyticsUser(p, undefined, realOnly)),
    }),
    staleTime: 2 * ONE_MINUTE,
    refetchOnWindowFocus: false,
  });
};

export const useCollectorProfileDetail = (userId: string | undefined) => {
  const realOnly = useIsRealDataOnly();
  return useQuery<ApiCollectorProfileDetail, Error, AnalyticsUser>({
    queryKey: ['analytics', 'collectors', 'detail', userId, realOnly],
    queryFn: () => api.analytics.getCollectorProfile(userId as string),
    enabled: !!userId,
    select: detail => mergeProfileIntoAnalyticsUser(detail, detail, realOnly),
    staleTime: 2 * ONE_MINUTE,
    refetchOnWindowFocus: false,
  });
};

/**
 * Raw (un-merged) profile detail. Used by admin edit dialogs that need the
 * authoritative API payload (annotations, raw socials list) rather than
 * the merged `AnalyticsUser` shape.
 */
export const useCollectorProfileDetailRaw = (userId: string | undefined) => {
  return useQuery<ApiCollectorProfileDetail>({
    queryKey: ['analytics', 'collectors', 'detail-raw', userId],
    queryFn: () => api.analytics.getCollectorProfile(userId as string),
    enabled: !!userId,
    staleTime: 2 * ONE_MINUTE,
    refetchOnWindowFocus: false,
  });
};

/** Invalidate every cached view of a single collector profile. */
const invalidateCollectorProfile = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string
) => {
  queryClient.invalidateQueries({
    queryKey: ['analytics', 'collectors', 'detail', userId],
  });
  queryClient.invalidateQueries({
    queryKey: ['analytics', 'collectors', 'detail-raw', userId],
  });
  queryClient.invalidateQueries({
    queryKey: ['analytics', 'collectors', 'list'],
  });
};

/** Admin-only: replace connected socials on a collector profile. */
export const useUpdateCollectorSocials = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation<
    { socials: ApiCollectorSocial[]; appliedToPublic: boolean },
    Error,
    ApiUpdateCollectorSocialsPayload
  >({
    mutationFn: payload => {
      if (!userId) throw new Error('userId is required');
      return api.analytics.updateCollectorSocials(userId, payload);
    },
    onSuccess: () => {
      if (userId) invalidateCollectorProfile(queryClient, userId);
    },
  });
};

/** Admin-only: merge analytics annotations onto a collector profile. */
export const useUpdateCollectorAnalyticsProfile = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation<
    { analyticsProfile: ApiCollectorAnalyticsAnnotations | null },
    Error,
    ApiUpdateCollectorAnalyticsProfilePayload
  >({
    mutationFn: payload => {
      if (!userId) throw new Error('userId is required');
      return api.analytics.updateCollectorAnalyticsProfile(userId, payload);
    },
    onSuccess: () => {
      if (userId) invalidateCollectorProfile(queryClient, userId);
    },
  });
};

/**
 * Admin-only: omit (or restore) a user from the Analytics surface. Toggles an
 * analytics-only flag; the account itself is untouched. Invalidates the list
 * (so the row appears/disappears) and the overview.
 */
export const useSetCollectorExclusion = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { excluded: boolean },
    Error,
    { userId: string; excluded: boolean }
  >({
    mutationFn: ({ userId, excluded }) =>
      api.analytics.setCollectorExclusion(userId, excluded),
    onSuccess: (_data, { userId }) => {
      invalidateCollectorProfile(queryClient, userId);
      queryClient.invalidateQueries({
        queryKey: ['analytics', 'collectors', 'overview'],
      });
    },
  });
};

/** Admin-only: create a brand-new collector profile. */
export const useCreateCollectorProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<
    ApiCollectorProfileDetail,
    Error,
    ApiCreateCollectorProfilePayload
  >({
    mutationFn: payload => api.analytics.createCollectorProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['analytics', 'collectors', 'list'],
      });
      queryClient.invalidateQueries({
        queryKey: ['analytics', 'collectors', 'overview'],
      });
    },
  });
};
