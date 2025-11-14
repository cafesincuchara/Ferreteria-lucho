import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  VictoryBar,
  VictoryChart,
  VictoryAxis,
  VictoryTheme,
  VictoryTooltip,
} from "victory";

const Accounting = () => {
  const { userRole } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    record_type: "ingreso",
    category: "general",
  });
  const [filter, setFilter] = useState({
    type: "",
    category: "",
    from: "",
    to: "",
  });
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [filter]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from("accounting_records")
      .select("category");
    if (data) {
      const unique = Array.from(
        new Set(data.map((r: any) => r.category).filter(Boolean))
      );
      setCategories(unique);
    }
  };

  const loadRecords = async () => {
    let query = supabase.from("accounting_records").select("*");
    if (filter.type) query = query.eq("record_type", filter.type);
    if (filter.category) query = query.eq("category", filter.category);
    if (filter.from) query = query.gte("created_at", filter.from);
    if (filter.to) query = query.lte("created_at", filter.to);
    const { data } = await query;
    setRecords(data || []);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;
    await supabase.from("accounting_records").insert({
      description: formData.description,
      amount: Number(formData.amount),
      record_type: formData.record_type,
      category: formData.category,
    });
    setOpen(false);
    setFormData({
      description: "",
      amount: "",
      record_type: "ingreso",
      category: "general",
    });
    loadRecords();
  };

  const totalIngresos = records
    .filter((r) => r.record_type === "ingreso")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const totalEgresos = records
    .filter((r) => r.record_type === "egreso")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const balance = totalIngresos - totalEgresos;

  // Agrupar por mes para gráfico
  type MonthlyVals = { ingreso: number; egreso: number };
  const monthly: Record<string, MonthlyVals> = {};
  records.forEach((r) => {
    const m = r.created_at?.slice(0, 7) || "";
    if (!monthly[m]) monthly[m] = { ingreso: 0, egreso: 0 };
    if (r.record_type === "ingreso") monthly[m].ingreso += Number(r.amount);
    if (r.record_type === "egreso") monthly[m].egreso += Number(r.amount);
  });
  const chartData = Object.entries(monthly).map(([mes, vals]) => ({
    mes,
    ingreso: vals.ingreso,
    egreso: vals.egreso,
  }));

  if (userRole !== "contador" && userRole !== "gerente") {
    return (
      <DashboardLayout>
        <div className="p-6">No tienes acceso a esta sección.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Contabilidad</h1>
        <div className="flex gap-4 mb-4">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totalIngresos.toLocaleString("es-CL")}
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Egresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${totalEgresos.toLocaleString("es-CL")}
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${balance.toLocaleString("es-CL")}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 mb-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setOpen(true)}>Agregar Registro</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Registro Contable</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Descripción</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <select
                    className="w-full border rounded p-2"
                    value={formData.record_type}
                    onChange={(e) =>
                      setFormData({ ...formData, record_type: e.target.value })
                    }
                  >
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Guardar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <div className="flex gap-2 items-end">
            <Input
              type="date"
              placeholder="Desde"
              value={filter.from}
              onChange={(e) => setFilter({ ...filter, from: e.target.value })}
            />
            <Input
              type="date"
              placeholder="Hasta"
              value={filter.to}
              onChange={(e) => setFilter({ ...filter, to: e.target.value })}
            />
            <select
              className="border rounded p-2"
              value={filter.category}
              onChange={(e) =>
                setFilter({ ...filter, category: e.target.value })
              }
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              className="border rounded p-2"
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
            <Button
              variant="outline"
              onClick={() =>
                setFilter({ ...filter, category: "venta", type: "ingreso" })
              }
            >
              Ver solo ventas
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registros Contables</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoría</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.created_at?.slice(0, 10)}</TableCell>
                    <TableCell>{r.description || "-"}</TableCell>
                    <TableCell>
                      ${Number(r.amount).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell>{r.record_type}</TableCell>
                    <TableCell>{r.category}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gráfico Mensual</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            {chartData.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No hay datos.
              </div>
            ) : (
              <VictoryChart
                theme={VictoryTheme.material}
                domainPadding={30}
                height={300}
              >
                <VictoryAxis tickFormat={(t) => t.slice(5)} />
                <VictoryAxis dependentAxis />
                <VictoryBar
                  data={chartData.map((d) => ({ x: d.mes, y: d.ingreso }))}
                  style={{ data: { fill: "#059669" } }}
                  labels={({ datum }) => `+$${datum.y}`}
                  labelComponent={<VictoryTooltip />}
                  barWidth={16}
                />
                <VictoryBar
                  data={chartData.map((d) => ({ x: d.mes, y: d.egreso }))}
                  style={{ data: { fill: "#ef4444" } }}
                  labels={({ datum }) => `-$${datum.y}`}
                  labelComponent={<VictoryTooltip />}
                  barWidth={16}
                />
              </VictoryChart>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Accounting;
