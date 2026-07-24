import { notFound } from "next/navigation";
import { getPublicPortfolio } from "@/actions/portfolio";
import { getStudioBySlug } from "@/actions/profile";
import { StudioPageRenderer } from "@/components/portfolio/studio-page-renderer";
import { isSupabaseConfigured } from "@/lib/env";
import { parsePortfolioPage } from "@/lib/portfolio-page";

export default async function StudioLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const studio = await getStudioBySlug(slug);
  if (!studio) notFound();

  const portfolio = await getPublicPortfolio(slug);
  const items =
    "error" in portfolio ? [] : portfolio.items.filter((i) => i.display_url);

  const title =
    studio.studio_name || studio.display_name || studio.slug || "Studio";

  const config = parsePortfolioPage(
    (studio as { portfolio_page?: unknown }).portfolio_page,
    title
  );

  return (
    <StudioPageRenderer
      config={config}
      studioTitle={title}
      items={items}
      showAuthLink
    />
  );
}
