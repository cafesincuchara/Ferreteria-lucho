import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit, Package, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { logAction } from "@/lib/logger";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().min(0, "Precio debe ser positivo"),
  cost: z.number().min(0, "Costo debe ser positivo"),
  stock: z.number().int().min(0, "Stock debe ser positivo"),
  min_stock: z.number().int().min(0, "Stock mínimo debe ser positivo"),
  supplier_id: z.string().optional(),
});

const Products = () => {
  const { userRole } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    price: 0,
    cost: 0,
    stock: 0,
    min_stock: 10,
    supplier_id: "",
  });
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<{
    id: string;
    msg: string;
  } | null>(null);

  useEffect(() => {
    loadProducts();
    loadSuppliers();
  }, []);

  useEffect(() => {
    // Filtrar productos cuando cambia el término de búsqueda
    if (searchTerm.trim() === "") {
      setFilteredProducts(products);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          (product.sku && product.sku.toLowerCase().includes(term)) ||
          (product.description &&
            product.description.toLowerCase().includes(term))
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select(
        `
        *,
        suppliers (name)
      `
      )
      .order("created_at", { ascending: false });
    setProducts(data || []);
  };

  const loadSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*");
    setSuppliers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = productSchema.parse(formData);

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(validatedData as any)
          .eq("id", editingProduct.id);

        if (error) throw error;
        await logAction(
          "Actualizar producto",
          "product",
          editingProduct.id,
          validatedData
        );
        setAlertMsg("Producto actualizado correctamente");
        // Eliminar alerta de stock bajo si el stock supera el mínimo
        if (validatedData.stock > validatedData.min_stock) {
          await supabase
            .from("alerts")
            .delete()
            .eq("product_id", editingProduct.id)
            .eq("alert_type", "stock_bajo");
        }
      } else {
        const { error } = await supabase
          .from("products")
          .insert([validatedData as any]);

        if (error) throw error;
        await logAction("Crear producto", "product", undefined, validatedData);
        setAlertMsg("Producto creado correctamente");
      }

      setOpen(false);
      resetForm();
      loadProducts();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setAlertMsg(error.errors[0].message);
      } else {
        setAlertMsg(error.message || "Error al procesar");
      }
    }
  };

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDelete = (productId: string) => {
    setConfirmMsg({
      id: productId,
      msg: "¿Estás seguro de eliminar este producto?",
    });
    setPendingDeleteId(productId);
  };

  const confirmDeleteProduct = async () => {
    if (!pendingDeleteId) return;
    setConfirmMsg(null);
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", pendingDeleteId);
      if (error) throw error;
      await logAction("Eliminar producto", "product", pendingDeleteId);
      setAlertMsg("Producto eliminado correctamente");
      loadProducts();
    } catch (error: any) {
      if (error?.message?.includes("Failed to fetch")) {
        setAlertMsg("Sin conexión a internet. Intenta nuevamente.");
      } else {
        setAlertMsg(error.message || "Error al eliminar");
      }
    }
    setPendingDeleteId(null);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      price: Number(product.price),
      cost: Number(product.cost),
      stock: product.stock,
      min_stock: product.min_stock,
      supplier_id: product.supplier_id || "",
    });
    setOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sku: "",
      price: 0,
      cost: 0,
      stock: 0,
      min_stock: 10,
      supplier_id: "",
    });
    setEditingProduct(null);
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
        {confirmMsg && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-900 border border-red-300 flex justify-between items-center">
            <span>{confirmMsg.msg}</span>
            <div>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDeleteProduct}
              >
                Eliminar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="ml-2"
                onClick={() => setConfirmMsg(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Productos</h1>
            <p className="text-muted-foreground">
              Administra el catálogo de productos
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>SKU</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Precio Venta *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Costo *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost: parseFloat(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stock Actual *</Label>
                    <Input
                      type="number"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stock: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>Stock Mínimo *</Label>
                    <Input
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          min_stock: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Proveedor</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, supplier_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingProduct ? "Actualizar" : "Crear"} Producto
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Productos</CardTitle>
            {(userRole === "admin" || userRole === "bodeguero") && (
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, SKU o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRole === "admin" || userRole === "bodeguero" ? (
                  filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        {searchTerm
                          ? "No se encontraron productos que coincidan con la búsqueda"
                          : "No hay productos registrados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.description && (
                                <div className="text-xs text-muted-foreground">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.sku || "-"}</TableCell>
                        <TableCell>
                          ${Number(product.price).toLocaleString("es-CL")}
                        </TableCell>
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
                        <TableCell>{product.suppliers?.name || "-"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No hay productos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-xs text-muted-foreground">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{product.sku || "-"}</TableCell>
                      <TableCell>
                        ${Number(product.price).toLocaleString("es-CL")}
                      </TableCell>
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
                      <TableCell>{product.suppliers?.name || "-"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Products;
