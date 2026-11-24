// Today's date ("YYYY-MM-DD"), read in the browser only.
// During the build and on the server it is null: the server's clock may be in
// another time zone, and a date baked in at build time would go stale.

import { useSyncExternalStore } from "react";
import { todayISO } from "@/lib/validation";

const noSubscribe = () => () => {};

export function useToday(): string | null {
  return useSyncExternalStore(noSubscribe, () => todayISO(), () => null);
}
