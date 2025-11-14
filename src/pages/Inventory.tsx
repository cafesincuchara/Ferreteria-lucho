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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

const Inventory = () => {
  const { userRole } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  };

  // Filtrar productos por nombre o SKU
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(search.toLowerCase()))
  );

  // Roles: gerente y bodeguero pueden ver inventario completo
  if (userRole !== "gerente" && userRole !== "bodeguero") {
    return (
      <DashboardLayout>
        <div className="p-6">No tienes acceso a esta sección.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Inventario</h1>
        <div className="mb-4">
          <input
            type="text"
            className="border rounded px-3 py-2 w-full max-w-md"
            placeholder="Buscar producto o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Lista de Productos en Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Stock Mínimo</TableHead>
                  <TableHead>Proveedor</TableHead>
                  {userRole === "bodeguero" && (
                    <TableHead>Descripción</TableHead>
                  )}
                  {userRole === "bodeguero" && <TableHead>Precio</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.sku || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          product.stock <= product.min_stock
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {product.stock} unidades
                      </Badge>
                    </TableCell>
                    <TableCell>{product.min_stock}</TableCell>
                    <TableCell>{product.supplier_id || "-"}</TableCell>
                    {userRole === "bodeguero" && (
                      <TableCell>{product.description || "-"}</TableCell>
                    )}
                    {userRole === "bodeguero" && (
                      <TableCell>
                        ${product.price?.toLocaleString("es-CL") || "-"}
                      </TableCell>
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

export default Inventory;
