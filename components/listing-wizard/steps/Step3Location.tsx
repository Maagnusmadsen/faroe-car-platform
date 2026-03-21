"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { ListingWizardData, StepErrors } from "../types";
import { inputClass, inputErrorClass, labelClass } from "../styles";
import MapboxLocationPicker from "@/components/map/MapboxLocationPicker";

interface Step3Props {
  data: ListingWizardData;
  errors: StepErrors;
  onChange: (data: Partial<ListingWizardData>) => void;
}

export default function Step3Location({ data, errors, onChange }: Step3Props) {
  const { t } = useLanguage();

  const handleMapSelect = (lat: number, lng: number) => {
    onChange({ latitude: lat, longitude: lng });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">{t("list.wizardStep3")}</h3>
      <div>
        <label htmlFor="wizard-town" className={labelClass}>
          {t("list.wizardTown")} *
        </label>
        <input
          id="wizard-town"
          type="text"
          value={data.town}
          onChange={(e) => onChange({ town: e.target.value })}
          placeholder={t("list.locationPlaceholder")}
          className={errors.town ? inputErrorClass : inputClass}
        />
        {errors.town && <p className="mt-1 text-sm text-red-600">{errors.town}</p>}
      </div>
      <div>
        <label className={labelClass}>Pickup location on map</label>
        <MapboxLocationPicker
          latitude={data.latitude}
          longitude={data.longitude}
          onSelect={handleMapSelect}
          className="mt-1"
        />
      </div>
      <div>
        <label htmlFor="wizard-pickup" className={labelClass}>
          {t("list.wizardPickupLocation")} *
        </label>
        <input
          id="wizard-pickup"
          type="text"
          value={data.pickupLocation}
          onChange={(e) => onChange({ pickupLocation: e.target.value })}
          placeholder={t("rent.pickupPlaceholder")}
          className={errors.pickupLocation ? inputErrorClass : inputClass}
        />
        {errors.pickupLocation && (
          <p className="mt-1 text-sm text-red-600">{errors.pickupLocation}</p>
        )}
      </div>
      <div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={data.airportPickup}
            onChange={(e) => onChange({ airportPickup: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
          />
          <span className="text-sm font-medium text-slate-700">
            {t("rent.airportPickupAvailable")}
          </span>
        </label>
      </div>
      <div>
        <label htmlFor="wizard-instructions" className={labelClass}>
          {t("list.wizardPickupInstructions")}
        </label>
        <textarea
          id="wizard-instructions"
          rows={3}
          value={data.pickupInstructions}
          onChange={(e) => onChange({ pickupInstructions: e.target.value })}
          placeholder={t("list.wizardPickupInstructionsPlaceholder")}
          className={inputClass}
        />
      </div>
    </div>
  );
}
