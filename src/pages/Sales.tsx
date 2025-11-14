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
import { Trash2, Edit, Plus } from "lucide-react";

const documentTypes = ["Boleta", "Factura", "Otro"];

const Sales = () => {
  const { user, userRole } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [formData, setFormData] = useState({
    customer_name: "",
    document_type: "Boleta",
    items: [{ product_id: "", quantity: 1 }],
  });
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  // Filtros avanzados
  const [filterCliente, setFilterCliente] = useState("");
  const [filterProducto, setFilterProducto] = useState("");
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");

  useEffect(() => {
    loadSales();
    loadProducts();
  }, []);

  const loadSales = async () => {
    const { data } = await supabase.from("sales").select("*");
    setSales(data || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  };

  // Calcula el monto total de la venta
  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const prod = products.find((p) => p.id === item.product_id);
      return sum + (prod ? prod.price * item.quantity : 0);
    }, 0);
  };

  // Registrar venta y descontar stock
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validación básica
      if (!formData.customer_name)
        throw new Error("Nombre del cliente requerido");
      if (formData.items.some((item) => !item.product_id || item.quantity < 1))
        throw new Error("Producto y cantidad requeridos");
      // Verifica stock suficiente
      for (const item of formData.items) {
        const prod = products.find((p) => p.id === item.product_id);
        if (!prod || prod.stock < item.quantity)
          throw new Error(`Stock insuficiente para ${prod?.name}`);
      }
      // Generar sale_number único
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const { data: lastSale } = await supabase
        .from("sales")
        .select("sale_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      let nextNum = 1;
      if (
        lastSale?.sale_number &&
        lastSale.sale_number.startsWith(`V-${dateStr}-`)
      ) {
        const lastNum = parseInt(lastSale.sale_number.split("-").pop() || "0");
        nextNum = lastNum + 1;
      }
      const sale_number = `V-${dateStr}-${String(nextNum).padStart(3, "0")}`;
      // Inserta venta
      const total = calculateTotal();
      const { data: sale, error } = await supabase
        .from("sales")
        .insert([
          {
            customer_name: formData.customer_name,
            document_type: formData.document_type.toLowerCase(),
            total,
            items: JSON.stringify(formData.items),
            sale_number,
            user_id: user?.id,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      // Descuenta stock
      for (const item of formData.items) {
        const prod = products.find((p) => p.id === item.product_id);
        await supabase
          .from("products")
          .update({ stock: prod.stock - item.quantity })
          .eq("id", item.product_id);
      }
      setAlertMsg("Venta registrada correctamente");
      setOpen(false);
      setFormData({
        customer_name: "",
        document_type: "Boleta",
        items: [{ product_id: "", quantity: 1 }],
      });
      loadSales();
      loadProducts();
    } catch (err: any) {
      setAlertMsg(err.message);
    }
  };

  // Editar venta (solo permite cambiar datos, no productos vendidos ni stock)
  const handleEdit = (sale: any) => {
    setEditingSale(sale);
    setFormData({
      customer_name: sale.customer_name,
      document_type: sale.document_type,
      items: sale.items || [{ product_id: "", quantity: 1 }],
    });
    setOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const total = calculateTotal();
      const { error } = await supabase
        .from("sales")
        .update({
          customer_name: formData.customer_name,
          document_type: formData.document_type,
          total,
        })
        .eq("id", editingSale.id);
      if (error) throw error;
      setAlertMsg("Venta actualizada correctamente");
      setOpen(false);
      setEditingSale(null);
      loadSales();
    } catch (err: any) {
      setAlertMsg(err.message);
    }
  };

  // Eliminar venta
  const handleDelete = async (saleId: string) => {
    if (!confirm("¿Eliminar esta venta?")) return;
    try {
      const { error } = await supabase.from("sales").delete().eq("id", saleId);
      if (error) throw error;
      setAlertMsg("Venta eliminada correctamente");
      loadSales();
    } catch (err: any) {
      setAlertMsg(err.message);
    }
  };

  // Agregar/quitar productos en el formulario
  const addProductRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: "", quantity: 1 }],
    });
  };
  const removeProductRow = (idx: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx),
    });
  };

  // Filtro reactivo de ventas
  const filteredSales = sales.filter((sale) => {
    let match = true;
    if (
      filterCliente &&
      !sale.customer_name?.toLowerCase().includes(filterCliente.toLowerCase())
    )
      match = false;
    if (filterProducto) {
      let items = sale.items;
      if (typeof items === "string") {
        try {
          items = JSON.parse(items);
        } catch {
          items = [];
        }
      }
      if (
        !Array.isArray(items) ||
        !items.some((item: any) => String(item.product_id) === filterProducto)
      )
        match = false;
    }
    if (filterDesde && new Date(sale.created_at) < new Date(filterDesde))
      match = false;
    if (filterHasta && new Date(sale.created_at) > new Date(filterHasta))
      match = false;
    return match;
  });

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
        <h1 className="text-3xl font-bold">Ventas</h1>
        {/* Filtros avanzados */}
        <div className="mb-4 flex gap-2 flex-wrap items-end">
          <Input
            type="date"
            value={filterDesde}
            onChange={(e) => setFilterDesde(e.target.value)}
            placeholder="Desde"
          />
          <Input
            type="date"
            value={filterHasta}
            onChange={(e) => setFilterHasta(e.target.value)}
            placeholder="Hasta"
          />
          <Input
            value={filterCliente}
            onChange={(e) => setFilterCliente(e.target.value)}
            placeholder="Cliente"
          />
          <select
            className="border rounded px-2 py-2"
            value={filterProducto}
            onChange={(e) => setFilterProducto(e.target.value)}
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => {
              setFilterCliente("");
              setFilterProducto("");
              setFilterDesde("");
              setFilterHasta("");
            }}
          >
            Limpiar filtros
          </Button>
        </div>
        <div className="flex justify-end mb-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingSale(null);
                  setFormData({
                    customer_name: "",
                    document_type: "Boleta",
                    items: [{ product_id: "", quantity: 1 }],
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Registrar Venta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingSale ? "Editar Venta" : "Registrar Venta"}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={editingSale ? handleUpdate : handleSubmit}
                className="space-y-4"
              >
                <div>
                  <Label>Nombre del Cliente *</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer_name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Tipo de Documento *</Label>
                  <Select
                    value={formData.document_type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, document_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((dt) => (
                        <SelectItem key={dt} value={dt}>
                          {dt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Productos *</Label>
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <Select
                        value={item.product_id}
                        onValueChange={(v) => {
                          const items = [...formData.items];
                          items[idx].product_id = v;
                          setFormData({ ...formData, items });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (Stock: {p.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const items = [...formData.items];
                          items[idx].quantity = parseInt(e.target.value);
                          setFormData({ ...formData, items });
                        }}
                        className="w-24"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeProductRow(idx)}
                        disabled={formData.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addProductRow}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Producto
                  </Button>
                </div>
                <div>
                  <Label>Monto Total</Label>
                  <div className="font-bold text-lg">
                    ${calculateTotal().toLocaleString("es-CL")}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="submit">
                    {editingSale ? "Actualizar" : "Registrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
                  <TableHead>Documento</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Total</TableHead>
                  {(userRole === "gerente" || userRole === "contador") && (
                    <TableHead>Usuario</TableHead>
                  )}
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{sale.created_at}</TableCell>
                    <TableCell>{sale.customer_name || "-"}</TableCell>
                    <TableCell>{sale.document_type || "-"}</TableCell>
                    <TableCell>
                      {(() => {
                        let items = sale.items;
                        if (typeof items === "string") {
                          try {
                            items = JSON.parse(items);
                          } catch {
                            items = [];
                          }
                        }
                        return Array.isArray(items)
                          ? items.map((item: any, idx: number) => {
                              const prod = products.find(
                                (p) => p.id === item.product_id
                              );
                              return prod ? (
                                <span key={idx}>
                                  {prod.name} x{item.quantity}
                                  <br />
                                </span>
                              ) : null;
                            })
                          : null;
                      })()}
                    </TableCell>
                    <TableCell>
                      ${Number(sale.total).toLocaleString("es-CL")}
                    </TableCell>
                    {(userRole === "gerente" || userRole === "contador") && (
                      <TableCell>{sale.user_id}</TableCell>
                    )}
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(sale)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(sale.id)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
