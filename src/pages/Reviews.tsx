import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TabSwitch } from '@/components/navigation/TabSwitch';
import api from '@/integrations/api/client';
import { ReviewListRole, ReviewSort } from '@/types/review';
import StarRating from '@/components/reviews/StarRating';
import RatingSummary from '@/components/reviews/RatingSummary';
import { getImageLink } from '@/utils/helper';

const PER_PAGE = 10;

const sortOptions: { value: ReviewSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest rating' },
  { value: 'lowest', label: 'Lowest rating' },
];

const roleTabs: { key: ReviewListRole; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'as_seller', label: 'As Seller' },
  { key: 'as_buyer', label: 'As Buyer' },
];

const isValidRole = (v: string | null): v is ReviewListRole =>
  v === 'all' || v === 'as_buyer' || v === 'as_seller';
const isValidSort = (v: string | null): v is ReviewSort =>
  v === 'newest' || v === 'oldest' || v === 'highest' || v === 'lowest';

/**
 * Public reviews page at /users/:username/reviews. Shows tabs (All / As Seller /
 * As Buyer), a sort dropdown, and a paginated list of reviews about the user.
 *
 * Query params (kept in URL for shareability):
 *  - role: 'all' | 'as_seller' | 'as_buyer' (default 'all')
 *  - sort: 'newest' | 'oldest' | 'highest' | 'lowest' (default 'newest')
 *  - page: number (default 1)
 */
const Reviews: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const role: ReviewListRole = isValidRole(searchParams.get('role'))
    ? (searchParams.get('role') as ReviewListRole)
    : 'all';
  const sort: ReviewSort = isValidSort(searchParams.get('sort'))
    ? (searchParams.get('sort') as ReviewSort)
    : 'newest';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const updateParams = (
    next: Partial<{ role: ReviewListRole; sort: ReviewSort; page: number }>
  ) => {
    const sp = new URLSearchParams(searchParams);
    if (next.role !== undefined) sp.set('role', next.role);
    if (next.sort !== undefined) sp.set('sort', next.sort);
    if (next.page !== undefined) sp.set('page', String(next.page));
    setSearchParams(sp, { replace: true });
  };

  // Whenever role/sort changes, reset to page 1 unless explicitly setting page.
  const onChangeRole = (r: ReviewListRole) => updateParams({ role: r, page: 1 });
  const onChangeSort = (s: ReviewSort) => updateParams({ sort: s, page: 1 });
  const onChangePage = (p: number) => updateParams({ page: p });

  const { data: stats } = useQuery({
    enabled: !!username,
    queryKey: ['review-stats', username],
    queryFn: () => api.review.getUserStats(username as string),
    staleTime: 60_000,
  });

  const { data, isLoading, isError } = useQuery({
    enabled: !!username,
    queryKey: ['reviews-list', username, role, sort, page],
    queryFn: () =>
      api.review.listReviewsForUser(username as string, {
        role,
        sort,
        page,
        perPage: PER_PAGE,
      }),
    staleTime: 30_000,
  });

  const totalPages = data?.totalPages ?? 1;

  if (!username) {
    return (
      <MainLayout>
        <div className="text-center py-20 text-muted-foreground">User not found.</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs text-muted-foreground hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" /> Back
          </button>
          <h1 className="text-2xl font-bold mt-2">
            Reviews for <span className="text-[#bdff00]">@{username}</span>
          </h1>
        </div>

        {/* Aggregate stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-[#23272F] bg-[#0D0D0D] p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                As a seller
              </div>
              <RatingSummary username={username} side="as_seller" size="lg" linkToReviews={false} />
            </div>
            <div className="rounded-lg border border-[#23272F] bg-[#0D0D0D] p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                As a buyer
              </div>
              <RatingSummary username={username} side="as_buyer" size="lg" linkToReviews={false} />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabSwitch
            tabs={roleTabs.map(t => ({ key: t.key, label: t.label }))}
            activeTab={role}
            setActiveTab={k => onChangeRole(k as ReviewListRole)}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort</span>
            <Select value={sort} onValueChange={v => onChangeSort(v as ReviewSort)}>
              <SelectTrigger className="w-[160px] h-8 bg-[#0D0D0D] border-[#23272F] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0D0D0D] border-[#23272F] text-white">
                {sortOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-[#bdff00]" />
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-muted-foreground">
            Could not load reviews. Please try again.
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No reviews found.</div>
        ) : (
          <ul className="space-y-3">
            {data.items.map(review => {
              const reviewerSideLabel =
                review.reviewerRole === 'buyer' ? 'as a seller' : 'as a buyer';
              return (
                <li key={review.id} className="rounded-lg border border-[#23272F] bg-[#0D0D0D] p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={getImageLink(review.reviewer.profileImageUrl ?? '') || undefined}
                        alt={review.reviewer.username}
                      />
                      <AvatarFallback>
                        {(review.reviewer.username || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-white">
                          @{review.reviewer.username}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          rated {reviewerSideLabel}
                        </span>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(review.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <StarRating value={review.rating} size={16} />
                      </div>
                      {review.itemName && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Item: <span className="text-white">{review.itemName}</span>
                        </div>
                      )}
                      {review.comment?.trim() && (
                        <p className="mt-2 text-sm text-white/90 whitespace-pre-wrap break-words">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {data && data.total > PER_PAGE && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {data.total} total
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => onChangePage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => onChangePage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Reviews;
