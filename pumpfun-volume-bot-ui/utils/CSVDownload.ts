export default function csvDownload(data: Record<string, any>[]) {
  const csvRows = [];

  // Get the headers
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(","));

  // Format the rows
  for (const row of data) {
    const values = headers.map((header) => {
      const escaped = ("" + row[header]).replace(/"/g, '\\"'); // Escape double quotes
      return `"${escaped}"`; // Wrap in quotes
    });
    csvRows.push(values.join(","));
  }

  const csv = csvRows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "wallets.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
