import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { parseHost } from "@/lib/host";

export async function middleware(request: NextRequest) {
  const hostCtx = parseHost(request.headers.get("host"));
  const path = request.nextUrl.pathname;

  // --- Studio subdomain: public surface + client galleries ---
  if (hostCtx.kind === "studio") {
    // Photographer app does not live on studio hosts
    if (
      path.startsWith("/dashboard") ||
      path.startsWith("/login") ||
      path.startsWith("/signup")
    ) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        `${request.nextUrl.protocol}//${request.nextUrl.host}`;
      const target = new URL(path, appUrl);
      return NextResponse.redirect(target);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-studio-slug", hostCtx.slug);

    // Apex of studio host → internal studio landing
    if (path === "/" || path === "") {
      const url = request.nextUrl.clone();
      url.pathname = `/s/${hostCtx.slug}`;
      return NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
      });
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // --- Marketing apex: optional future split; for now allow all ---
  // (when pofo.app is live, you can redirect /dashboard → app.pofo.app)

  // --- App host: auth session + dashboard guards ---
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboard = path.startsWith("/dashboard");
  const isAuth = path.startsWith("/login") || path.startsWith("/signup");
  // OAuth return path must run without forcing login/signup redirects
  const isOAuthCallback = path.startsWith("/auth/callback");

  if (isDashboard && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  if (isAuth && user && !isOAuthCallback) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    return NextResponse.redirect(redirect);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
