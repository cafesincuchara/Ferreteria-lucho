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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
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
  const [alerts, setAlerts] = useState<any[]>([]);

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
    const monthlySales = sales?.filter(
      (s) => new Date(s.created_at) >= thisMonth
    ) || [];
    const monthlyRevenue = monthlySales.reduce((sum, s) => sum + Number(s.total), 0);

    // Load users count (only for gerente)
    let userCount = 0;
    if (userRole === "gerente") {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
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
      const daySales = sales?.filter((s) => s.created_at.startsWith(date)) || [];
      return {
        date: new Date(date).toLocaleDateString("es-ES", { weekday: "short" }),
        ventas: daySales.length,
        monto: daySales.reduce((sum, s) => sum + Number(s.total), 0),
      };
    });
    setSalesData(salesByDay);

    // Stock data for pie chart
    const stockCategories = [
      { name: "Stock Normal", value: (products?.filter((p) => p.stock > p.min_stock * 2) || []).length, color: "hsl(var(--chart-5))" },
      { name: "Stock Bajo", value: (products?.filter((p) => p.stock > p.min_stock && p.stock <= p.min_stock * 2) || []).length, color: "hsl(var(--chart-2))" },
      { name: "Stock Crítico", value: lowStock.length, color: "hsl(var(--destructive))" },
    ];
    setStockData(stockCategories);

    // Load alerts
    const { data: alertsData } = await supabase
      .from("alerts")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5);
    setAlerts(alertsData || []);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
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
              <p className="text-xs text-muted-foreground mt-1">
                Mes actual
              </p>
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

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Alertas Recientes</h2>
            {alerts.slice(0, 3).map((alert) => (
              <Alert key={alert.id} variant={alert.alert_type === "stock_bajo" ? "destructive" : "default"}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ventas Últimos 7 Días</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ventas" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado del Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stockData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stockData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {(userRole === "contador" || userRole === "gerente") && (
          <Card>
            <CardHeader>
              <CardTitle>Ingresos Mensuales</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="monto" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
