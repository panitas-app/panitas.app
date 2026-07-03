export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const bom = "\uFEFF"
  const csv = bom + [
    headers.join(","),
    ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")),
  ].join("\r\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;bom" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
