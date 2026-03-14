"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import WizardStepper from "./WizardStepper";
import { initialWizardData, type ListingWizardData, type StepErrors } from "./types";
import { validateStep, isStepValid } from "./validateSteps";
import Step1CarDetails from "./steps/Step1CarDetails";
import Step2Specifications from "./steps/Step2Specifications";
import Step3Location from "./steps/Step3Location";
import Step4Photos from "./steps/Step4Photos";
import Step5Pricing from "./steps/Step5Pricing";
import Step6Availability from "./steps/Step6Availability";
import Step7Review from "./steps/Step7Review";

const STEPS = 7;
const DRAFT_STORAGE_KEY = "faroe-rent-draft-listing-id";

function wizardDataToPayload(data: ListingWizardData): Record<string, unknown> {
  return {
    title: data.title,
    type: data.type,
    brand: data.brand,
    model: data.model,
    year: data.year,
    description: data.description,
    transmission: data.transmission,
    fuelType: data.fuelType,
    seats: data.seats,
    vehicleType: data.vehicleType,
    is4x4: data.is4x4,
    luggageCapacity: data.luggageCapacity,
    town: data.town,
    pickupLocation: data.pickupLocation,
    latitude: data.latitude,
    longitude: data.longitude,
    airportPickup: data.airportPickup,
    pickupInstructions: data.pickupInstructions,
    imageUrls: data.imageUrls,
    imageIds: data.imageIds,
    pricePerDay: data.pricePerDay,
    minimumRentalDays: data.minimumRentalDays,
    weeklyDiscount: data.weeklyDiscount,
    monthlyDiscount: data.monthlyDiscount,
    blockedDates: data.blockedDates,
    minimumNoticeDays: data.minimumNoticeDays,
    advanceBookingDays: data.advanceBookingDays,
    confirmInsurance: data.confirmInsurance,
    confirmAllowed: data.confirmAllowed,
    confirmCorrect: data.confirmCorrect,
  };
}

export default function ListingWizard() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftFromUrl = searchParams.get("draft");

  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<ListingWizardData>(initialWizardData);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<StepErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const updateData = useCallback((partial: Partial<ListingWizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(partial).forEach((k) => delete next[k as keyof StepErrors]);
      return next;
    });
  }, []);

  // Initialize draft: restore from URL or sessionStorage, or create new
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!draftFromUrl) {
        const stored = typeof window !== "undefined" ? sessionStorage.getItem(DRAFT_STORAGE_KEY) : null;
        if (stored) {
          router.replace(`/list-your-car?draft=${stored}`, { scroll: false });
          setLoading(false);
          return;
        }
        const createRes = await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (cancelled) return;
        if (createRes.ok) {
          const createJson = await createRes.json();
          const newId = createJson.data.id;
          setDraftId(newId);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(DRAFT_STORAGE_KEY, newId);
            router.replace(`/list-your-car?draft=${newId}`, { scroll: false });
          }
        } else {
          setLoadError("Could not create draft");
        }
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/listings/${draftFromUrl}`);
      if (cancelled) return;
      if (res.ok) {
        const json = await res.json();
        setData(json.data as ListingWizardData);
        setDraftId(draftFromUrl);
        if (typeof window !== "undefined") sessionStorage.setItem(DRAFT_STORAGE_KEY, draftFromUrl);
      } else if (res.status === 404) {
        const createRes = await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (cancelled) return;
        if (createRes.ok) {
          const createJson = await createRes.json();
          const newId = createJson.data.id;
          setDraftId(newId);
          if (typeof window !== "undefined") {
            sessionStorage.setItem(DRAFT_STORAGE_KEY, newId);
            router.replace(`/list-your-car?draft=${newId}`, { scroll: false });
          }
        } else {
          setLoadError("Could not create draft");
        }
      } else {
        setLoadError("Could not load draft");
      }
      setLoading(false);
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [draftFromUrl, router]);

  const goNext = useCallback(async () => {
    const stepErrors = validateStep(step - 1, data);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    setSaveError(null);
    if (draftId) {
      const res = await fetch(`/api/listings/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wizardDataToPayload(data)),
      });
      if (!res.ok) {
        setSaveError("Could not save draft");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS));
  }, [step, data, draftId]);

  const goBack = useCallback(() => {
    setErrors({});
    setSaveError(null);
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handlePublish = useCallback(async () => {
    const stepErrors = validateStep(6, data);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    setPublishError(null);
    if (!draftId) {
      setPublishError("No draft to publish");
      return;
    }
    const res = await fetch(`/api/listings/${draftId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wizardDataToPayload(data)),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.data?.id) {
      if (typeof window !== "undefined") sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      setPublishSuccess(true);
      setTimeout(() => {
        router.push(`/rent-a-car/${json.data.id}`);
      }, 1500);
    } else {
      const msg = json.details
        ? Object.values(json.details).join(". ")
        : json.error || "Failed to publish";
      setPublishError(typeof msg === "string" ? msg : "Failed to publish");
    }
  }, [data, draftId, router]);

  const canGoNext = step < STEPS && isStepValid(step - 1, data);
  const isLastStep = step === STEPS;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12 text-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12 text-center">
        <p className="text-red-600">{loadError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (publishSuccess) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          ✓
        </div>
        <h3 className="mt-4 text-xl font-semibold text-slate-900">
          {t("list.publishSuccessTitle")}
        </h3>
        <p className="mt-2 text-slate-600">{t("list.publishSuccessMessage")}</p>
        <p className="mt-4 text-sm text-slate-500">{t("list.publishSuccessRedirect")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <WizardStepper currentStep={step} />
      <div className="min-h-[320px]">
        {step === 1 && (
          <Step1CarDetails data={data} errors={errors} onChange={updateData} />
        )}
        {step === 2 && (
          <Step2Specifications data={data} errors={errors} onChange={updateData} />
        )}
        {step === 3 && (
          <Step3Location data={data} errors={errors} onChange={updateData} />
        )}
        {step === 4 && (
          <Step4Photos
            data={data}
            errors={errors}
            onChange={updateData}
            draftId={draftId}
          />
        )}
        {step === 5 && (
          <Step5Pricing data={data} errors={errors} onChange={updateData} />
        )}
        {step === 6 && (
          <Step6Availability data={data} errors={errors} onChange={updateData} />
        )}
        {step === 7 && (
          <Step7Review data={data} errors={errors} onChange={updateData} />
        )}
      </div>
      {(saveError || publishError) && (
        <p className="mt-4 text-sm text-red-600">{saveError || publishError}</p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
        <div>
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("list.wizardBack")}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {isLastStep ? (
            <button
              type="button"
              onClick={handlePublish}
              disabled={
                !data.confirmInsurance || !data.confirmAllowed || !data.confirmCorrect
              }
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {t("list.wizardPublish")}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {t("list.wizardNext")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
