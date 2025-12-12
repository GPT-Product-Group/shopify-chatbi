import jsPDF from "jspdf";

export function exportPdfFromText(
  title: string,
  lines: string[],
  fileName = "export.pdf",
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 10, 10);
  doc.setFontSize(11);

  let y = 20;
  lines.forEach((line) => {
    doc.text(line, 10, y);
    y += 8;
  });

  doc.save(fileName);
}
