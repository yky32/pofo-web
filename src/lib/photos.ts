/** Curated Unsplash photography — higher res for immersive HD stages (V1.1). */

export const studioPhotos = {
  heroMain:
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2400&q=90",
  heroSideA:
    "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=88",
  heroSideB:
    "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1400&q=88",
  heroSideC:
    "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1400&q=88",
  golden:
    "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=2200&q=90",
  rings:
    "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1400&q=88",
  portrait:
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1600&q=88",
  family:
    "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=2000&q=88",
  studio:
    "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=2000&q=88",
  ceremony:
    "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?auto=format&fit=crop&w=2000&q=88",
  kiss:
    "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=88",
  detail:
    "https://images.unsplash.com/photo-1460978812857-470ed1c77af0?auto=format&fit=crop&w=1400&q=88",
  outdoor:
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=2200&q=90",
} as const;

/** Contact-sheet style set for gallery grids */
export const contactSheet = [
  studioPhotos.heroMain,
  studioPhotos.heroSideA,
  studioPhotos.ceremony,
  studioPhotos.rings,
  studioPhotos.golden,
  studioPhotos.kiss,
  studioPhotos.portrait,
  studioPhotos.family,
  studioPhotos.detail,
  studioPhotos.outdoor,
  studioPhotos.studio,
  studioPhotos.heroSideB,
  studioPhotos.heroSideC,
  studioPhotos.heroMain,
  studioPhotos.golden,
  studioPhotos.ceremony,
  studioPhotos.portrait,
  studioPhotos.kiss,
  studioPhotos.rings,
  studioPhotos.outdoor,
];

export const galleryCovers: Record<string, string> = {
  gal_1: studioPhotos.heroMain,
  gal_2: studioPhotos.golden,
  gal_3: studioPhotos.family,
  gal_4: studioPhotos.kiss,
};
