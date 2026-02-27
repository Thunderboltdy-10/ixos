import type { IxosView, SearchMode } from "../DemoSurface";

export interface DemoSurfaceScenario {
  id: string;
  label: string;
  view: IxosView;
  query: string;
  mode: SearchMode;
}
