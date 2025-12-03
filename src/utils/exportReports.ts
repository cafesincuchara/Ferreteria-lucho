import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = utils.json_to_sheet(data);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Reporte");
  writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToPDF = (data: any[], fileName: string) => {
  const doc = new jsPDF();

  // Agregar título al PDF
  doc.text("Reporte", 10, 10);

  // Convertir datos a texto y agregar al PDF
  const rows = data.map((item) => Object.values(item));
  const headers = Object.keys(data[0] || {});

  let y = 20;
  doc.text(headers.join(" | "), 10, y);
  y += 10;

  rows.forEach((row) => {
    doc.text(row.join(" | "), 10, y);
    y += 10;
  });

  // Guardar el archivo PDF
  doc.save(`${fileName}.pdf`);
};
