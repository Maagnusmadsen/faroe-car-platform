"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { ListingWizardData, StepErrors } from "../types";
import { inputClass, inputErrorClass, labelClass } from "../styles";

interface Step1Props {
  data: ListingWizardData;
  errors: StepErrors;
  onChange: (data: Partial<ListingWizardData>) => void;
}

export default function Step1CarDetails({ data, errors, onChange }: Step1Props) {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">{t("list.wizardStep1")}</h3>
      <div>
        <label htmlFor="wizard-title" className={labelClass}>
          Title *
        </label>
        <input
          id="wizard-title"
          type="text"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Toyota Yaris 2022"
          className={errors.title ? inputErrorClass : inputClass}
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>
      <div>
        <label className={labelClass}>Type *</label>
        <div className="flex gap-4 mt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="wizard-type"
              checked={data.type === "car_rental"}
              onChange={() => onChange({ type: "car_rental" })}
              className="rounded border-slate-300"
            />
            <span>Car rental</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="wizard-type"
              checked={data.type === "ride_share"}
              onChange={() => onChange({ type: "ride_share" })}
              className="rounded border-slate-300"
            />
            <span>Ride share</span>
          </label>
        </div>
        {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
      </div>
      <div>
        <label htmlFor="wizard-brand" className={labelClass}>
          {t("list.brand")} *
        </label>
        <input
          id="wizard-brand"
          type="text"
          value={data.brand}
          onChange={(e) => onChange({ brand: e.target.value })}
          placeholder={t("list.brandPlaceholder")}
          className={errors.brand ? inputErrorClass : inputClass}
        />
        {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand}</p>}
      </div>
      <div>
        <label htmlFor="wizard-model" className={labelClass}>
          {t("list.model")} *
        </label>
        <input
          id="wizard-model"
          type="text"
          value={data.model}
          onChange={(e) => onChange({ model: e.target.value })}
          placeholder={t("list.modelPlaceholder")}
          className={errors.model ? inputErrorClass : inputClass}
        />
        {errors.model && <p className="mt-1 text-sm text-red-600">{errors.model}</p>}
      </div>
      <div>
        <label htmlFor="wizard-year" className={labelClass}>
          {t("list.year")} *
        </label>
        <input
          id="wizard-year"
          type="number"
          min="1990"
          max={currentYear + 1}
          value={data.year}
          onChange={(e) => onChange({ year: e.target.value })}
          placeholder={t("list.yearPlaceholder")}
          className={errors.year ? inputErrorClass : inputClass}
        />
        {errors.year && <p className="mt-1 text-sm text-red-600">{errors.year}</p>}
      </div>
      <div>
        <label htmlFor="wizard-description" className={labelClass}>
          {t("list.description")} *
        </label>
        <textarea
          id="wizard-description"
          rows={5}
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={t("list.descriptionPlaceholder")}
          className={errors.description ? inputErrorClass : inputClass}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>
    </div>
  );
}
