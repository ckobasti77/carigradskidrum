"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { RotateCcw, Search } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import type { CountryCode } from "@/convex/lib/constants";
import type { DirectoryFilters, DirectoryResult, FacetsResult } from "@/lib/data";
import { CompanyCard, type CompanyCardStrings } from "./company-card";
import { CompanyCardGrid } from "./company-card-grid";
import { EmptyState } from "./empty-state";

const PAGE_SIZE = 24;

export type DirectoryStrings = {
  searchPlaceholder: string;
  searchLabel: string;
  filters: {
    title: string;
    category: string;
    country: string;
    city: string;
    acceptsCard: string;
    allCategories: string;
    allCountries: string;
    allCities: string;
    reset: string;
  };
  sort: { label: string; recommended: string; newest: string };
  resultsCount: string;
  visibleCount: string;
  empty: { title: string; text: string };
  card: CompanyCardStrings;
};

function filtersEqual(a: DirectoryFilters, b: DirectoryFilters) {
  return (
    (a.q ?? "") === (b.q ?? "") &&
    (a.categorySlug ?? "") === (b.categorySlug ?? "") &&
    (a.country ?? "") === (b.country ?? "") &&
    (a.citySlug ?? "") === (b.citySlug ?? "") &&
    Boolean(a.acceptsCard) === Boolean(b.acceptsCard) &&
    (a.sort ?? "recommended") === (b.sort ?? "recommended")
  );
}

/** Public querystring contract (Serbian param names, part of the URL surface). */
function filtersToSearchParams(filters: DirectoryFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.categorySlug) params.set("kategorija", filters.categorySlug);
  if (filters.country) params.set("zemlja", filters.country.toLowerCase());
  if (filters.citySlug) params.set("grad", filters.citySlug);
  if (filters.acceptsCard) params.set("kartica", "1");
  if (filters.sort === "newest") params.set("sort", "najnovije");
  return params;
}

/**
 * Reactive directory island. The server renders the first page from
 * `initial` (crawlers + fast first paint); after hydration the Convex
 * subscription takes over. Filter changes sync the URL via
 * history.replaceState — deliberately NO router navigation (that would
 * round-trip the RSC render on every keystroke).
 */
export function DirectoryExplorer({
  locale,
  initial,
  initialFilters,
  facets,
  strings,
}: {
  locale: Locale;
  initial: DirectoryResult;
  initialFilters: DirectoryFilters;
  facets: FacetsResult;
  strings: DirectoryStrings;
}) {
  const [filters, setFilters] = useState<DirectoryFilters>(initialFilters);
  const [qInput, setQInput] = useState(initialFilters.q ?? "");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const blockInitialRevealRef = useRef(false);
  const [now] = useState(() => Math.floor(Date.now() / 3_600_000) * 3_600_000);

  // Debounced search commit (setState inside the timeout callback, not the
  // effect body — pagination resets alongside the filter change).
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => {
        if ((f.q ?? "") === qInput.trim()) return f;
        blockInitialRevealRef.current = true;
        setVisible(PAGE_SIZE);
        return { ...f, q: qInput.trim() || undefined };
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [qInput]);

  // Shallow URL sync (external-system update only — shareable filters
  // without RSC round-trips).
  useEffect(() => {
    const params = filtersToSearchParams(filters);
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [filters]);

  const live = useQuery(api.directory.list, {
    locale,
    now,
    q: filters.q,
    categorySlug: filters.categorySlug,
    country: filters.country,
    citySlug: filters.citySlug,
    acceptsCard: filters.acceptsCard,
    sort: filters.sort,
  });
  const result = live ?? (filtersEqual(filters, initialFilters) ? initial : undefined);
  const itemCount = result?.items.length ?? 0;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || itemCount <= PAGE_SIZE) return;

    let isNearSentinel = false;
    let mustLeaveBeforeReveal = blockInitialRevealRef.current;
    const updateProximity = (isNear: boolean) => {
      if (!isNear) {
        isNearSentinel = false;
        mustLeaveBeforeReveal = false;
        blockInitialRevealRef.current = false;
        return;
      }
      if (mustLeaveBeforeReveal || isNearSentinel) return;

      isNearSentinel = true;
      setVisible((current) =>
        current >= itemCount
          ? current
          : Math.min(current + PAGE_SIZE, itemCount),
      );
    };
    const checkPosition = () => {
      updateProximity(
        sentinel.getBoundingClientRect().top <= window.innerHeight + 300,
      );
    };

    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver(
        ([entry]) => updateProximity(Boolean(entry?.isIntersecting)),
        { rootMargin: "300px 0px", threshold: 0 },
      );
      observer.observe(sentinel);

      return () => observer.disconnect();
    }

    const frame = window.requestAnimationFrame(checkPosition);
    window.addEventListener("scroll", checkPosition, { passive: true });
    window.addEventListener("resize", checkPosition);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", checkPosition);
      window.removeEventListener("resize", checkPosition);
    };
  }, [filters, itemCount]);

  const hasActiveFilters = useMemo(
    () => !filtersEqual(filters, {}),
    [filters],
  );

  function update(patch: Partial<DirectoryFilters>) {
    blockInitialRevealRef.current = true;
    setVisible(PAGE_SIZE);
    setFilters((f) => ({ ...f, ...patch }));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={strings.searchPlaceholder}
            aria-label={strings.searchLabel}
            className="pl-13"
          />
        </div>

        <fieldset className="flex flex-wrap items-end gap-3">
          <legend className="sr-only">{strings.filters.title}</legend>

          <div className="min-w-40 flex-1 space-y-1">
            <Label className="text-xs" htmlFor="filter-category">
              {strings.filters.category}
            </Label>
            <Select
              value={filters.categorySlug ?? "all"}
              onValueChange={(value) =>
                update({ categorySlug: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger id="filter-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{strings.filters.allCategories}</SelectItem>
                {facets.categories.map((category) => (
                  <SelectItem key={category.slug} value={category.slug}>
                    {category.name} ({category.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-36 space-y-1">
            <Label className="text-xs" htmlFor="filter-country">
              {strings.filters.country}
            </Label>
            <Select
              value={filters.country ?? "all"}
              onValueChange={(value) =>
                update({
                  country: value === "all" ? undefined : (value as CountryCode),
                })
              }
            >
              <SelectTrigger id="filter-country" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{strings.filters.allCountries}</SelectItem>
                {facets.countries.map((code) => (
                  <SelectItem key={code} value={code}>
                    {strings.card.countryLabels[code] ?? code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-36 space-y-1">
            <Label className="text-xs" htmlFor="filter-city">
              {strings.filters.city}
            </Label>
            <Select
              value={filters.citySlug ?? "all"}
              onValueChange={(value) =>
                update({ citySlug: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger id="filter-city" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{strings.filters.allCities}</SelectItem>
                {facets.cities.map((city) => (
                  <SelectItem key={city.slug} value={city.slug}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-36 space-y-1">
            <Label className="text-xs" htmlFor="filter-sort">
              {strings.sort.label}
            </Label>
            <Select
              value={filters.sort ?? "recommended"}
              onValueChange={(value) =>
                update({ sort: value === "newest" ? "newest" : undefined })
              }
            >
              <SelectTrigger id="filter-sort" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">{strings.sort.recommended}</SelectItem>
                <SelectItem value="newest">{strings.sort.newest}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex h-12 cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={Boolean(filters.acceptsCard)}
              onChange={(e) =>
                update({ acceptsCard: e.target.checked || undefined })
              }
              className="size-5 accent-primary"
            />
            {strings.filters.acceptsCard}
          </label>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setQInput("");
                blockInitialRevealRef.current = true;
                setVisible(PAGE_SIZE);
                setFilters({});
              }}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {strings.filters.reset}
            </Button>
          )}
        </fieldset>
      </div>

      <p className="text-sm text-muted-foreground">
        {result ? t(strings.resultsCount, { count: result.total }) : "…"}
      </p>

      {result ? (
        result.items.length === 0 ? (
          <EmptyState title={strings.empty.title} text={strings.empty.text} />
        ) : (
          <>
            <CompanyCardGrid>
              {result.items.slice(0, visible).map((card) => (
                <CompanyCard
                  key={card.id}
                  locale={locale}
                  card={card}
                  strings={strings.card}
                />
              ))}
            </CompanyCardGrid>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {t(strings.visibleCount, {
                visible: Math.min(visible, result.items.length),
                total: result.total,
              })}
            </p>
            {visible < result.items.length && (
              <div
                ref={sentinelRef}
                data-infinite-scroll-sentinel
                aria-hidden="true"
                className="h-px [overflow-anchor:none]"
              />
            )}
          </>
        )
      ) : (
        <CompanyCardGrid>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-xl bg-card p-4 shadow-sm">
              <Skeleton className="aspect-video w-full rounded-md" />
              <div className="flex min-h-[210px] flex-col gap-3 px-1 pt-4 pb-1">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-auto h-4 w-2/5" />
              </div>
            </div>
          ))}
        </CompanyCardGrid>
      )}
    </div>
  );
}
