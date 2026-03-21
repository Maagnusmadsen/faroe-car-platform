"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { ListingWizardData, StepErrors } from "../types";
import type { Transmission, FuelType, VehicleType } from "@/lib/cars";
import { inputClass, inputErrorClass, labelClass } from "../styles";

const TRANSMISSIONS: { value: Transmission; labelKey: string }[] = [
  { value: "automatic", labelKey: "rent.automatic" },
  { value: "manual", labelKey: "rent.manual" },
];
const FUEL_TYPES: { value: FuelType; labelKey: string }[] = [
  { value: "petrol", labelKey: "rent.petrol" },
  { value: "diesel", labelKey: "rent.diesel" },
  { value: "electric", labelKey: "rent.electric" },
  { value: "hybrid", labelKey: "rent.hybrid" },
];
const SEATS = [5, 6, 7, 9] as const;
const VEHICLE_TYPES: { value: VehicleType; labelKey: string }[] = [
  { value: "car", labelKey: "list.vehicleTypeCar" },
  { value: "van", labelKey: "list.vehicleTypeVan" },
];

interface Step2Props {
  data: ListingWizardData;
  errors: StepErrors;
  onChange: (data: Partial<ListingWizardData>) => void;
}

export default function Step2Specifications({ data, errors, onChange }: Step2Props) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">{t("list.wizardStep2")}</h3>
      <div>
        <label className={labelClass}>{t("list.wizardTransmission")} *</label>
        <div className="mt-2 flex flex-wrap gap-3">
          {TRANSMISSIONS.map(({ value, labelKey }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="transmission"
                checked={data.transmission === value}
                onChange={() => onChange({ transmission: value })}
                className="h-4 w-4 border-slate-300 text-brand focus:ring-brand"
              />
              <span className="text-sm text-slate-700">{t(labelKey)}</span>
            </label>
          ))}
        </div>
        {errors.transmission && (
          <p className="mt-1 text-sm text-red-600">{errors.transmission}</p>
        )}
      </div>
      <div>
        <label className={labelClass}>{t("list.wizardFuelType")} *</label>
        <div className="mt-2 flex flex-wrap gap-3">
          {FUEL_TYPES.map(({ value, labelKey }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="fuelType"
                checked={data.fuelType === value}
                onChange={() => onChange({ fuelType: value })}
                className="h-4 w-4 border-slate-300 text-brand focus:ring-brand"
              />
              <span className="text-sm text-slate-700">{t(labelKey)}</span>
            </label>
          ))}
        </div>
        {errors.fuelType && <p className="mt-1 text-sm text-red-600">{errors.fuelType}</p>}
      </div>
      <div>
        <label className={labelClass}>{t("list.wizardSeats")} *</label>
        <div className="mt-2 flex flex-wrap gap-3">
          {SEATS.map((num) => (
            <label key={num} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="seats"
                checked={data.seats === num}
                onChange={() => onChange({ seats: num })}
                className="h-4 w-4 border-slate-300 text-brand focus:ring-brand"
              />
              <span className="text-sm text-slate-700">{num}</span>
            </label>
          ))}
        </div>
        {errors.seats && <p className="mt-1 text-sm text-red-600">{errors.seats}</p>}
      </div>
      <div>
        <label className={labelClass}>{t("list.wizardVehicleType")} *</label>
        <div className="mt-2 flex flex-wrap gap-3">
          {VEHICLE_TYPES.map(({ value, labelKey }) => (
            <label key={value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="vehicleType"
                checked={data.vehicleType === value}
                onChange={() => onChange({ vehicleType: value })}
                className="h-4 w-4 border-slate-300 text-brand focus:ring-brand"
              />
              <span className="text-sm text-slate-700">{t(labelKey)}</span>
            </label>
          ))}
        </div>
        {errors.vehicleType && (
          <p className="mt-1 text-sm text-red-600">{errors.vehicleType}</p>
        )}
      </div>
      <div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={data.is4x4}
            onChange={(e) => onChange({ is4x4: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
          />
          <span className="text-sm font-medium text-slate-700">{t("list.wizard4x4")}</span>
        </label>
      </div>
      <div>
        <label htmlFor="wizard-luggage" className={labelClass}>
          {t("list.wizardLuggage")}
        </label>
        <input
          id="wizard-luggage"
          type="text"
          value={data.luggageCapacity}
          onChange={(e) => onChange({ luggageCapacity: e.target.value })}
          placeholder={t("list.wizardLuggagePlaceholder")}
          className={inputClass}
        />
      </div>
    </div>
  );
}
