/*
 * /5 — Director's Cut (canonical base)
 *
 * Uses LandingCore + SearchResultStackConnector.
 * The connector is behavioral-only (no visual overlay) — it fires ripple pulses
 * from section-aware origins as you scroll. Same vibe as before, now with
 * section tracking context + interactive ripple integration.
 *
 * To switch to a different connector, swap SearchResultStackConnector for
 * KineticQueryThread, PipelineRibbonFlyover, or MinimalCalibration.
 */

import { LandingCore } from "../../landing/LandingCore";
import { SearchResultStackConnector } from "../../landing/connectors/SearchResultStack";

export default function Page5() {
  return <LandingCore connector={SearchResultStackConnector} />;
}
