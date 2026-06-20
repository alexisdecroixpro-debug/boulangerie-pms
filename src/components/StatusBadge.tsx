import type { RecordStatus } from "../domain/types";

export function StatusBadge({ status }: { status: RecordStatus }) {
  const className = status.toLowerCase().replaceAll(" ", "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return <span className={`status status--${className}`}>{status}</span>;
}
