/**
 * Limited portfolio page layout (photographer-customizable).
 * Stored as profiles.portfolio_page JSONB — not a free-form page builder.
 */

export type PortfolioPageTheme = "paper" | "ink" | "rose";

export type PortfolioSectionType =
  | "hero"
  | "gallery"
  | "about"
  | "services"
  | "contact"
  | "footer";

type BaseSection = {
  id: string;
  type: PortfolioSectionType;
  visible: boolean;
};

export type HeroSection = BaseSection & {
  type: "hero";
  eyebrow: string;
  headline: string;
  subhead: string;
};

export type GallerySection = BaseSection & {
  type: "gallery";
  columns: 2 | 3 | 4;
  showCaptions: boolean;
};

export type AboutSection = BaseSection & {
  type: "about";
  title: string;
  body: string;
};

export type ServicesSection = BaseSection & {
  type: "services";
  title: string;
  items: string[];
};

export type ContactSection = BaseSection & {
  type: "contact";
  title: string;
  email: string;
  phone: string;
  ctaLabel: string;
  ctaHref: string;
};

export type FooterSection = BaseSection & {
  type: "footer";
  showPofo: boolean;
};

export type PortfolioSection =
  | HeroSection
  | GallerySection
  | AboutSection
  | ServicesSection
  | ContactSection
  | FooterSection;

export type PortfolioPageConfig = {
  version: 1;
  theme: PortfolioPageTheme;
  sections: PortfolioSection[];
};

const SECTION_LABELS: Record<PortfolioSectionType, string> = {
  hero: "Hero",
  gallery: "Photo grid",
  about: "About",
  services: "Services",
  contact: "Contact",
  footer: "Footer",
};

export function sectionLabel(type: PortfolioSectionType) {
  return SECTION_LABELS[type];
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Default layout for new studios / missing config. */
export function defaultPortfolioPage(studioName?: string | null): PortfolioPageConfig {
  const name = studioName?.trim() || "Your studio";
  return {
    version: 1,
    theme: "paper",
    sections: [
      {
        id: uid("hero"),
        type: "hero",
        visible: true,
        eyebrow: "Studio",
        headline: name,
        subhead: "Selected work from recent deliveries.",
      },
      {
        id: uid("gallery"),
        type: "gallery",
        visible: true,
        columns: 3,
        showCaptions: true,
      },
      {
        id: uid("about"),
        type: "about",
        visible: true,
        title: "About",
        body: "Tell clients who you are, how you shoot, and what a session feels like.",
      },
      {
        id: uid("services"),
        type: "services",
        visible: false,
        title: "Services",
        items: ["Weddings", "Portraits", "Commercial"],
      },
      {
        id: uid("contact"),
        type: "contact",
        visible: true,
        title: "Work with me",
        email: "",
        phone: "",
        ctaLabel: "Inquire",
        ctaHref: "",
      },
      {
        id: uid("footer"),
        type: "footer",
        visible: true,
        showPofo: true,
      },
    ],
  };
}

export function themeClass(theme: PortfolioPageTheme): {
  page: string;
  muted: string;
  card: string;
  accent: string;
} {
  switch (theme) {
    case "ink":
      return {
        page: "bg-[oklch(0.14_0.01_50)] text-stone-100",
        muted: "text-stone-400",
        card: "border-white/10 bg-white/5",
        accent: "text-stone-100",
      };
    case "rose":
      return {
        page: "bg-[oklch(0.985_0.012_20)] text-stone-900",
        muted: "text-rose-900/50",
        card: "border-rose-200/70 bg-white/80",
        accent: "text-rose-900",
      };
    case "paper":
    default:
      return {
        page: "bg-[oklch(0.995_0.003_85)] text-stone-900",
        muted: "text-stone-500",
        card: "border-stone-200/80 bg-white/70",
        accent: "text-stone-900",
      };
  }
}

function asString(v: unknown, max = 500): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function asBool(v: unknown, fallback = true): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function normalizeSection(raw: unknown): PortfolioSection | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const type = o.type as PortfolioSectionType;
  const id =
    typeof o.id === "string" && o.id.length > 0 ? o.id : uid(type || "sec");
  const visible = asBool(o.visible, true);

  switch (type) {
    case "hero":
      return {
        id,
        type,
        visible,
        eyebrow: asString(o.eyebrow, 40) || "Studio",
        headline: asString(o.headline, 80) || "Studio",
        subhead: asString(o.subhead, 240),
      };
    case "gallery": {
      const cols = Number(o.columns);
      const columns = (cols === 2 || cols === 4 ? cols : 3) as 2 | 3 | 4;
      return {
        id,
        type,
        visible,
        columns,
        showCaptions: asBool(o.showCaptions, true),
      };
    }
    case "about":
      return {
        id,
        type,
        visible,
        title: asString(o.title, 60) || "About",
        body: asString(o.body, 1200),
      };
    case "services": {
      const itemsRaw = Array.isArray(o.items) ? o.items : [];
      const items = itemsRaw
        .map((x) => asString(x, 48))
        .filter(Boolean)
        .slice(0, 12);
      return {
        id,
        type,
        visible,
        title: asString(o.title, 60) || "Services",
        items: items.length ? items : ["Weddings", "Portraits"],
      };
    }
    case "contact":
      return {
        id,
        type,
        visible,
        title: asString(o.title, 60) || "Work with me",
        email: asString(o.email, 120),
        phone: asString(o.phone, 40),
        ctaLabel: asString(o.ctaLabel, 40) || "Inquire",
        ctaHref: asString(o.ctaHref, 240),
      };
    case "footer":
      return {
        id,
        type,
        visible,
        showPofo: asBool(o.showPofo, true),
      };
    default:
      return null;
  }
}

/** Parse / sanitize stored JSON (or return defaults). */
export function parsePortfolioPage(
  raw: unknown,
  studioName?: string | null
): PortfolioPageConfig {
  const fallback = defaultPortfolioPage(studioName);
  if (!raw || typeof raw !== "object") return fallback;

  const o = raw as Record<string, unknown>;
  const theme =
    o.theme === "ink" || o.theme === "rose" || o.theme === "paper"
      ? o.theme
      : "paper";

  const list = Array.isArray(o.sections) ? o.sections : [];
  const sections = list
    .map(normalizeSection)
    .filter((s): s is PortfolioSection => Boolean(s));

  // Ensure required section types exist once (gallery + hero)
  const have = new Set(sections.map((s) => s.type));
  for (const def of fallback.sections) {
    if (!have.has(def.type)) {
      sections.push({ ...def, id: uid(def.type) });
    }
  }

  // Cap section count
  return {
    version: 1,
    theme,
    sections: sections.slice(0, 10),
  };
}

export function moveSection(
  sections: PortfolioSection[],
  fromIndex: number,
  toIndex: number
): PortfolioSection[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= sections.length ||
    toIndex >= sections.length ||
    fromIndex === toIndex
  ) {
    return sections;
  }
  const next = [...sections];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return sections;
  next.splice(toIndex, 0, item);
  return next;
}
