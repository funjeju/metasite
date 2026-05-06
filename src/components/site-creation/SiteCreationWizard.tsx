"use client";

import { useSiteCreationStore } from "@/store/useSiteCreationStore";
import { Step1Identity } from "./steps/Step1Identity";
import { Step2Hosting } from "./steps/Step2Hosting";
import { Step3HostingSetup } from "./steps/Step3HostingSetup";
import { Step4ContentIdentity } from "./steps/Step4ContentIdentity";
import { Step5SourcesPhase } from "./steps/Step5SourcesPhase";
import { Step6Review } from "./steps/Step6Review";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { num: 1, label: "정체성" },
  { num: 2, label: "호스팅" },
  { num: 3, label: "셋업" },
  { num: 4, label: "콘텐츠" },
  { num: 5, label: "출처" },
  { num: 6, label: "검토" },
];

export function SiteCreationWizard() {
  const { step } = useSiteCreationStore();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center">
        {STEPS.map((s, idx) => (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                  step > s.num
                    ? "border-primary bg-primary text-white"
                    : step === s.num
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                )}
              >
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span
                className={cn(
                  "mt-1 text-[10px] font-medium whitespace-nowrap",
                  step === s.num ? "text-primary" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mb-4 transition-colors",
                  step > s.num ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="animate-fade-in">
        {step === 1 && <Step1Identity />}
        {step === 2 && <Step2Hosting />}
        {step === 3 && <Step3HostingSetup />}
        {step === 4 && <Step4ContentIdentity />}
        {step === 5 && <Step5SourcesPhase />}
        {step === 6 && <Step6Review />}
      </div>
    </div>
  );
}
