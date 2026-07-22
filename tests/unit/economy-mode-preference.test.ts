import { beforeEach, describe, expect, it } from "vitest";

import {
  getEconomyModeOverride,
  setEconomyModeOverride,
} from "@/lib/settings/economyModePreference";

describe("economyModePreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns undefined when nothing has been stored", () => {
    expect(getEconomyModeOverride()).toBeUndefined();
  });

  it("round-trips a stored mode", () => {
    setEconomyModeOverride("highest-quality");
    expect(getEconomyModeOverride()).toBe("highest-quality");
  });

  it("clears the override when set to undefined", () => {
    setEconomyModeOverride("balanced");
    setEconomyModeOverride(undefined);
    expect(getEconomyModeOverride()).toBeUndefined();
  });

  it("ignores a corrupted or unrecognized stored value", () => {
    window.localStorage.setItem("eduviz:economy-mode-override", "not-a-real-mode");
    expect(getEconomyModeOverride()).toBeUndefined();
  });
});
