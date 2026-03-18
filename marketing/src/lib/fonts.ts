/**
 * Font loading for the Ixos hero film.
 * Space Grotesk (display) via Google Fonts, Geist Mono (body) via local woff2.
 */
import { loadFont as loadGoogleFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadLocalFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Space Grotesk — display / headings
const { fontFamily: spaceGroteskFamily } = loadGoogleFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Geist Mono — body / monospace
const geistMonoFamily = "Geist Mono";

loadLocalFont({
  family: geistMonoFamily,
  url: staticFile("fonts/GeistMono-Regular.woff2"),
  weight: "400",
});

export const fontDisplay = spaceGroteskFamily;
export const fontBody = geistMonoFamily;
