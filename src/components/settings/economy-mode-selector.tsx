"use client";

import { useEffect, useState } from "react";

import type { EconomyMode } from "@/lib/ai/economyMode";
import {
  getEconomyModeOverride,
  setEconomyModeOverride,
} from "@/lib/settings/economyModePreference";

type OptionValue = EconomyMode | "auto";

const OPTIONS: {
  value: OptionValue;
  label: string;
  model: string | null;
  description: string;
}[] = [
  {
    value: "auto",
    label: "Automatic (recommended)",
    model: null,
    description:
      "Each action uses whichever mode suits it best: balanced quality for lesson text, visuals, and chat edits; economical for extraction, verification, and bulk-import outlines.",
  },
  {
    value: "economical",
    label: "Economical",
    model: "gemini-flash-lite-latest",
    description: "Cheapest and fastest, ~1,000 requests/day on the free tier. Lower visual/text quality.",
  },
  {
    value: "balanced",
    label: "Balanced",
    model: "gemini-flash-latest",
    description: "Better quality, ~250 requests/day on the free tier. This app's default for lesson content.",
  },
  {
    value: "highest-quality",
    label: "Highest quality",
    model: "gemini-pro-latest",
    description:
      "Best output, ~50–100 requests/day on the free tier — may require billing (see the usage notes below).",
  },
];

export function EconomyModeSelector() {
  const [selected, setSelected] = useState<OptionValue>("auto");

  useEffect(() => {
    Promise.resolve(getEconomyModeOverride()).then((mode) => {
      setSelected(mode ?? "auto");
    });
  }, []);

  function handleSelect(value: OptionValue) {
    setSelected(value);
    setEconomyModeOverride(value === "auto" ? undefined : value);
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <div>
        <h2 className="text-sm font-semibold">AI quality mode</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Overrides which Gemini model every AI action uses on this device.
          Applies to new lessons, chat edits, verification, and bulk import.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">AI quality mode</legend>
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              type="radio"
              name="economy-mode"
              value={option.value}
              checked={selected === option.value}
              onChange={() => handleSelect(option.value)}
              className="mt-1"
            />
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm font-medium">
                {option.label}
                {option.model && (
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    {option.model}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
