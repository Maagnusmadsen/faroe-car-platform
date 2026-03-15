"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import MapboxListingPreview from "@/components/map/MapboxListingPreview";
import type { CarDetail } from "@/types/car-detail";

interface CarDetailContentProps {
  car: CarDetail;
}

export default function CarDetailContent({ car }: CarDetailContentProps) {
  const { t } = useLanguage();
  const { user: sessionUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookingState, setBookingState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimDone, setClaimDone] = useState(false);
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null; createdAt: string; reviewer: { name: string | null } }[]>([]);
  const [renterVerificationStatus, setRenterVerificationStatus] = useState<"UNVERIFIED" | "PENDING" | "VERIFIED" | null>(null);
  const name = car.title?.trim() || `${car.brand} ${car.model}`;

  const photos = car.images && car.images.length > 0 ? car.images : [car.imageUrl];
  const availability = car.availability;
  const pickup = car.pickup;
  const owner = car.owner;
  const reviewsSummary = car.reviewsSummary;
  const features = car.features ?? [];
  const isOwner = !!(sessionUser && owner && owner.id === sessionUser.id);

  const isTemporarilyUnavailable =
    availability != null &&
    availability.blockedDates.length > 0 &&
    availability.blockedDates.length >= availability.advanceBookingDays;

  const startParam = searchParams.get("start") ?? undefined;
  const endParam = searchParams.get("end") ?? undefined;

  useEffect(() => {
    const loadFavorite = async () => {
      if (!sessionUser) return;
      try {
        const res = await fetch(`/api/favorites?carIds=${encodeURIComponent(car.id)}`);
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        const favIds: string[] = json?.data?.carIds ?? [];
        setIsFavorite(favIds.includes(car.id));
      } catch {
        // ignore
      }
    };
    loadFavorite();
  }, [sessionUser, car.id]);

  useEffect(() => {
    if (!sessionUser || isOwner) return;
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const status = json?.data?.verificationStatus as "UNVERIFIED" | "PENDING" | "VERIFIED" | undefined;
        setRenterVerificationStatus(status ?? null);
      })
      .catch(() => {
        if (!cancelled) setRenterVerificationStatus(null);
      });
    return () => { cancelled = true; };
  }, [sessionUser, isOwner]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reviews?carId=${encodeURIComponent(car.id)}&limit=20`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setReviews(json?.data ?? []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [car.id]);

  async function handleClaimForMyListings() {
    if (!sessionUser) return;
    setClaiming(true);
    setClaimDone(false);
    try {
      const res = await fetch("/api/listings/claim-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: car.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setClaimDone(true);
      } else {
        setBookingMessage(json?.error ?? "Could not add to My listings");
      }
    } catch {
      setBookingMessage("Could not add to My listings");
    } finally {
      setClaiming(false);
    }
  }

  async function handleDeleteListing() {
    if (!confirm("Are you sure you want to remove this listing? It will no longer be visible to renters.")) return;
    setDeleting(true);
    setBookingMessage(null);
    try {
      const res = await fetch(`/api/listings/${car.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/bookings?tab=listings");
        return;
      }
      const json = await res.json().catch(() => ({}));
      setBookingMessage(json?.error ?? "Could not delete listing");
    } catch {
      setBookingMessage("Could not delete listing");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleFavorite() {
    if (!sessionUser) return;
    try {
      if (isFavorite) {
        await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carId: car.id }),
        });
        setIsFavorite(false);
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carId: car.id }),
        });
        setIsFavorite(true);
      }
    } catch {
      // ignore
    }
  }

  async function handleBookNow() {
    if (!startParam || !endParam) {
      setBookingState("error");
      setBookingMessage(t("rent.bookingNeedsDates"));
      return;
    }
    if (!sessionUser) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (isTemporarilyUnavailable) return;

    setBookingState("submitting");
    setBookingMessage(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: car.id,
          startDate: startParam,
          endDate: endParam,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBookingState("error");
        if (json?.code === "RENTER_NOT_VERIFIED") {
          setBookingMessage(t("rent.renterNotApproved"));
        } else {
          setBookingMessage(json?.error ?? t("rent.bookingError"));
        }
        return;
      }
      const bookingId = json?.data?.id as string | undefined;
      if (!bookingId) {
        setBookingState("error");
        setBookingMessage(t("rent.bookingError"));
        return;
      }

      setBookingState("success");
      setBookingMessage(null);
    } catch {
      setBookingState("error");
      setBookingMessage(t("rent.bookingError"));
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/rent-a-car"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        {t("rent.backToCars")}
      </Link>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Hero image / simple gallery */}
        <div className="relative aspect-[16/9] bg-slate-100">
          <Image
            src={photos[0] ?? car.imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 896px) 100vw, 896px"
            priority
          />
        </div>

        <div className="p-8 space-y-8">
          {/* Title, location, rating / reviews summary */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">{name}</h1>
                {sessionUser && (
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className="text-sm text-slate-500 hover:text-emerald-600"
                    aria-label={
                      isFavorite ? t("rent.removeFavorite") : t("rent.addFavorite")
                    }
                  >
                    {isFavorite ? "★" : "☆"}
                  </button>
                )}
              </div>
              <p className="mt-1 text-slate-500">{car.location}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                ★ {reviewsSummary?.ratingAvg ?? car.rating} {t("rent.rating")}
              </div>
              {reviewsSummary && (
                <p className="text-xs text-slate-500">
                  {reviewsSummary.reviewCount} {t("rent.reviews")}
                </p>
              )}
            </div>
          </div>

          {/* Pricing + booking CTA */}
          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-slate-100 pt-6">
            <div>
              <p className="text-sm text-slate-500">{t("rent.from")}</p>
              <p className="text-3xl font-bold text-slate-900">
                {car.pricePerDay} DKK
                <span className="text-lg font-normal text-slate-500">
                  {t("rent.perDay")}
                </span>
              </p>
              {availability && (
                <p className="mt-2 text-xs text-slate-500">
                  {t("rent.minRentalDays").replace("{days}", String(availability.minRentalDays))}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {isOwner ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-center">
                  <p className="text-sm font-medium text-slate-700">This is your listing</p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                    <Link
                      href={`/list-your-car?draft=${car.id}`}
                      className="text-sm font-medium text-emerald-600 hover:underline"
                    >
                      Edit listing
                    </Link>
                    <button
                      type="button"
                      onClick={handleDeleteListing}
                      disabled={deleting}
                      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Delete listing"}
                    </button>
                  </div>
                </div>
              ) : renterVerificationStatus !== null && renterVerificationStatus !== "VERIFIED" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-4">
                  <p className="text-sm font-medium text-amber-800">{t("rent.renterNotApproved")}</p>
                  <Link
                    href="/renter-approval"
                    className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    {t("rent.getApprovedFirst")}
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isTemporarilyUnavailable}
                  className="rounded-xl bg-emerald-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                  onClick={handleBookNow}
                >
                  {isTemporarilyUnavailable
                    ? t("rent.notBookable")
                    : bookingState === "submitting"
                      ? t("rent.loading")
                      : t("rent.requestToBook")}
                </button>
              )}
              {bookingMessage && bookingState === "error" && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
                  <p className="text-sm text-amber-800">{bookingMessage}</p>
                  <Link href="/renter-approval" className="mt-2 inline-block text-sm font-medium text-emerald-600 hover:underline">
                    {t("rent.getApprovedFirst")}
                  </Link>
                </div>
              )}
              {availability && (
                <p className="text-xs text-slate-500">
                  {t("rent.availabilitySummary")
                    .replace("{notice}", String(availability.minNoticeDays))
                    .replace("{window}", String(availability.advanceBookingDays))}
                </p>
              )}
              {bookingState === "success" && (
                <p className="text-sm text-emerald-600">
                  {t("rent.bookingRequestSent")}{" "}
                  <Link href="/bookings" className="font-medium underline">
                    {t("rent.viewMyBookings")}
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Main content grid: description, specs, owner, pickup, policies, features */}
          <div className="grid gap-8 md:grid-cols-3">
            {/* Left column: description + specs */}
            <div className="md:col-span-2 space-y-6">
              {car.description && (
                <section>
                  <h2 className="text-base font-semibold text-slate-900">
                    {t("rent.aboutCar")}
                  </h2>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                    {car.description}
                  </p>
                </section>
              )}

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  {t("rent.specifications")}
                </h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700">
                  <div>
                    <dt className="text-slate-500">{t("rent.year")}</dt>
                    <dd>{car.year}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t("rent.seats")}</dt>
                    <dd>{car.seats}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">
                      {t("rent.transmission")}
                    </dt>
                    <dd>{t(`rent.${car.transmission}`)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t("rent.fuelType")}</dt>
                    <dd>{t(`rent.${car.fuelType}`)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t("rent.is4x4")}</dt>
                    <dd>{car.is4x4 ? t("rent.yes") : t("rent.no")}</dd>
                  </div>
                </dl>
              </section>

              {features.length > 0 && (
                <section>
                  <h2 className="text-base font-semibold text-slate-900">
                    {t("rent.features")}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {features.map((f) => (
                      <span
                        key={f.key}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {t(`rent.feature.${f.key}`)}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-base font-semibold text-slate-900">
                  {t("rent.policies")}
                </h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>{t("rent.policyInsuranceNote")}</li>
                  {availability && (
                    <li>
                      {t("rent.policyMinDays").replace("{days}", String(availability.minRentalDays))}
                    </li>
                  )}
                  <li>{t("rent.policyDriverRequirements")}</li>
                  <li>
                    <Link href="/cancellation" className="text-emerald-600 hover:underline">
                      {t("rent.policyCancellationLink")}
                    </Link>
                  </li>
                </ul>
              </section>
            </div>

            {/* Right column: owner + pickup + availability overview */}
            <div className="space-y-6">
              {owner && (
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {t("rent.owner")}
                  </h2>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                      {owner.avatarUrl ? (
                        <Image
                          src={owner.avatarUrl}
                          alt={owner.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        owner.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {owner.name}
                      </p>
                      {reviewsSummary && (
                        <p className="text-xs text-slate-500">
                          ★ {reviewsSummary.ratingAvg.toFixed(1)} •{" "}
                          {reviewsSummary.reviewCount} {t("rent.reviews")}
                        </p>
                      )}
                    </div>
                  </div>
                  {owner.ownerNote && (
                    <p className="mt-3 text-xs text-slate-600">
                      {owner.ownerNote}
                    </p>
                  )}
                </section>
              )}

              {pickup && (
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {t("rent.pickupInformation")}
                  </h2>
                  <p className="mt-2 text-sm text-slate-700">
                    {pickup.location}
                  </p>
                  {pickup.airportPickup && (
                    <p className="mt-1 text-xs text-emerald-700">
                      {t("rent.airportPickupAvailable")}
                    </p>
                  )}
                  {pickup.instructions && (
                    <p className="mt-3 text-xs text-slate-600 whitespace-pre-line">
                      {pickup.instructions}
                    </p>
                  )}
                  {pickup.options.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      {pickup.options.map((opt) => (
                        <li key={opt.id}>
                          <span className="font-medium">{opt.label}</span>
                          {opt.address ? ` – ${opt.address}` : ""}
                          {opt.isDefault ? ` (${t("rent.defaultPickup")})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {typeof car.latitude === "number" && typeof car.longitude === "number" && (
                <section>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {t("rent.location")}
                  </h2>
                  <MapboxListingPreview
                    latitude={car.latitude}
                    longitude={car.longitude}
                    className="mt-2"
                  />
                </section>
              )}

              {availability && (
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {t("rent.availabilityOverview")}
                  </h2>
                  <p className="mt-2 text-xs text-slate-600">
                    {t("rent.availabilitySummary")
                      .replace("{notice}", String(availability.minNoticeDays))
                      .replace("{window}", String(availability.advanceBookingDays))}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {t("rent.blockedDatesCount").replace("{count}", String(availability.blockedDates.length))}
                  </p>
                </section>
              )}

              {reviews.length > 0 && (
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {t("rent.reviews")} ({reviews.length})
                  </h2>
                  <ul className="mt-4 space-y-4">
                    {reviews.map((r) => (
                      <li key={r.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500">
                            {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {r.reviewer?.name ?? "Guest"}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="mt-1 text-sm text-slate-700">{r.comment}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
