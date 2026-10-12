export function CornerBrackets({
  size = 16,
  color = "rgba(246,185,76,0.25)",
}: {
  size?: number;
  color?: string;
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderColor: color,
  };
  return (
    <>
      <span
        className="absolute top-0 left-0 border-t-2 border-l-2"
        style={style}
      />
      <span
        className="absolute top-0 right-0 border-t-2 border-r-2"
        style={style}
      />
      <span
        className="absolute bottom-0 left-0 border-b-2 border-l-2"
        style={style}
      />
      <span
        className="absolute bottom-0 right-0 border-b-2 border-r-2"
        style={style}
      />
    </>
  );
}
