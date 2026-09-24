import { it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "@/test/memoryRouter";
import { Navigate } from "@/lib/router-compat";
it("dbg", async () => {
  const errs: unknown[] = [];
  render(<MemoryRouter initialEntries={["/"]}><Routes>
    <Route path="/" element={<Navigate to="/calendario" replace />} />
    <Route path="/calendario" element={<p>CAL</p>} />
  </Routes></MemoryRouter>);
  await new Promise((r) => setTimeout(r, 300));
  console.log("HTML", document.body.innerHTML, errs);
  screen.getByText("CAL");
});
