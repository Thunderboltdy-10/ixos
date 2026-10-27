interface ScoreBarProps {
  keyword: number;
  meaning: number;
  width?: number;
}

/** A hybrid score out of 1: grey for keywords, yellow for meaning. */
export function ScoreBar({ keyword, meaning, width = 80 }: ScoreBarProps) {
  const percent = (value: number) => `${Math.max(0, Math.min(1, value)) * 100}%`;
  return (
    <span className="ix-score" style={{ width }} aria-hidden>
      <span style={{ width: percent(keyword) }} />
      <span style={{ width: percent(meaning) }} />
    </span>
  );
}
