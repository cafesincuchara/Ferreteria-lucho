import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportToExcel } from "@/utils/exportReports";

const CustomReports = () => {
  const [reportType, setReportType] = useState("ventas");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleGenerateReport = () => {
    // Simulación de datos según el tipo de reporte
    const data =
      reportType === "ventas"
        ? [{ id: 1, cliente: "Juan Pérez", total: 100 }]
        : [{ id: 1, producto: "Martillo", stock: 50 }];

    exportToExcel(data, `Reporte_${reportType}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generación de Reportes Personalizados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="border rounded px-2 py-2"
          >
            <option value="ventas">Ventas</option>
            <option value="inventario">Inventario</option>
          </select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Fecha de inicio"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="Fecha de fin"
          />

          <Button onClick={handleGenerateReport}>Generar Reporte</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomReports;
