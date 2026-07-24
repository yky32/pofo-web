import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getClientGalleryByToken,
  getShareGate,
  verifyClientGalleryStudioAccess,
} from "@/actions/share";
import { ClientGallery } from "@/components/client/client-gallery";
import { ClientGalleryDemo } from "@/components/client/client-gallery-demo";
import { SharePasswordGate } from "@/components/client/share-password-gate";
import { Logo } from "@/components/brand/logo";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import {
  clientGalleryPublicUrl,
  hasStudioSubdomainRouting,
  studioSlugFromHeaders,
} from "@/lib/host";
import { contactSheet } from "@/lib/photos";
import type { ClientGalleryPayload } from "@/types/database";

function demoPayload(token: string): ClientGalleryPayload {
  return {
    token,
    share_link_id: "demo",
    project: {
      id: "demo",
      title: token.startsWith("demo-") ? "Alicia & James" : "Sample gallery",
      client_name: "Demo client",
      description: "Wedding day · Tap hearts to proof your favorites",
      status: "proofing",
      selection_limit: 40,
    },
    studio: {
      slug: "demo",
      studio_name: "Demo Studio",
      display_name: "Demo",
    },
    shots: contactSheet.map((url, i) => ({
      id: `demo-shot-${i}`,
      preview_url: url,
      filename: `demo-${i + 1}.jpg`,
      sort_order: i,
      width: null,
      height: null,
    })),
    selected_shot_ids: [],
  };
}

export default async function ClientGalleryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const h = await headers();
  /** Studio host only — set by middleware from `{slug}.localhost` / `{slug}.pofo.app` */
  const hostStudio = studioSlugFromHeaders(h);
  const appUrl = getAppUrl();

  if (token.startsWith("demo-") || !isSupabaseConfigured()) {
    return <ClientGalleryDemo payload={demoPayload(token)} />;
  }

  /**
   * Security (studio host):
   * 1. Studio exists (host slug is a real photographer)
   * 2. This /g/{token} belongs to that studio
   * (App host: check 1 N/A; check 2 via token + optional redirect to owner host)
   */
  const access = await verifyClientGalleryStudioAccess(token, hostStudio);
  if (!access.ok) {
    return <ClientGalleryError code={access.error} token={token} />;
  }

  // Prefer branded studio host when subdomain routing works
  if (
    !hostStudio &&
    access.studio_slug &&
    hasStudioSubdomainRouting(appUrl)
  ) {
    redirect(clientGalleryPublicUrl(token, access.studio_slug, appUrl));
  }

  // Gate details (password / titles) — already passed studio ownership
  const gate = await getShareGate(token, hostStudio);
  if (!gate.ok) {
    return <ClientGalleryError code={gate.error} token={token} />;
  }

  if (gate.requires_password && !gate.unlocked) {
    return (
      <SharePasswordGate
        token={token}
        projectTitle={gate.project_title}
        studioName={gate.studio_name}
        clientName={gate.client_name}
        displayName={gate.display_name}
        avatarUrl={gate.avatar_url}
      />
    );
  }

  const result = await getClientGalleryByToken(token, hostStudio);

  if ("error" in result) {
    if (result.error === "password_required") {
      return (
        <SharePasswordGate
          token={token}
          projectTitle={gate.project_title}
          studioName={gate.studio_name}
          clientName={gate.client_name}
          displayName={gate.display_name}
          avatarUrl={gate.avatar_url}
        />
      );
    }
    return (
      <ClientGalleryError code={result.error ?? "failed"} token={token} />
    );
  }

  if (
    !hostStudio &&
    result.studio?.slug &&
    hasStudioSubdomainRouting(appUrl)
  ) {
    redirect(clientGalleryPublicUrl(token, result.studio.slug, appUrl));
  }

  return <ClientGallery initial={result} />;
}

function ClientGalleryError({
  code,
  token,
}: {
  code: string;
  token: string;
}) {
  const copy: Record<string, { title: string; body: string }> = {
    unknown_studio: {
      title: "Studio not found",
      body: "This studio link is not registered. Check the URL your photographer sent.",
    },
    not_found: {
      title: "Link not found",
      body: "This gallery link is invalid or has been removed.",
    },
    revoked: {
      title: "Link revoked",
      body: "The photographer turned off this share link.",
    },
    expired: {
      title: "Link expired",
      body: "Ask your photographer for a new private link.",
    },
    wrong_studio: {
      title: "Wrong studio",
      body: "This gallery does not belong to this studio. Open the exact link your photographer sent.",
    },
    schema_missing: {
      title: "Gallery not ready",
      body: "Database schema needs to be applied (run supabase/schema.sql + slug.sql).",
    },
    not_configured: {
      title: "Unavailable",
      body: "Supabase is not configured for this environment.",
    },
    password_required: {
      title: "Password required",
      body: "This gallery is password protected.",
    },
    invalid_token: {
      title: "Invalid link",
      body: "This gallery link is incomplete or malformed.",
    },
  };

  const msg = copy[code] ?? {
    title: "Unable to open gallery",
    body: "Something went wrong. Try again later.",
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[oklch(0.12_0.01_50)] px-6 text-center text-stone-100">
      <Logo className="text-white" markClassName="text-white" />
      <h1 className="mt-10 font-heading text-3xl font-medium">{msg.title}</h1>
      <p className="mt-3 max-w-sm text-sm text-stone-400">{msg.body}</p>
      <p className="mt-8 font-mono text-xs text-stone-600">
        …{token.slice(-8)}
      </p>
      <Link
        href="/"
        className="mt-10 text-sm text-stone-300 underline-offset-4 hover:underline"
      >
        Back to Pofo
      </Link>
    </div>
  );
}
