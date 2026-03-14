"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { ListingWizardData, StepErrors } from "../types";
import { inputClass, inputErrorClass, labelClass } from "../styles";

interface Step5Props {
  data: ListingWizardData;
  errors: StepErrors;
  onChange: (data: Partial<ListingWizardData>) => void;
}

export default function Step5Pricing({ data, errors, onChange }: Step5Props) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">{t("list.wizardStep5")}</h3>
      <div>
        <label htmlFor="wizard-price" className={labelClass}>
          {t("list.pricePerDay")} (DKK) *
        </label>
        <input
          id="wizard-price"
          type="number"
          min="1"
          step="1"
          value={data.pricePerDay}
          onChange={(e) => onChange({ pricePerDay: e.target.value })}
          placeholder={t("list.pricePlaceholder")}
          className={errors.pricePerDay ? inputErrorClass : inputClass}
        />
        {errors.pricePerDay && (
          <p className="mt-1 text-sm text-red-600">{errors.pricePerDay}</p>
        )}
      </div>
      <div>
        <label htmlFor="wizard-min-days" className={labelClass}>
          {t("list.wizardMinRentalDays")}
        </label>
        <input
          id="wizard-min-days"
          type="number"
          min="0"
          step="1"
          value={data.minimumRentalDays}
          onChange={(e) => onChange({ minimumRentalDays: e.target.value })}
          placeholder="0"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="wizard-weekly" className={labelClass}>
          {t("list.wizardWeeklyDiscount")} (%)
        </label>
        <input
          id="wizard-weekly"
          type="number"
          min="0"
          max="100"
          step="1"
          value={data.weeklyDiscount}
          onChange={(e) => onChange({ weeklyDiscount: e.target.value })}
          placeholder="0"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="wizard-monthly" className={labelClass}>
          {t("list.wizardMonthlyDiscount")} (%)
        </label>
        <input
          id="wizard-monthly"
          type="number"
          min="0"
          max="100"
          step="1"
          value={data.monthlyDiscount}
          onChange={(e) => onChange({ monthlyDiscount: e.target.value })}
          placeholder="0"
          className={inputClass}
        />
      </div>
    </div>
  );
}
