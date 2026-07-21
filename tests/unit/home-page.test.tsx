import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

import NewLessonPage from "@/app/page";
import { ThemeProvider } from "@/components/theme-provider";

describe("NewLessonPage", () => {
  it("renders the app shell and the new-lesson form", () => {
    render(
      <ThemeProvider attribute="class">
        <NewLessonPage />
      </ThemeProvider>
    );

    expect(
      screen.getByRole("heading", { name: /new lesson/i })
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/paste a text explanation/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /library/i })).toBeInTheDocument();
  });
});
