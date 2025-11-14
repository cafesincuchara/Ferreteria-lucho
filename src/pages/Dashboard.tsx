import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

import { Package, ShoppingCart, DollarSign, Users } from "lucide-react";

import {
  VictoryBar,
  VictoryPie,
  VictoryChart,
  VictoryAxis,
  VictoryTheme,
  VictoryLine,
  VictoryTooltip,
} from "victory";

const Dashboard = () => {
  const { userRole } = useAuth();

  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    totalSales: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
  });

  const [salesData, setSalesData] = useState<
    { date: string; ventas: number; monto: number }[]
  >([]);

  const [stockData, setStockData] = useState<
    { name: string; value: number; color: string }[]
  >([]);

  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // 🔹 1. Productos
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("*");

      if (prodError) throw prodError;

      const lowStock = products?.filter((p) => p.stock <= p.min_stock) || [];

      // 🔹 2. Ventas
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("*");

      if (salesError) throw salesError;

      const thisMonth = new Date();
      thisMonth.setDate(1);

      const monthlySales =
        sales?.filter((s) => new Date(s.created_at) >= thisMonth) || [];

      const monthlyRevenue = monthlySales.reduce(
        (sum, s) => sum + Number(s.total || 0),
        0
      );

      // 🔹 3. Usuarios (solo gerente)
      let userCount = 0;
      if (userRole === "gerente") {
        const { count, error: userError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        if (userError) throw userError;
        userCount = count || 0;
      }

      setStats({
        totalProducts: products?.length || 0,
        lowStockProducts: lowStock.length,
        totalSales: sales?.length || 0,
        monthlyRevenue,
        totalUsers: userCount,
      });

      // 🔹 Últimos 7 días — gráfico
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split("T")[0];
      }).reverse();

      const salesByDay = last7Days.map((date) => {
        const daySales = sales?.filter((s) => s.created_at.startsWith(date));

        return {
          date: new Date(date).toLocaleDateString("es-ES", {
            weekday: "short",
          }),
          ventas: daySales?.length || 0,
          monto: daySales?.reduce((sum, s) => sum + Number(s.total || 0), 0),
        };
      });

      setSalesData(salesByDay);

      // 🔹 Stock pie chart
      const stockCategories = [
        {
          name: "Stock Normal",
          value: products?.filter((p) => p.stock > p.min_stock * 2).length || 0,
          color: "hsl(var(--chart-5))",
        },
        {
          name: "Stock Bajo",
          value:
            products?.filter(
              (p) => p.stock > p.min_stock && p.stock <= p.min_stock * 2
            ).length || 0,
          color: "hsl(var(--chart-2))",
        },
        {
          name: "Stock Crítico",
          value: lowStock.length,
          color: "hsl(var(--destructive))",
        },
      ];

      setStockData(stockCategories);
    } catch (error: any) {
      setAlertMsg("Error cargando datos del dashboard");
      console.error(error);
    } finally {
      setLoading(false);
    }
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <span className="text-lg text-muted-foreground">
              Cargando datos...
            </span>
          </div>
        ) : (
          <>
            {/* 🔹 Tarjetas de estadísticas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Productos
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalProducts}
                  </div>
                  {stats.lowStockProducts > 0 && (
                    <p className="text-xs text-destructive mt-1">
                      {stats.lowStockProducts} con stock bajo
                    </p>
                  )}
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
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 🔹 Gráficos */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas Últimos 7 Días</CardTitle>
                </CardHeader>
                <CardContent style={{ height: 320 }}>
                  {salesData.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      No hay datos de ventas.
                    </div>
                  ) : (
                    <VictoryChart
                      theme={VictoryTheme.material}
                      domainPadding={30}
                      height={300}
                    >
                      <VictoryAxis />
                      <VictoryAxis dependentAxis />
                      <VictoryLine
                        data={salesData.map((d) => ({ x: d.date, y: d.monto }))}
                        style={{ data: { stroke: "#059669", strokeWidth: 3 } }}
                        labels={({ datum }) => `$${datum.y}`}
                        labelComponent={<VictoryTooltip />}
                      />
                    </VictoryChart>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estado del Inventario</CardTitle>
                </CardHeader>
                <CardContent style={{ height: 320 }}>
                  {stockData.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      No hay datos de inventario.
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <VictoryPie
                        data={stockData.map((d) => ({ x: d.name, y: d.value }))}
                        colorScale={["#059669", "#f59e42", "#ef4444"]}
                        innerRadius={80}
                        labels={({ datum }) => `${datum.x}: ${datum.y}`}
                        labelComponent={<VictoryTooltip />}
                        padAngle={2}
                        style={{ parent: { margin: "0 auto" } }}
                      />
                      <div className="w-full text-center mt-4 mb-2 text-sm text-muted-foreground font-semibold">
                        Colores: Estado del inventario
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center mb-2">
                        {stockData.map((cat) => (
                          <span
                            key={cat.name}
                            className="flex items-center gap-2 px-3 py-1 rounded text-sm font-medium"
                            style={{
                              background: cat.color,
                              color: "#fff",
                              minWidth: 120,
                            }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: cat.color,
                                marginRight: 8,
                              }}
                            />
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
