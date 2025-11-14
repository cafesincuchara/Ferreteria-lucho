import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Users,
} from "lucide-react";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveLine } from "@nivo/line";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Dashboard = () => {
  const { userRole } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    totalSales: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Load products stats
    const { data: products } = await supabase.from("products").select("*");
    const lowStock = products?.filter((p) => p.stock <= p.min_stock) || [];

    // Load sales stats
    const { data: sales } = await supabase.from("sales").select("*");
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthlySales =
      sales?.filter((s) => new Date(s.created_at) >= thisMonth) || [];
    const monthlyRevenue = monthlySales.reduce(
      (sum, s) => sum + Number(s.total),
      0
    );

    // Load users count (only for gerente)
    let userCount = 0;
    if (userRole === "gerente") {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      userCount = count || 0;
    }

    setStats({
      totalProducts: products?.length || 0,
      lowStockProducts: lowStock.length,
      totalSales: sales?.length || 0,
      monthlyRevenue,
      totalUsers: userCount,
    });

    // Prepare sales data for chart (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    const salesByDay = last7Days.map((date) => {
      const daySales =
        sales?.filter((s) => s.created_at.startsWith(date)) || [];
      return {
        date: new Date(date).toLocaleDateString("es-ES", {
          weekday: "short",
        }),
        ventas: daySales.length,
        monto: daySales.reduce((sum, s) => sum + Number(s.total), 0),
      };
    });
    setSalesData(salesByDay);

    // Stock data for pie chart
    const stockCategories = [
      {
        name: "Stock Normal",
        value: (products?.filter((p) => p.stock > p.min_stock * 2) || [])
          .length,
        color: "hsl(var(--chart-5))",
      },
      {
        name: "Stock Bajo",
        value: (
          products?.filter(
            (p) => p.stock > p.min_stock && p.stock <= p.min_stock * 2
          ) || []
        ).length,
        color: "hsl(var(--chart-2))",
      },
      {
        name: "Stock Crítico",
        value: lowStock.length,
        color: "hsl(var(--destructive))",
      },
    ];
    setStockData(stockCategories);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {alertMsg && (
          <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-900 border border-yellow-300">
            {alertMsg}
            <button className="float-right" onClick={() => setAlertMsg(null)}>
              &times;
            </button>
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido a Ferretería Don Lucho
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Productos
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              {stats.lowStockProducts > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {stats.lowStockProducts} con stock bajo
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Ventas Totales
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Todas las ventas registradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Ingresos del Mes
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.monthlyRevenue.toLocaleString("es-CL")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mes actual</p>
            </CardContent>
          </Card>

          {userRole === "gerente" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Usuarios Activos
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de usuarios
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ventas Últimos 7 Días</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 300 }}>
              <ResponsiveBar
                data={salesData.map((d) => ({ ...d, ventas: d.ventas || 0 }))}
                keys={["ventas"]}
                indexBy="date"
                margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                padding={0.4}
                colors={{ scheme: "nivo" }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 30,
                  legend: "Día",
                  legendPosition: "middle",
                  legendOffset: 40,
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: "Ventas",
                  legendPosition: "middle",
                  legendOffset: -50,
                }}
                animate={true}
                enableLabel={false}
                tooltip={({ id, value, indexValue }) => (
                  <strong>
                    {indexValue}: {value} ventas
                  </strong>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado del Inventario</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 300 }}>
              <ResponsivePie
                data={stockData.map((d) => ({
                  id: d.name,
                  label: d.name,
                  value: d.value,
                  color: d.color,
                }))}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                innerRadius={0.5}
                padAngle={1}
                colors={{ datum: "data.color" }}
                borderWidth={2}
                borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
                enableArcLabels={false}
                enableArcLinkLabels={true}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#333"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: "color" }}
                tooltip={({ datum }) => (
                  <strong>
                    {datum.label}: {datum.value}
                  </strong>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {(userRole === "contador" || userRole === "gerente") && (
          <Card>
            <CardHeader>
              <CardTitle>Ingresos Mensuales</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 300 }}>
              <ResponsiveLine
                data={[
                  {
                    id: "Ingresos",
                    data: salesData.map((d) => ({
                      x: d.date,
                      y: d.monto ?? 0,
                    })),
                  },
                ]}
                margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                xScale={{ type: "point" }}
                yScale={{
                  type: "linear",
                  min: "auto",
                  max: "auto",
                  stacked: false,
                  reverse: false,
                }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 30,
                  legend: "Día",
                  legendPosition: "middle",
                  legendOffset: 40,
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: 0,
                  legend: "Monto",
                  legendPosition: "middle",
                  legendOffset: -60, // Más espacio para separar el texto del eje
                }}
                colors={{ scheme: "nivo" }}
                pointSize={10}
                pointColor={{ theme: "background" }}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                enableArea={true}
                areaOpacity={0.2}
                animate={true}
                useMesh={true}
                enableSlices="x"
                enableCrosshair={true}
                tooltip={({ point }) => (
                  <strong>
                    {point.data.x}: ${point.data.y}
                  </strong>
                )}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
