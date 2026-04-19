import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./pages/Index", () => ({
  default: () => <div>HOME MOCK</div>,
}));

vi.mock("./pages/SinnerPage", () => ({
  default: () => <div>SINNER MOCK</div>,
}));

vi.mock("./pages/JuventusPage", () => ({
  default: () => <div>JUVENTUS MOCK</div>,
}));

vi.mock("./pages/Formula1Page", () => ({
  default: () => <div>FORMULA 1 MOCK</div>,
}));

vi.mock("./pages/MotoGPPage", () => ({
  default: () => <div>MOTOGP MOCK</div>,
}));

vi.mock("./pages/NotFound", () => ({
  default: () => <div>NOT FOUND MOCK</div>,
}));

import App from "./App";

describe("App code splitting", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("loads secondary routes lazily behind a Suspense boundary", () => {
    const appSource = readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf8");

    expect(appSource).toContain("lazy(() => import(\"./pages/SinnerPage\"))");
    expect(appSource).toContain("lazy(() => import(\"./pages/JuventusPage\"))");
    expect(appSource).toContain("lazy(() => import(\"./pages/Formula1Page\"))");
    expect(appSource).toContain("lazy(() => import(\"./pages/MotoGPPage\"))");
    expect(appSource).toContain("lazy(() => import(\"./pages/NotFound\"))");
    expect(appSource).toContain("<Suspense");
    expect(appSource).not.toContain('import SinnerPage from "./pages/SinnerPage";');
    expect(appSource).not.toContain('import JuventusPage from "./pages/JuventusPage";');
    expect(appSource).not.toContain('import Formula1Page from "./pages/Formula1Page";');
    expect(appSource).not.toContain('import MotoGPPage from "./pages/MotoGPPage";');
    expect(appSource).not.toContain('import NotFound from "./pages/NotFound";');
  });

  it("keeps route rendering working for a secondary page", async () => {
    window.history.pushState({}, "", "/formula1");

    render(<App />);

    expect(await screen.findByText("FORMULA 1 MOCK")).toBeInTheDocument();
  });
});