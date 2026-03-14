"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { ListingWizardData, StepErrors } from "../types";

interface Step7Props {
  data: ListingWizardData;
  errors: StepErrors;
  onChange: (data: Partial<ListingWizardData>) => void;
}

export default function Step7Review({ data, errors, onChange }: Step7Props) {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-semibold text-slate-900">{t("list.wizardStep7")}</h3>

      <section>
        <h4 className="mb-2 font-medium text-slate-800">{t("list.wizardStep1")}</h4>
        <p className="text-sm text-slate-600">
          {data.title?.trim() || `${data.brand} ${data.model}`} ({data.year})
          {data.type && ` · ${data.type === "ride_share" ? "Ride share" : "Car rental"}`}
        </p>
        {data.description && (
          <p className="mt-1 text-sm text-slate-600 line-clamp-3">{data.description}</p>
        )}
      </section>

      <section>
        <h4 className="mb-2 font-medium text-slate-800">{t("list.wizardStep2")}</h4>
        <p className="text-sm text-slate-600">
          {data.transmission && t(`rent.${data.transmission}`)} · {data.fuelType && t(`rent.${data.fuelType}`)} · {data.seats} {t("list.wizardSeats")} · {data.vehicleType && t(`list.vehicleType${data.vehicleType === "van" ? "Van" : "Car"}`)}
          {data.is4x4 && ` · 4x4`}
        </p>
      </section>

      <section>
        <h4 className="mb-2 font-medium text-slate-800">{t("list.wizardStep3")}</h4>
        <p className="text-sm text-slate-600">
          {data.town}, {data.pickupLocation}
          {data.airportPickup && ` · ${t("rent.airportPickupAvailable")}`}
        </p>
      </section>

      <section>
        <h4 className="mb-2 font-medium text-slate-800">{t("list.wizardStep4")}</h4>
        <p className="text-sm text-slate-600">
          {data.imageUrls.length} {t("list.wizardPhotosCount")}
        </p>
      </section>

      <section>
        <h4 className="mb-2 font-medium text-slate-800">{t("list.wizardStep5")}</h4>
        <p className="text-sm text-slate-600">
          {data.pricePerDay} DKK / {t("rent.perDay")}
          {data.minimumRentalDays && ` · ${t("list.wizardMinRentalDays")}: ${data.minimumRentalDays}`}
        </p>
      </section>

      <section>
        <h4 className="mb-2 font-medium text-slate-800">{t("list.wizardStep6")}</h4>
        <p className="text-sm text-slate-600">
          {data.blockedDates.length > 0
            ? `${t("list.wizardBlockedDates")}: ${data.blockedDates.length}`
            : t("list.wizardNoBlocks")}
        </p>
      </section>

      <hr className="border-slate-200" />

      <div className="space-y-4">
        <h4 className="font-medium text-slate-800">{t("list.wizardConfirmTitle")}</h4>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={data.confirmInsurance}
            onChange={(e) => onChange({ confirmInsurance: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-700">{t("list.wizardConfirmInsurance")}</span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={data.confirmAllowed}
            onChange={(e) => onChange({ confirmAllowed: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-700">{t("list.wizardConfirmAllowed")}</span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={data.confirmCorrect}
            onChange={(e) => onChange({ confirmCorrect: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-700">{t("list.wizardConfirmCorrect")}</span>
        </label>
        {(errors.confirmInsurance || errors.confirmAllowed || errors.confirmCorrect) && (
          <p className="text-sm text-red-600">
            {errors.confirmInsurance || errors.confirmAllowed || errors.confirmCorrect}
          </p>
        )}
      </div>
    </div>
  );
}
