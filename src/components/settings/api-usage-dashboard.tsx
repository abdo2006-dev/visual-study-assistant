"use client";

import { useEffect, useState } from "react";

import type { ApiUsageRecord } from "@/lib/storage/db";
import {
  getApiUsageSince,
  pruneApiUsageOlderThan,
} from "@/lib/storage/apiUsageRepository";

/**
 * Best-known free-tier limits per model family, gathered from public
 * reporting rather than a live API — Google's own rate-limits docs don't
 * publish numbers on the page itself (they point to a personal dashboard
 * instead, see the link below), and third-party reports of the exact
 * numbers disagree and have shifted multiple times through 2026. Treat
 * this strictly as a rough reference, not a precise "remaining" count.
 */
const REFERENCE_LIMITS: {
  modelPrefix: string;
  label: string;
  rpm: string;
  rpd: string;
}[] = [
  { modelPrefix: "gemini-flash-lite", label: "Economical", rpm: "15", rpd: "1,000" },
  { modelPrefix: "gemini-flash", label: "Balanced", rpm: "10", rpd: "250" },
  { modelPrefix: "gemini-pro", label: "Highest quality", rpm: "5", rpd: "50–100" },
];

const DAYS_TO_KEEP = 90;

interface ModelSummary {
  model: string;
  requestsToday: number;
  tokensToday: number;
  requestsTotal: number;
  tokensTotal: number;
}

// A rolling 24h window rather than "since local midnight" — Google's free-tier
// quota actually resets at midnight Pacific time, which wouldn't match the
// viewer's local midnight anyway, so a rolling window avoids implying an
// alignment with Google's reset boundary that doesn't exist.
function last24hIso(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

function summarizeByModel(records: ApiUsageRecord[], sinceIso: string): ModelSummary[] {
  const byModel = new Map<string, ModelSummary>();
  for (const record of records) {
    const existing = byModel.get(record.model) ?? {
      model: record.model,
      requestsToday: 0,
      tokensToday: 0,
      requestsTotal: 0,
      tokensTotal: 0,
    };
    existing.requestsTotal += 1;
    existing.tokensTotal += record.totalTokens;
    if (record.timestamp >= sinceIso) {
      existing.requestsToday += 1;
      existing.tokensToday += record.totalTokens;
    }
    byModel.set(record.model, existing);
  }
  return Array.from(byModel.values()).sort((a, b) => b.requestsTotal - a.requestsTotal);
}

function referenceFor(model: string) {
  return REFERENCE_LIMITS.find((entry) => model.includes(entry.modelPrefix));
}

export function ApiUsageDashboard() {
  const [summaries, setSummaries] = useState<ModelSummary[] | null>(null);
  const [recordCount, setRecordCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void pruneApiUsageOlderThan(DAYS_TO_KEEP);
    getApiUsageSince(new Date(Date.now() - DAYS_TO_KEEP * 24 * 60 * 60 * 1000).toISOString())
      .then((records) => {
        if (cancelled) return;
        setRecordCount(records.length);
        setSummaries(summarizeByModel(records, last24hIso()));
      })
      .catch(() => {
        if (!cancelled) setSummaries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4">
      <div>
        <h2 className="text-sm font-semibold">API usage</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Requests and tokens this app has actually sent to Gemini, logged
          locally from each response — not fetched live from Google, since
          there&apos;s no API for that (see the note below).
        </p>
      </div>

      {summaries === null ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : summaries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No AI calls logged yet on this device.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-1.5 pr-3 font-medium">Model</th>
                <th className="py-1.5 pr-3 font-medium">Requests (24h)</th>
                <th className="py-1.5 pr-3 font-medium">Tokens (24h)</th>
                <th className="py-1.5 pr-3 font-medium">Requests (last {DAYS_TO_KEEP}d)</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => {
                const reference = referenceFor(summary.model);
                return (
                  <tr key={summary.model} className="border-b border-border/60">
                    <td className="py-1.5 pr-3 font-mono">{summary.model}</td>
                    <td className="py-1.5 pr-3">
                      {summary.requestsToday}
                      {reference && (
                        <span className="text-muted-foreground"> / ~{reference.rpd}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3">{summary.tokensToday.toLocaleString()}</td>
                    <td className="py-1.5 pr-3">{summary.requestsTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Free-tier reference (approximate)</p>
        <ul className="flex flex-col gap-0.5">
          {REFERENCE_LIMITS.map((entry) => (
            <li key={entry.modelPrefix}>
              {entry.label}: ~{entry.rpm} requests/min, ~{entry.rpd} requests/day
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md bg-muted px-3 py-2 text-xs text-foreground/70">
        <p className="font-medium text-foreground">About these numbers</p>
        <p className="mt-1">
          The counts above are exact — this app logs every real Gemini
          response it receives, including token counts Google returns with
          it. The &ldquo;/ [number]&rdquo; reference figures next to them
          are<strong> not</strong> that precise: Google doesn&apos;t publish
          exact free-tier limits on its rate-limits page, and third-party
          reports of the numbers have disagreed and changed multiple times
          through 2026 — treat them as a rough guide, not a guarantee. If
          you use this API key anywhere else, its real remaining quota will
          also be lower than what this device alone shows.
        </p>
        <p className="mt-2">
          Also worth checking directly: some reports say Google moved{" "}
          <span className="font-mono">gemini-pro-latest</span> (this app&apos;s
          &ldquo;highest quality&rdquo; mode) behind billing during 2026, no
          longer included in the free tier at all. If you&apos;re relying on
          the free tier, verify this before generating lessons in that mode.
        </p>
        <p className="mt-2">
          For your exact, live, authoritative limits, check{" "}
          <a
            href="https://aistudio.google.com/rate-limit"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Google AI Studio&apos;s rate-limit dashboard
          </a>
          .
        </p>
      </div>

      {recordCount > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {recordCount} logged call{recordCount === 1 ? "" : "s"} in the last{" "}
          {DAYS_TO_KEEP} days on this device. Older entries are pruned automatically.
        </p>
      )}
    </div>
  );
}
