const escapeCell = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

export function exportCsv(
  filename: string,
  rows: Array<Record<string, unknown>>,
) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const content = [
    columns.map(escapeCell).join(";"),
    ...rows.map((row) => columns.map((column) => escapeCell(row[column])).join(";")),
  ].join("\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
