import { headers } from "next/headers";
import Link from "next/link";
import { getClientGalleryByToken } from "@/actions/share";
import { ClientGallery } from "@/components/client/client-gallery";
import { ClientGalleryDemo } from "@/components/client/client-gallery-demo";
import { Logo } from "@/components/brand/logo";
import { studioSlugFromHeaders } from "@/lib/host";
import { isSupabaseConfigured } from "@/lib/env";
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
      description: "Wedding day · Tap hearts to select favorites",
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
  const expectedSlug = studioSlugFromHeaders(h);

  if (token.startsWith("demo-") || !isSupabaseConfigured()) {
    return <ClientGalleryDemo payload={demoPayload(token)} />;
  }

  const result = await getClientGalleryByToken(token, expectedSlug);

  if ("error" in result) {
    return (
      <ClientGalleryError code={result.error ?? "failed"} token={token} />
    );
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
      body: "This gallery belongs to a different studio link. Open the URL your photographer sent.",
    },
    schema_missing: {
      title: "Gallery not ready",
      body: "Database schema needs to be applied (run supabase/schema.sql + slug.sql).",
    },
    not_configured: {
      title: "Unavailable",
      body: "Supabase is not configured for this environment.",
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
      <p className="mt-8 font-mono text-xs text-stone-600">{token}</p>
      <Link
        href="/"
        className="mt-10 text-sm text-stone-300 underline-offset-4 hover:underline"
      >
        Back to Pofo
      </Link>
    </div>
  );
}
