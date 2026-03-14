"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { ListingWizardData, StepErrors } from "../types";
import { inputClass, labelClass } from "../styles";

interface Step6Props {
  data: ListingWizardData;
  errors: StepErrors;
  onChange: (data: Partial<ListingWizardData>) => void;
}

export default function Step6Availability({ data, errors, onChange }: Step6Props) {
  const { t } = useLanguage();
  const [newBlockDate, setNewBlockDate] = useState("");

  const addBlockedDate = () => {
    if (!newBlockDate.trim()) return;
    if (data.blockedDates.includes(newBlockDate)) return;
    onChange({ blockedDates: [...data.blockedDates, newBlockDate].sort() });
    setNewBlockDate("");
  };

  const removeBlockedDate = (date: string) => {
    onChange({ blockedDates: data.blockedDates.filter((d) => d !== date) });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">{t("list.wizardStep6")}</h3>
      <p className="text-sm text-slate-600">{t("list.wizardAvailabilityHint")}</p>
      <div>
        <label className={labelClass}>{t("list.wizardBlockedDates")}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="date"
            value={newBlockDate}
            onChange={(e) => setNewBlockDate(e.target.value)}
            className={inputClass}
            style={{ maxWidth: "12rem" }}
          />
          <button
            type="button"
            onClick={addBlockedDate}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("list.wizardAddBlock")}
          </button>
        </div>
        {data.blockedDates.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {data.blockedDates.map((d) => (
              <li
                key={d}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm"
              >
                {d}
                <button
                  type="button"
                  onClick={() => removeBlockedDate(d)}
                  className="text-slate-500 hover:text-red-600"
                  aria-label={t("list.wizardRemove")}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label htmlFor="wizard-notice" className={labelClass}>
          {t("list.wizardMinNotice")}
        </label>
        <input
          id="wizard-notice"
          type="number"
          min="0"
          value={data.minimumNoticeDays}
          onChange={(e) => onChange({ minimumNoticeDays: e.target.value })}
          placeholder="0"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="wizard-advance" className={labelClass}>
          {t("list.wizardAdvanceBooking")}
        </label>
        <input
          id="wizard-advance"
          type="number"
          min="0"
          value={data.advanceBookingDays}
          onChange={(e) => onChange({ advanceBookingDays: e.target.value })}
          placeholder="365"
          className={inputClass}
        />
      </div>
    </div>
  );
}
