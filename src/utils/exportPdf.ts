export function exportPdf(title: string, subtitle: string, rows: Array<Record<string, unknown>>, userName: string) {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;
  const cells = rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(formatValue(row[column]))}</td>`).join("")}</tr>`).join("");
  popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    body{font:12px Arial,sans-serif;color:#17251f;margin:28px}h1{color:#0d4b34;margin-bottom:5px}p{color:#68766f}
    table{width:100%;border-collapse:collapse;margin-top:22px}th,td{border:1px solid #dfe5e1;padding:7px;text-align:left;vertical-align:top}
    th{background:#e4f0e9;color:#0d4b34;font-size:10px;text-transform:uppercase}footer{margin-top:18px;color:#68766f}
    @page{size:landscape;margin:12mm}
  </style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p>
  <p>Exporté le ${new Date().toLocaleString("fr-FR")} par ${escapeHtml(userName)}</p>
  <table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${cells}</tbody></table>
  <footer>Pack Hygiène · Historique PMS conservé</footer><script>window.onload=()=>window.print()</script></body></html>`);
  popup.document.close();
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? `${value.length} pièce(s) jointe(s)` : "";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value ?? "");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!);
}
