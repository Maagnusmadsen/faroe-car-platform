import { formatMoney } from "@/lib/owner-dashboard-utils";

interface FlowStep {
  label: string;
  value: number;
  currency: string;
  type?: "positive" | "negative";
}

interface FinancialFlowProps {
  steps: FlowStep[];
  resultLabel: string;
  resultValue: number;
  resultCurrency: string;
}

export default function FinancialFlow({
  steps,
  resultLabel,
  resultValue,
  resultCurrency,
}: FinancialFlowProps) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center justify-between">
          <span className="text-sm text-slate-600">{step.label}</span>
          <span
            className={`text-sm font-medium ${
              step.type === "negative" ? "text-slate-600" : "text-slate-900"
            }`}
          >
            {step.type === "negative" && step.value > 0 ? "−" : ""}
            {formatMoney(step.value, step.currency)}
          </span>
        </div>
      ))}
      <div className="border-t border-slate-200 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-900">{resultLabel}</span>
          <span className="text-lg font-bold text-brand">{formatMoney(resultValue, resultCurrency)}</span>
        </div>
      </div>
    </div>
  );
}
