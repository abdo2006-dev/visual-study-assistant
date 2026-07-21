import { describe, expect, it } from "vitest";

import {
  countBySide,
  initializeParticles,
  stepParticles,
} from "@/components/visuals/simulation/particle-container-physics";

describe("initializeParticles", () => {
  it("splits particles across the membrane according to concentration ratio", () => {
    const particles = initializeParticles(100, 0.9, 0.1, true);
    const { left, right } = countBySide(particles);
    expect(left).toBeGreaterThan(right);
    expect(left + right).toBe(100);
  });

  it("keeps every particle within the [0,1] box", () => {
    const particles = initializeParticles(50, 0.5, 0.5, false);
    for (const p of particles) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });
});

describe("stepParticles", () => {
  it("keeps particles within bounds after many steps", () => {
    let particles = initializeParticles(30, 0.5, 0.5, false);
    for (let i = 0; i < 200; i++) {
      particles = stepParticles(particles, false, false);
    }
    for (const p of particles) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });

  it("never lets a particle cross an impermeable membrane", () => {
    let particles = initializeParticles(40, 1, 0, true);
    for (let i = 0; i < 300; i++) {
      particles = stepParticles(particles, true, false);
    }
    const { right } = countBySide(particles);
    expect(right).toBe(0);
  });

  it("allows particles to cross a permeable membrane over time", () => {
    let particles = initializeParticles(60, 1, 0, true);
    // Deterministic "random" that always pushes particles rightward.
    const alwaysRight = () => 1;
    for (let i = 0; i < 50; i++) {
      particles = stepParticles(particles, true, true, alwaysRight);
    }
    const { right } = countBySide(particles);
    expect(right).toBeGreaterThan(0);
  });
});
