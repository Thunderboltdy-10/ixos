import { V5PrimeLanding } from "../../landing/v5clone/V5PrimeLanding";

type RouteSearchParams =
  | { visual?: string | string[] }
  | Promise<{ visual?: string | string[] }>;

export default async function Page3({
  searchParams,
}: {
  searchParams?: RouteSearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const visualParam = Array.isArray(params?.visual) ? params?.visual[0] : params?.visual;

  return <V5PrimeLanding preset="v3" activeRoute="/3" visualMode={visualParam === "1"} />;
}
