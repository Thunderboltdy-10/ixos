import { Progress } from "./Progress";

/** Shown while the app starts. It fades in late, so quick starts show nothing. */
export function Loading({ logo }: { logo: string }) {
  return (
    <div className="ix-loading" role="status" aria-label="Starting Ixos">
      <img src={logo} alt="" width={40} height={40} />
      <Progress value={null} busy />
    </div>
  );
}
