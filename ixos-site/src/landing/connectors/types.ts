/**
 * Connector interface — the "crazy factor" differentiating /1 /2 /3 /5.
 * Each connector is a React component that sits in a fixed overlay layer
 * and animates based on which section is active.
 */

import type { ComponentType } from "react";
import type { SectionEntry } from "../LandingContext";
import type { LandingSection } from "../SECTION_MAP";

export interface ConnectorProps {
  /** All registered sections */
  sections: SectionEntry[];
  /** Currently active section ID */
  activeSectionId: string | null;
  /** Full section metadata from SECTION_MAP */
  sectionMap: LandingSection[];
  /** Dispatch a ripple pulse at screen coordinates */
  pulseAt: (x: number, y: number, intensity?: number) => void;
}

export type ConnectorComponent = ComponentType<ConnectorProps>;
