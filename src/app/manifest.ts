import type { MetadataRoute } from "next";

/** Lets phones add JumpIn to the home screen with its own icon and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JumpIn",
    short_name: "JumpIn",
    description: "Meet people building a better world. See who's free and jump into a call.",
    start_url: "/discover",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#5b7fe3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
