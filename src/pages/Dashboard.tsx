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
            <CardContent style={{ height: 320 }}>
              <ResponsiveBar
                data={salesData.map((d) => ({ ...d, ventas: d.ventas || 0 }))}
                keys={["ventas"]}
                indexBy="date"
                margin={{ top: 40, right: 40, bottom: 60, left: 70 }}
                padding={0.3}
                colors={["#2563eb"]}
                borderRadius={6}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: 0,
                  legend: "Día",
                  legendPosition: "middle",
                  legendOffset: 50,
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: 0,
                  legend: "Ventas",
                  legendPosition: "middle",
                  legendOffset: -60,
                }}
                enableLabel={true}
                labelSkipWidth={16}
                labelSkipHeight={16}
                labelTextColor="#fff"
                animate={true}
                motionConfig="wobbly"
                tooltip={({ id, value, indexValue }) => (
                  <div style={{ padding: 8 }}>
                    <strong>{indexValue}</strong>
                    <br />
                    <span style={{ color: "#2563eb" }}>{value} ventas</span>
                  </div>
                )}
                theme={{
                  axis: {
                    ticks: {
                      text: { fontSize: 14, fill: "#334155" },
                    },
                    legend: {
                      text: {
                        fontSize: 16,
                        fontWeight: "bold",
                        fill: "#1e293b",
                      },
                    },
                  },
                  labels: {
                    text: { fontSize: 13, fontWeight: "bold" },
                  },
                }}
                legends={[
                  {
                    dataFrom: "keys",
                    anchor: "top-right",
                    direction: "row",
                    justify: false,
                    translateX: 0,
                    translateY: -30,
                    itemsSpacing: 2,
                    itemWidth: 80,
                    itemHeight: 20,
                    itemDirection: "left-to-right",
                    symbolSize: 16,
                    symbolShape: "circle",
                    effects: [
                      { on: "hover", style: { itemTextColor: "#2563eb" } },
                    ],
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado del Inventario</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 320 }}>
              <ResponsivePie
                data={stockData.map((d) => ({
                  id: d.name,
                  label: d.name,
                  value: d.value,
                  color: d.color,
                }))}
                margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
                innerRadius={0.6}
                padAngle={2}
                cornerRadius={8}
                colors={{ datum: "data.color" }}
                borderWidth={3}
                borderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
                enableArcLabels={true}
                arcLabelsRadiusOffset={0.7}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="#334155"
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#334155"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: "color" }}
                animate={true}
                motionConfig="wobbly"
                tooltip={({ datum }) => (
                  <div style={{ padding: 8 }}>
                    <strong>{datum.label}</strong>
                    <br />
                    <span style={{ color: datum.color }}>
                      {datum.value} unidades
                    </span>
                    <br />
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      {(
                        (datum.value /
                          stockData.reduce((a, b) => a + b.value, 0)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                )}
                theme={{
                  labels: {
                    text: { fontSize: 14, fontWeight: "bold" },
                  },
                }}
                legends={[
                  {
                    anchor: "bottom",
                    direction: "row",
                    justify: false,
                    translateX: 0,
                    translateY: 30,
                    itemsSpacing: 2,
                    itemWidth: 120,
                    itemHeight: 20,
                    itemDirection: "left-to-right",
                    symbolSize: 18,
                    symbolShape: "circle",
                    effects: [
                      { on: "hover", style: { itemTextColor: "#2563eb" } },
                    ],
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        {(userRole === "contador" || userRole === "gerente") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold mb-2">
                Ingresos Mensuales
              </CardTitle>
            </CardHeader>
            <CardContent
              style={{ height: 340, padding: "24px 12px 12px 12px" }}
            >
              <ResponsiveLine
                data={[
                  {
                    id: "Ingresos",
                    data: salesData.map((d) => ({
                      x: d.date,
                      y: d.monto ? d.monto : 0,
                    })),
                  },
                ]}
                margin={{ top: 50, right: 50, bottom: 70, left: 80 }}
                xScale={{ type: "point" }}
                yScale={{
                  type: "linear",
                  min: "auto",
                  max: "auto",
                  stacked: false,
                  reverse: false,
                }}
                axisBottom={{
                  tickSize: 6,
                  tickPadding: 14,
                  tickRotation: 0,
                  legend: "Día",
                  legendPosition: "middle",
                  legendOffset: 56,
                }}
                axisLeft={{
                  tickSize: 6,
                  tickPadding: 14,
                  tickRotation: 0,
                  legend: "Monto",
                  legendPosition: "middle",
                  legendOffset: -90, // Más espacio para separar el texto del eje
                }}
                colors={["#059669"]}
                pointSize={14}
                pointColor={{ theme: "background" }}
                pointBorderWidth={4}
                pointBorderColor={{ from: "serieColor" }}
                enableArea={true}
                areaOpacity={0.18}
                curve="monotoneX"
                enableSlices="x"
                enableCrosshair={true}
                animate={true}
                motionConfig="wobbly"
                tooltip={({ point }) => (
                  <div style={{ padding: 10, fontSize: 15 }}>
                    <strong>{point.data.x}</strong>
                    <br />
                    <span style={{ color: "#059669", fontWeight: "bold" }}>
                      ${point.data.y}
                    </span>
                  </div>
                )}
                theme={{
                  axis: {
                    ticks: {
                      text: {
                        fontSize: 16,
                        fill: "#334155",
                        fontWeight: "bold",
                      },
                    },
                    legend: {
                      text: {
                        fontSize: 18,
                        fontWeight: "bold",
                        fill: "#1e293b",
                      },
                    },
                  },
                  labels: {
                    text: { fontSize: 15, fontWeight: "bold" },
                  },
                }}
                legends={[
                  {
                    anchor: "top-left",
                    direction: "row",
                    justify: false,
                    translateX: 0,
                    translateY: -36,
                    itemsSpacing: 2,
                    itemWidth: 110,
                    itemHeight: 24,
                    itemDirection: "left-to-right",
                    symbolSize: 18,
                    symbolShape: "circle",
                    effects: [
                      { on: "hover", style: { itemTextColor: "#059669" } },
                    ],
                  },
                ]}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
