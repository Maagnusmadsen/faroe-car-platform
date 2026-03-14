"use client";

import { useLanguage } from "@/context/LanguageContext";

const STEPS = 7;

interface WizardStepperProps {
  currentStep: number;
}

export default function WizardStepper({ currentStep }: WizardStepperProps) {
  const { t } = useLanguage();
  const progress = (currentStep / STEPS) * 100;

  return (
    <div className="mb-8">
      <p className="mb-2 text-center text-sm font-medium text-slate-500">
        {t("list.wizardProgress")} {currentStep} / {STEPS}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 flex justify-between">
        {Array.from({ length: STEPS }, (_, i) => {
          const stepNum = i + 1;
          const isActive = currentStep === stepNum;
          const isComplete = currentStep > stepNum;
          return (
            <div
              key={stepNum}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : isComplete
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-400"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              {isComplete ? "✓" : stepNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}
