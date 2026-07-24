import Link from "next/link";
import { Camera, Link2, Mail, Phone, Shield } from "lucide-react";
import type { PublicPortfolioItem } from "@/actions/portfolio";
import { Logo } from "@/components/brand/logo";
import { PhotoImage } from "@/components/photo/photo-image";
import { Button } from "@/components/ui/button";
import {
  themeClass,
  type PortfolioPageConfig,
  type PortfolioSection,
} from "@/lib/portfolio-page";
import { cn } from "@/lib/utils";

export function StudioPageRenderer({
  config,
  studioTitle,
  items,
  showAuthLink = true,
}: {
  config: PortfolioPageConfig;
  studioTitle: string;
  items: PublicPortfolioItem[];
  showAuthLink?: boolean;
}) {
  const theme = themeClass(config.theme);
  const photos = items.filter((i) => i.display_url);
  const isDark = config.theme === "ink";

  return (
    <div className={cn("flex min-h-screen flex-col", theme.page)}>
      <header
        className={cn(
          "flex h-16 items-center justify-between px-6",
          isDark && "border-b border-white/5"
        )}
      >
        <Logo
          className={isDark ? "text-white" : undefined}
          markClassName={isDark ? "text-white" : undefined}
        />
        {showAuthLink ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-full",
              isDark
                ? "text-stone-400 hover:bg-white/10 hover:text-white"
                : "text-stone-500"
            )}
            asChild
          >
            <Link href="/login">Photographer sign in</Link>
          </Button>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
        {config.sections
          .filter((s) => s.visible)
          .map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              theme={theme}
              studioTitle={studioTitle}
              photos={photos}
              isDark={isDark}
            />
          ))}
      </main>
    </div>
  );
}

function SectionBlock({
  section,
  theme,
  studioTitle,
  photos,
  isDark,
}: {
  section: PortfolioSection;
  theme: ReturnType<typeof themeClass>;
  studioTitle: string;
  photos: PublicPortfolioItem[];
  isDark: boolean;
}) {
  switch (section.type) {
    case "hero":
      return (
        <section className="mx-auto max-w-2xl pt-10 text-center sm:pt-16">
          <p
            className={cn(
              "text-xs font-medium uppercase tracking-[0.22em]",
              theme.muted
            )}
          >
            {section.eyebrow || "Studio"}
          </p>
          <h1
            className={cn(
              "mt-3 font-heading text-4xl font-medium sm:text-5xl",
              theme.accent
            )}
          >
            {section.headline || studioTitle}
          </h1>
          {section.subhead ? (
            <p
              className={cn(
                "mx-auto mt-4 max-w-md leading-relaxed",
                theme.muted
              )}
            >
              {section.subhead}
            </p>
          ) : null}
        </section>
      );

    case "gallery": {
      const colClass =
        section.columns === 2
          ? "grid-cols-2 sm:grid-cols-2"
          : section.columns === 4
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-3";

      if (!photos.length) {
        return (
          <section className="mx-auto mt-12 max-w-lg">
            <div
              className={cn(
                "rounded-2xl border p-8 shadow-sm",
                theme.card
              )}
            >
              <ul className={cn("space-y-3 text-sm", theme.muted)}>
                <li className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      isDark ? "bg-white/10" : "bg-stone-100 text-stone-700"
                    )}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    Private galleries are shared via a secure link from your
                    photographer.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      isDark ? "bg-white/10" : "bg-stone-100 text-stone-700"
                    )}
                  >
                    <Shield className="h-3.5 w-3.5" />
                  </span>
                  <span>Some galleries ask for a password.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      isDark ? "bg-white/10" : "bg-stone-100 text-stone-700"
                    )}
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </span>
                  <span>Tap hearts to proof favorites.</span>
                </li>
              </ul>
            </div>
          </section>
        );
      }

      return (
        <section className={cn("mt-12 grid gap-2 sm:gap-3", colClass)}>
          {photos.map((item) => (
            <figure
              key={item.id}
              className="group relative aspect-[4/5] overflow-hidden rounded-[6px] bg-stone-200/40"
            >
              <PhotoImage
                src={item.display_url!}
                alt={item.title ?? "Portfolio"}
                sizes="(max-width:768px) 50vw, 25vw"
                className="transition duration-500 group-hover:scale-[1.03]"
              />
              {section.showCaptions &&
              (item.title || item.project_title) ? (
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2.5 pt-8">
                  <p className="truncate text-xs font-medium text-white">
                    {item.title}
                  </p>
                  {item.project_title ? (
                    <p className="truncate text-[10px] text-white/70">
                      {item.project_title}
                    </p>
                  ) : null}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </section>
      );
    }

    case "about":
      return (
        <section className="mx-auto mt-16 max-w-xl text-center">
          <h2 className={cn("font-heading text-2xl font-medium", theme.accent)}>
            {section.title || "About"}
          </h2>
          {section.body ? (
            <p
              className={cn(
                "mt-3 whitespace-pre-wrap text-sm leading-relaxed",
                theme.muted
              )}
            >
              {section.body}
            </p>
          ) : null}
        </section>
      );

    case "services":
      return (
        <section className="mx-auto mt-16 max-w-2xl text-center">
          <h2 className={cn("font-heading text-2xl font-medium", theme.accent)}>
            {section.title || "Services"}
          </h2>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {section.items.map((item) => (
              <li
                key={item}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm",
                  theme.card,
                  theme.accent
                )}
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      );

    case "contact": {
      const mailto =
        section.ctaHref ||
        (section.email ? `mailto:${section.email}` : null);
      return (
        <section className="mx-auto mt-16 max-w-md text-center">
          <h2 className={cn("font-heading text-2xl font-medium", theme.accent)}>
            {section.title || "Work with me"}
          </h2>
          <div className={cn("mt-4 space-y-1.5 text-sm", theme.muted)}>
            {section.email ? (
              <p className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <a
                  href={`mailto:${section.email}`}
                  className="underline-offset-2 hover:underline"
                >
                  {section.email}
                </a>
              </p>
            ) : null}
            {section.phone ? (
              <p className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {section.phone}
              </p>
            ) : null}
          </div>
          {mailto ? (
            <div className="mt-5">
              <Button
                className={cn(
                  "rounded-full",
                  isDark
                    ? "bg-white text-stone-900 hover:bg-stone-200"
                    : "bg-stone-900 text-white hover:bg-stone-800"
                )}
                asChild
              >
                <a href={mailto}>{section.ctaLabel || "Inquire"}</a>
              </Button>
            </div>
          ) : null}
        </section>
      );
    }

    case "footer":
      return (
        <section className="mt-16 flex justify-center">
          {section.showPofo ? (
            <Button
              variant="outline"
              className={cn(
                "rounded-full",
                isDark
                  ? "border-white/15 bg-transparent text-stone-300 hover:bg-white/10"
                  : "border-stone-300"
              )}
              asChild
            >
              <Link href="/">About Pofo</Link>
            </Button>
          ) : (
            <div className="h-4" />
          )}
        </section>
      );

    default:
      return null;
  }
}
