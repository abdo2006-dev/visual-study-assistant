import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { VisualBlockRenderer } from "@/components/visuals/visual-block-renderer";
import { visualBlockSchema } from "@/lib/schema/visualBlocks";

function makeBlock(overrides: Partial<Parameters<typeof visualBlockSchema.parse>[0]>) {
  return visualBlockSchema.parse({
    id: "block-1",
    type: "scientific-diagram",
    templateId: "electric-dipole",
    title: "Test visual",
    educationalPurpose: "Testing",
    accessibilityDescription: "A test visual.",
    parameters: {},
    ...overrides,
  });
}

describe("VisualBlockRenderer / electric-dipole", () => {
  it("renders the torque-in-field mode by default", () => {
    render(<VisualBlockRenderer block={makeBlock({})} />);
    expect(screen.getByLabelText("Angle theta between p and E")).toBeInTheDocument();
  });

  it("renders the far-field-comparison mode when requested", () => {
    render(
      <VisualBlockRenderer
        block={makeBlock({ parameters: { mode: "far-field-comparison" } })}
      />
    );
    expect(screen.getByLabelText("Observation distance ratio r/d")).toBeInTheDocument();
    expect(screen.getByText(/twice the/)).toBeInTheDocument();
  });

  it("shows an unsupported-visual fallback when parameters fail validation", () => {
    render(
      <VisualBlockRenderer
        block={makeBlock({ parameters: { initialAngleDegrees: 500 } })}
      />
    );
    expect(
      screen.getByText(/parameters could not be validated/)
    ).toBeInTheDocument();
  });

  it("toggles a Simulate/Pause button that disables the manual slider while running", async () => {
    const user = userEvent.setup();
    render(
      <VisualBlockRenderer
        block={makeBlock({ parameters: { initialAngleDegrees: 179 } })}
      />
    );

    const slider = screen.getByLabelText("Angle theta between p and E");
    expect(slider).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Simulate" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(slider).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Simulate" })).toBeInTheDocument();
    expect(slider).toBeEnabled();
  });
});
