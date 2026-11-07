import type { Reading } from "./api";
import { count } from "./format";

/** How many files have gone by while a folder is read. */
export function ReadingNote({ reading }: { reading: Reading }) {
  return (
    <span className="ix-status-note reading-note" aria-hidden>
      {reading.total ? `${count(reading.done)} of ${count(reading.total)} files` : `${count(reading.done)} files found`}
    </span>
  );
}
