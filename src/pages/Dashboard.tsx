import { useEffect, useState, useContext } from "react";
import ErrorScreen from "@/components/ErrorScreen";
import NoConnectionScreen from "@/components/NoConnectionScreen";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LanguageContext } from "@/context/LanguageContext";

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

const translations = {
  en: {
    dashboard: "Dashboard",
    welcome: "Welcome to Don Lucho's Hardware Store",
    switchLanguage: "Switch to Spanish",
    totalRevenue: "Total Revenue",
    activeSuppliers: "Active Suppliers",
    topProducts: "Top Sold Products",
    recentSales: "Recent Sales",
    totalProducts: "Total Products",
    lowStock: "with low stock",
    activeUsers: "Active Users",
    registeredSales: "Registered Sales",
    monthlyTotal: "Monthly Total",
    criticalStock: "Products with Critical Stock",
    checkInventory: "Check inventory to restock.",
    soldProductsRanking: "Ranking of Sold Products",
    noSoldProducts: "No sold products data.",
    activeSuppliersChart: "Active Suppliers",
    noSuppliers: "No supplier data.",
    last7DaysSales: "Sales in the Last 7 Days",
    noSales: "No sales data.",
    inventoryStatus: "Inventory Status",
    inventoryColors: "Colors: Inventory Status",
    normalStock: "Normal Stock",
    lowStockLabel: "Low Stock",
    criticalStockLabel: "Critical Stock",
    loading: "Loading data...",
    retry: "Retry",
  },
  es: {
    dashboard: "Dashboard",
    welcome: "Bienvenido a Ferretería Don Lucho",
    switchLanguage: "Cambiar a Inglés",
    totalRevenue: "Ingresos Totales",
    activeSuppliers: "Proveedores Activos",
    topProducts: "Top Productos Vendidos",
    recentSales: "Ventas Recientes",
    totalProducts: "Total Productos",
    lowStock: "con stock bajo",
    activeUsers: "Usuarios Activos",
    registeredSales: "Ventas Registradas",
    monthlyTotal: "Total del mes",
    criticalStock: "Productos con Stock Crítico",
    checkInventory: "Revisa el inventario para reabastecer.",
    soldProductsRanking: "Ranking Productos Vendidos",
    noSoldProducts: "No hay datos de productos vendidos.",
    activeSuppliersChart: "Proveedores Activos",
    noSuppliers: "No hay datos de proveedores.",
    last7DaysSales: "Ventas Últimos 7 Días",
    noSales: "No hay datos de ventas.",
    inventoryStatus: "Estado del Inventario",
    inventoryColors: "Colores: Estado del inventario",
    normalStock: "Stock Normal",
    lowStockLabel: "Stock Bajo",
    criticalStockLabel: "Stock Crítico",
    loading: "Cargando datos...",
    retry: "Reintentar",
  },
};

const Dashboard = () => {
  const { userRole } = useAuth();
  const { language, setLanguage } = useContext(LanguageContext);
  const t = translations[language];

  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    totalSales: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
    totalRevenue: 0,
    topProducts: [],
    activeSuppliers: 0,
    recentSales: [],
  });
  const [suppliersList, setSuppliersList] = useState<any[]>([]);

  const [salesData, setSalesData] = useState<
    { date: string; ventas: number; monto: number }[]
  >([]);

  const [stockData, setStockData] = useState<
    { name: string; value: number; color: string }[]
  >([]);

  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setConnectionError(false);
      // 🔹 1. Productos
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("*");

      if (prodError) {
        if (
          prodError.message?.includes("Failed to fetch") ||
          prodError.code === "ECONNREFUSED"
        ) {
          setConnectionError(true);
          throw prodError;
        }
        throw prodError;
      }

      const lowStock = products?.filter((p) => p.stock <= p.min_stock) || [];

      // 🔹 2. Ventas
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("*");

      // 🔹 4. Proveedores
      const { data: suppliers, error: suppliersError } = await supabase
        .from("suppliers")
        .select("*");
      const activeSuppliers = suppliers?.length || 0;
      setSuppliersList(suppliers || []);

      // 🔹 Productos más vendidos
      const productSales = {};
      sales?.forEach((sale) => {
        let items = sale.items;
        if (typeof items === "string") {
          try {
            items = JSON.parse(items);
          } catch {
            items = [];
          }
        }
        if (Array.isArray(items)) {
          items.forEach((item) => {
            if (!productSales[item.product_id])
              productSales[item.product_id] = 0;
            productSales[item.product_id] += item.quantity;
          });
        }
      });
      const topProducts = Object.entries(productSales)
        .map(([id, qty]) => {
          const prod = products?.find((p) => String(p.id) === String(id));
          const cantidad = Number(qty);
          return prod && !isNaN(cantidad) && cantidad > 0
            ? { name: prod.name, qty: cantidad }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      // 🔹 Ingresos totales históricos
      const totalRevenue = sales?.reduce(
        (sum, s) => sum + Number(s.total || 0),
        0
      );

      // 🔹 Ventas recientes
      const recentSales = sales?.slice(-5).reverse() || [];

      if (salesError) {
        if (
          salesError.message?.includes("Failed to fetch") ||
          salesError.code === "ECONNREFUSED"
        ) {
          setConnectionError(true);
          throw salesError;
        }
        throw salesError;
      }

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

        if (userError) {
          if (
            userError.message?.includes("Failed to fetch") ||
            userError.code === "ECONNREFUSED"
          ) {
            setConnectionError(true);
            throw userError;
          }
          throw userError;
        }
        userCount = count || 0;
      }

      setStats({
        totalProducts: products?.length || 0,
        lowStockProducts: lowStock.length,
        totalSales: sales?.length || 0,
        monthlyRevenue,
        totalUsers: userCount,
        totalRevenue,
        topProducts,
        activeSuppliers,
        recentSales,
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
      if (connectionError) return;
      setAlertMsg("Error cargando datos del dashboard");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {connectionError ? (
          <NoConnectionScreen />
        ) : alertMsg ? (
          <ErrorScreen message={t.retry} onRetry={loadDashboardData} />
        ) : null}

        <div>
          <h1 className="text-3xl font-bold">{t.dashboard}</h1>
          <p className="text-muted-foreground">{t.welcome}</p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              const newLanguage = language === "es" ? "en" : "es";
              setLanguage(newLanguage);
            }}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            {t.switchLanguage}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <span className="text-lg text-muted-foreground">{t.loading}</span>
          </div>
        ) : (
          <>
            {/* 🔹 Tarjetas de estadísticas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Ingresos totales históricos */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t.totalRevenue}
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    $
                    {stats.totalRevenue.toLocaleString(
                      language === "es" ? "es-CL" : "en-US"
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Proveedores activos */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t.activeSuppliers}
                  </CardTitle>
                  <Package className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.activeSuppliers}
                  </div>
                </CardContent>
              </Card>

              {/* Productos más vendidos */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t.topProducts}
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <ul className="text-sm mt-2">
                    {stats.topProducts.map((p, idx) => (
                      <li key={idx}>
                        {p.name}: {p.qty}{" "}
                        {language === "es" ? "vendidos" : "sold"}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Ventas recientes */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t.recentSales}
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <ul className="text-sm mt-2">
                    {stats.recentSales.map((s, idx) => (
                      <li key={idx}>
                        {new Date(s.created_at).toLocaleString(
                          language === "es" ? "es-CL" : "en-US"
                        )}{" "}
                        - $
                        {Number(s.total).toLocaleString(
                          language === "es" ? "es-CL" : "en-US"
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t.totalProducts}
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalProducts}
                  </div>
                  {stats.lowStockProducts > 0 && (
                    <p className="text-xs text-destructive mt-1">
                      {stats.lowStockProducts} {t.lowStock}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Usuarios activos solo para gerente */}
              {userRole === "gerente" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t.activeUsers}
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  </CardContent>
                </Card>
              )}

              {/* Ventas y resumen para cajero y contador */}
              {(userRole === "cajero" || userRole === "contador") && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t.registeredSales}
                    </CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalSales}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.monthlyTotal}: $
                      {stats.monthlyRevenue.toLocaleString(
                        language === "es" ? "es-CL" : "en-US"
                      )}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Inventario para bodeguero */}
              {userRole === "bodeguero" && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t.criticalStock}
                    </CardTitle>
                    <Package className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.lowStockProducts}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.checkInventory}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 🔹 Gráficos */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Gráfico de productos más vendidos */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.soldProductsRanking}</CardTitle>
                </CardHeader>
                <CardContent style={{ height: 320 }}>
                  {stats.topProducts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      {t.noSoldProducts}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <VictoryBar
                        data={stats.topProducts.map((p) => ({
                          x: p.name,
                          y: p.qty,
                        }))}
                        style={{ data: { fill: "#f59e42" } }}
                        labels={({ datum }) => datum.y}
                        labelComponent={<VictoryTooltip />}
                        height={220}
                      />
                      <div className="w-full text-center mt-2 mb-1 text-sm text-muted-foreground font-semibold">
                        Leyenda:
                      </div>
                      <div
                        className="flex flex-row justify-between items-end w-full mb-6"
                        style={{ gap: "0.5rem" }}
                      >
                        {stats.topProducts.map((prod, idx) => (
                          <span
                            key={prod.name}
                            className="flex flex-col items-center flex-1"
                          >
                            <span
                              className="px-2 py-1 rounded text-sm font-medium"
                              style={{
                                background: "#f59e42",
                                color: "#fff",
                                width: "100%",
                                textAlign: "center",
                                maxWidth: "120px",
                              }}
                            >
                              {prod.name}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico de proveedores activos */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.activeSuppliersChart}</CardTitle>
                </CardHeader>
                <CardContent style={{ height: 320 }}>
                  {suppliersList.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      {t.noSuppliers}
                    </div>
                  ) : (
                    <VictoryPie
                      data={suppliersList.map((s) => ({ x: s.name, y: 1 }))}
                      colorScale={[
                        "#3b82f6",
                        "#6366f1",
                        "#a21caf",
                        "#f59e42",
                        "#059669",
                      ]}
                      innerRadius={80}
                      labels={({ datum }) => datum.x}
                      labelComponent={<VictoryTooltip />}
                      padAngle={2}
                      style={{ parent: { margin: "0 auto" } }}
                    />
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t.last7DaysSales}</CardTitle>
                </CardHeader>
                <CardContent style={{ height: 320 }}>
                  {salesData.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      {t.noSales}
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
                  <CardTitle>{t.inventoryStatus}</CardTitle>
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
                        {t.inventoryColors}
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
