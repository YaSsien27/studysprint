// Next.js runs this file before every matching request (in Next.js 16 this
// file is called proxy.ts; older versions called it middleware.ts).

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Every page, but not Next.js's own files or images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
