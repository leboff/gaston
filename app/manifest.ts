import type { MetadataRoute } from "next";

// Web app manifest, served at /manifest.webmanifest (Next 16 metadata file
// convention). Makes Gaston installable to a home screen. Icons live in
// public/icons/ (see app/icons + public/icons). Keep theme_color in sync with
// the `viewport.themeColor` export in app/layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gaston — nested LLM chat",
    short_name: "Gaston",
    description:
      "Chat with an LLM and dig in: highlight any phrase to branch into a linked sub-chat. Stored in your own AT Protocol repo.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
