// Render a component and wait until its data has loaded from the (fake) database.

import { act, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { Toaster } from "@/components/Toaster";

export async function renderLoaded(ui: ReactElement) {
  // Include the Toaster, like the real layout, so tests can check toast messages.
  const result = render(
    <>
      {ui}
      <Toaster />
    </>,
  );
  // Let the fake database's promises finish inside act(), so React applies the update.
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  return result;
}
