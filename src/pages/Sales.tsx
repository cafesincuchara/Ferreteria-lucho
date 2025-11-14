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
import { toast } from "sonner";

const Sales = () => {
  const { userRole } = useAuth();
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const { data } = await supabase.from("sales").select("*");
    setSales(data || []);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Ventas</h1>
        <Card>
          <CardHeader>
            <CardTitle>Lista de Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  {userRole === "gerente" && <TableHead>Usuario</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{sale.created_at}</TableCell>
                    <TableCell>{sale.customer_name || "-"}</TableCell>
                    <TableCell>
                      ${Number(sale.total).toLocaleString("es-CL")}
                    </TableCell>
                    {userRole === "gerente" && (
                      <TableCell>{sale.user_id}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Sales;
