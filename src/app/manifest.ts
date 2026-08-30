import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Holiday Planner",
    short_name: "Holidays",
    description: "Plan your holidays day by day",
    start_url: "/",
    display: "standalone",
    background_color: "#eff6ff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icons/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
