/**
 * React Query hooks for the admin "Collector Analytics" feature.
 *
 * These wrap the new `/admin/analytics/collectors/*` endpoints and merge the
 * responses onto the existing Analytics UI shapes via
 * `lib/analytics-merge.ts`, so components keep consuming `AnalyticsUser` /
 * `AnalyticsOverview` while real CardCade buy/sell data is wired through.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/integrations/api/client';
import type {
  ApiCollectorAnalyticsOverview,
  ApiCollectorListParams,
  ApiCollectorProfileDetail,
  ApiCollectorProfilesList,
  ApiCollectorProfileSummary,
} from '@/types/analytics-api';
import {
  mergeOverview,
  mergeProfileIntoAnalyticsUser,
} from '@/lib/analytics-merge';
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
      rows: result.data.map(p =>
        mergeProfileIntoAnalyticsUser(p, undefined, realOnly),
      ),
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
    select: detail =>
      mergeProfileIntoAnalyticsUser(detail, detail, realOnly),
    staleTime: 2 * ONE_MINUTE,
    refetchOnWindowFocus: false,
  });
};
