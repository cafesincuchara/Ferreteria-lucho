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
  const [showCritical, setShowCritical] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [entryAmount, setEntryAmount] = useState("");
  const [movements, setMovements] = useState<any[]>([]);
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStock, setFilterStock] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadMovements = async (productId: string) => {
    const { data } = await supabase
      .from("inventory_movements")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    setMovements(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  };

  //--------------------------------------------------------
  // 🔍 FILTROS — ESTA PARTE ESTABA MAL Y LA REESCRIBÍ BIEN
  //--------------------------------------------------------

  let filteredProducts = products.filter((product) => {
    let match =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(search.toLowerCase()));

    if (filterSupplier && String(product.supplier_id) !== filterSupplier)
      match = false;

    if (filterCategory && product.category !== filterCategory)
      match = false;

    if (filterStock) {
      if (filterStock === "normal" && product.stock <= product.min_stock * 2)
        match = false;

      if (filterStock === "bajo" &&
          !(product.stock > product.min_stock && product.stock <= product.min_stock * 2))
        match = false;

      if (filterStock === "critico" && !(product.stock <= product.min_stock))
        match = false;
    }

    if (showCritical && !(product.stock <= product.min_stock))
      match = false;

    return match;
  });

  //--------------------------------------------------------
  // UI
  //--------------------------------------------------------

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">

        <h1 className="text-3xl font-bold">Inventario</h1>
        <p className="text-muted-foreground">
          Gestión de productos disponibles en Ferretería Don Lucho
        </p>

        {/* 🔎 Barra de búsqueda */}
        <input
          className="border rounded px-3 py-2 w-full md:w-1/2"
          placeholder="Buscar producto o SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* 🔽 FILTROS — AHORA SI FUNCIONA */}
        {userRole === "bodeguero" && (
          <div className="flex gap-2 flex-wrap mt-4">

            {/* Proveedor */}
            <select
              className="border rounded px-2 py-2"
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
            >
              <option value="">Todos los proveedores</option>
              {Array.from(
                new Set(products.map((p) => p.supplier_id).filter(Boolean))
              ).map((sup) => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>

            {/* Categoría */}
            <select
              className="border rounded px-2 py-2"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {Array.from(
                new Set(products.map((p) => p.category).filter(Boolean))
              ).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Estado del stock */}
            <select
              className="border rounded px-2 py-2"
              value={filterStock}
              onChange={(e) => {
                setFilterStock(e.target.value);
                if (e.target.value) setShowCritical(false);
              }}
              disabled={showCritical}
            >
              <option value="">Todos los estados</option>
              <option value="normal">Stock normal</option>
              <option value="bajo">Stock bajo</option>
              <option value="critico">Stock crítico</option>
            </select>

            {/* Botón: Solo críticos */}
            <button
              className={`border rounded px-3 py-2 ${
                showCritical ? "bg-red-100" : ""
              }`}
              onClick={() => {
                setShowCritical((v) => !v);
                if (!showCritical) setFilterStock("");
              }}
            >
              {showCritical ? "Ver todos" : "Ver stock crítico"}
            </button>

          </div>
        )}

        {/* 📦 TABLA DE PRODUCTOS */}
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
                    <>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Acciones</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.sku || "-"}</TableCell>

                    {/* STOCK */}
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

                      {userRole === "bodeguero" && (
                        <button
                          className="ml-2 text-xs underline text-blue-600"
                          onClick={() => {
                            setSelectedProduct(product);
                            loadMovements(product.id);
                          }}
                        >
                          Ver movimientos
                        </button>
                      )}
                    </TableCell>

                    <TableCell>{product.min_stock}</TableCell>
                    <TableCell>{product.supplier_id || "-"}</TableCell>

                    {userRole === "bodeguero" && (
                      <>
                        <TableCell>{product.description || "-"}</TableCell>
                        <TableCell>
                          ${product.price?.toLocaleString("es-CL") || "-"}
                        </TableCell>

                        <TableCell>
                          <button
                            className="border rounded px-2 py-1 text-xs bg-green-100"
                            onClick={() => setSelectedProduct(product)}
                          >
                            Registrar entrada
                          </button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 📄 MODAL PARA ENTRADAS Y MOVIMIENTOS */}
        {userRole === "bodeguero" && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-full max-w-lg relative">

              <button
                className="absolute top-2 right-2"
                onClick={() => {
                  setSelectedProduct(null);
                  setEntryAmount("");
                }}
              >
                ✕
              </button>

              <h2 className="text-xl font-bold mb-3">{selectedProduct.name}</h2>

              {/* Entrada de stock */}
              <input
                type="number"
                className="border rounded px-2 py-1 w-full mb-3"
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
                min={1}
                placeholder="Cantidad a ingresar"
              />

              <button
                className="bg-green-600 text-white px-3 py-1 rounded mb-4"
                onClick={async () => {
                  if (!entryAmount || Number(entryAmount) <= 0) return;

                  await supabase.from("inventory_movements").insert({
                    product_id: selectedProduct.id,
                    type: "entrada",
                    amount: Number(entryAmount),
                  });

                  await supabase
                    .from("products")
                    .update({
                      stock: selectedProduct.stock + Number(entryAmount),
                    })
                    .eq("id", selectedProduct.id);

                  setEntryAmount("");
                  loadProducts();
                  loadMovements(selectedProduct.id);
                }}
              >
                Guardar entrada
              </button>

              {/* Movimientos */}
              <h3 className="font-semibold mb-2">Historial de movimientos</h3>

              <table className="w-full text-sm border">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((mov) => (
                    <tr key={mov.id}>
                      <td>{mov.created_at?.slice(0, 16).replace("T", " ")}</td>
                      <td>{mov.type}</td>
                      <td>{mov.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Inventory;
