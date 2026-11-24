// The link in the "confirm your email" message comes here with a one-time
// code. We swap it for a login session (saved in cookies) and continue to the app.

import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safeNext";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/login?error=confirm", origin));
}
