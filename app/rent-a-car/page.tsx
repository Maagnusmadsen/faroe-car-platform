"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchHero from "@/components/SearchHero";
import FilterBar from "@/components/FilterBar";
import MapToggle from "@/components/MapToggle";
import CarGrid from "@/components/CarGrid";
import FiltersModal from "@/components/FiltersModal";
import {
  defaultCarFilters,
  type CarFilters,
  type SortOption,
} from "@/lib/filter-cars";
import type { Car } from "@/lib/cars";
import { useLanguage } from "@/context/LanguageContext";

const PAGE_SIZE = 12;

const CarMap = dynamic(() => import("@/components/CarMap"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
  ),
});

export default function RentACarPage() {
  const { t } = useLanguage();
  const { status: authStatus } = useAuth();
  const [pickupLocation, setPickupLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedLocation, setAppliedLocation] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [filters, setFilters] = useState<CarFilters>(defaultCarFilters);
  const [sort, setSort] = useState<SortOption>("newest");
  const [showMapView, setShowMapView] = useState(false);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [highlightedCarId, setHighlightedCarId] = useState<string | null>(null);

  const [items, setItems] = useState<Car[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const runSearch = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams();
        if (appliedLocation.trim()) params.set("location", appliedLocation.trim());
        if (appliedStartDate) params.set("startDate", appliedStartDate);
        if (appliedEndDate) params.set("endDate", appliedEndDate);
        if (filters.listingType) params.set("type", filters.listingType);
        if (filters.island) params.set("island", filters.island);
        if (filters.town) params.set("town", filters.town);
        if (filters.priceMin != null) params.set("priceMin", String(filters.priceMin));
        if (filters.priceMax != null) params.set("priceMax", String(filters.priceMax));
        if (filters.seats != null) params.set("seats", String(filters.seats));
        if (filters.transmission) params.set("transmission", filters.transmission);
        if (filters.fuelType) params.set("fuelType", filters.fuelType);
        if (filters.is4x4 !== null) params.set("is4x4", String(filters.is4x4));
        if (filters.airportPickupOnly === true) params.set("airportPickup", "true");
        params.set("sort", sort);
        params.set("page", String(pageNum));
        params.set("pageSize", String(PAGE_SIZE));
        const res = await fetch(`/api/cars?${params.toString()}`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const msg = typeof errBody?.error === "string" ? errBody.error : "Search failed";
          setSearchError(msg);
          if (!append) {
            setItems([]);
            setTotal(0);
          }
          return;
        }
        const { data } = await res.json();
        if (append) {
          setItems((prev) => [...prev, ...(data.items ?? [])]);
        } else {
          setItems(data.items ?? []);
        }
        setTotal(data.total ?? 0);
        setPage(data.page ?? pageNum);
        setHasMore(data.hasMore ?? false);
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : "Search failed");
        if (!append) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      appliedLocation,
      appliedStartDate,
      appliedEndDate,
      filters,
      sort,
    ]
  );

  useEffect(() => {
    runSearch(1, false);
  }, [runSearch]);

  // Load favorite state for currently listed cars when authenticated
  useEffect(() => {
    const loadFavorites = async () => {
      if (authStatus !== "authenticated" || items.length === 0) return;
      const ids = items.map((c) => c.id).join(",");
      try {
        const res = await fetch(`/api/favorites?carIds=${encodeURIComponent(ids)}`);
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        const favIds: string[] = json?.data?.carIds ?? [];
        setFavoriteIds(new Set(favIds));
      } catch {
        // ignore
      }
    };
    loadFavorites();
  }, [authStatus, items]);

  const handleToggleFavorite = useCallback(
    async (carId: string) => {
      if (authStatus !== "authenticated") return;
      const isFav = favoriteIds.has(carId);
      try {
        if (isFav) {
          await fetch("/api/favorites", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ carId }),
          });
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(carId);
            return next;
          });
        } else {
          await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ carId }),
          });
          setFavoriteIds((prev) => new Set(prev).add(carId));
        }
      } catch {
        // ignore errors for now
      }
    },
    [authStatus, favoriteIds]
  );

  const handleSearch = useCallback(() => {
    setAppliedLocation(pickupLocation);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  }, [pickupLocation, startDate, endDate]);

  const handleLoadMore = useCallback(() => {
    runSearch(page + 1, true);
  }, [page, runSearch]);

  const handleMarkerClick = useCallback((carId: string) => {
    setHighlightedCarId(carId);
    setTimeout(() => {
      const el = document.getElementById(`car-${carId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <SearchHero
        pickupLocation={pickupLocation}
        onPickupLocationChange={setPickupLocation}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onSearch={handleSearch}
      />

      {/* How it works */}
      <section className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {t("rent.howTitle")}
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-center">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-base font-bold text-brand">
                1
              </span>
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {t("rent.howStep1Title")}
              </h3>
              <p className="mt-1.5 text-sm text-slate-600">{t("rent.howStep1Text")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-center">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-base font-bold text-brand">
                2
              </span>
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {t("rent.howStep2Title")}
              </h3>
              <p className="mt-1.5 text-sm text-slate-600">{t("rent.howStep2Text")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-center">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-base font-bold text-brand">
                3
              </span>
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {t("rent.howStep3Title")}
              </h3>
              <p className="mt-1.5 text-sm text-slate-600">{t("rent.howStep3Text")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            onMoreFiltersClick={() => setFiltersModalOpen(true)}
          />
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-600">
              {loading && items.length === 0
                ? t("rent.loading")
                : `${total} ${t("rent.carsAvailable")}`}
            </p>
            <MapToggle showMap={showMapView} onToggle={() => setShowMapView((v) => !v)} />
          </div>
        </div>

        {searchError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            {searchError}
            <button
              type="button"
              onClick={() => runSearch(1, false)}
              className="ml-2 font-medium underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {showMapView ? (
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <CarMap
              cars={items}
              className="h-[500px] w-full"
              highlightedCarId={highlightedCarId}
              onMarkerClick={handleMarkerClick}
            />
          </div>
        ) : (
          <>
            <CarGrid
              cars={items}
              highlightedCarId={highlightedCarId}
              startDate={appliedStartDate}
              endDate={appliedEndDate}
              favoriteIds={favoriteIds}
              onToggleFavorite={handleToggleFavorite}
            />
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="rounded-xl bg-slate-200 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-50"
                >
                  {loading ? t("rent.loading") : t("rent.loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <FiltersModal
        isOpen={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        cars={items}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <Footer />
    </main>
  );
}