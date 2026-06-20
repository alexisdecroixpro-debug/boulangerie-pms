export type ExportPeriod = "today" | "week" | "month" | "all" | "custom";

const dateKeys = [
  "openedAt", "manufacturedAt", "checkedAt", "plannedAt", "completedAt",
  "receivedAt", "occurredAt", "createdAt", "updatedAt", "createdOn", "updatedOn",
];

export function filterByPeriod<T>(rows: T[], period: ExportPeriod, from = "", to = "") {
  if (period === "all") return rows;
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (period === "week") {
    const mondayOffset = (now.getDay() + 6) % 7;
    start.setDate(now.getDate() - mondayOffset);
  } else if (period === "month") {
    start.setDate(1);
  } else if (period === "custom") {
    if (!from && !to) return rows;
    if (from) start.setTime(new Date(`${from}T00:00:00`).getTime());
    else start.setTime(0);
    if (to) end.setTime(new Date(`${to}T23:59:59.999`).getTime());
    else end.setTime(8.64e15);
  }

  return rows.filter((row) => {
    const value = getRecordDate(row);
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date >= start && date <= end;
  });
}

export function getRecordDate(row: unknown) {
  if (!row || typeof row !== "object") return "";
  const record = row as Record<string, unknown>;
  for (const key of dateKeys) {
    if (typeof record[key] === "string" && record[key]) return record[key] as string;
  }
  return "";
}

