import type { Resistor } from "@/lib/schema/templates/simpleCircuit";

export interface ResistorResult extends Resistor {
  currentAmps: number;
  voltageDropVolts: number;
}

export interface CircuitResult {
  totalResistanceOhms: number;
  totalCurrentAmps: number;
  resistorResults: ResistorResult[];
}

export function calculateCircuit(
  configuration: "series" | "parallel",
  voltageSource: number,
  resistors: Resistor[]
): CircuitResult {
  if (configuration === "series") {
    const totalResistanceOhms = resistors.reduce((sum, r) => sum + r.resistanceOhms, 0);
    const totalCurrentAmps = voltageSource / totalResistanceOhms;
    return {
      totalResistanceOhms,
      totalCurrentAmps,
      resistorResults: resistors.map((r) => ({
        ...r,
        currentAmps: totalCurrentAmps,
        voltageDropVolts: totalCurrentAmps * r.resistanceOhms,
      })),
    };
  }

  const totalResistanceOhms = 1 / resistors.reduce((sum, r) => sum + 1 / r.resistanceOhms, 0);
  const totalCurrentAmps = voltageSource / totalResistanceOhms;
  return {
    totalResistanceOhms,
    totalCurrentAmps,
    resistorResults: resistors.map((r) => ({
      ...r,
      currentAmps: voltageSource / r.resistanceOhms,
      voltageDropVolts: voltageSource,
    })),
  };
}
