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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit } from "lucide-react";

const Suppliers = () => {
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<{
    id: string;
    msg: string;
  } | null>(null);
  const { userRole } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [products, setProducts] = useState<any[]>([]);
  const [filterNombre, setFilterNombre] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  };

  const loadSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*");
    setSuppliers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      if (editingSupplier) {
        await supabase
          .from("suppliers")
          .update(formData)
          .eq("id", editingSupplier.id);
      } else {
        await supabase.from("suppliers").insert(formData);
      }
      setOpen(false);
      setFormData({ name: "", email: "", phone: "", address: "" });
      setEditingSupplier(null);
      loadSuppliers();
    } catch (err) {}
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    setConfirmMsg({ id, msg: "¿Estás seguro de eliminar este proveedor?" });
    window.confirmDeleteSupplier = async () => {
      setConfirmMsg(null);
      try {
        const { error } = await supabase
          .from("suppliers")
          .delete()
          .eq("id", id);
        if (error) throw error;
        setAlertMsg("Proveedor eliminado correctamente");
        loadSuppliers();
      } catch (err: any) {
        if (err?.message?.includes("Failed to fetch")) {
          setAlertMsg("Sin conexión a internet. Intenta nuevamente.");
        } else {
          setAlertMsg(err.message);
        }
      }
    };
  };

  if (userRole !== "gerente" && userRole !== "bodeguero") {
    return (
      <DashboardLayout>
        <div className="p-6">No tienes acceso a esta sección.</div>
      </DashboardLayout>
    );
  }

  // Filtro reactivo de proveedores
  const filteredSuppliers = suppliers.filter((s) => {
    let match = true;
    if (
      filterNombre &&
      !s.name?.toLowerCase().includes(filterNombre.toLowerCase())
    )
      match = false;
    if (filterCategoria) {
      const productos = products.filter((p) => p.supplier_id === s.id);
      if (!productos.some((p) => p.category === filterCategoria)) match = false;
    }
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
        {confirmMsg && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-900 border border-red-300 flex justify-between items-center">
            <span>{confirmMsg.msg}</span>
            <div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => window.confirmDeleteSupplier()}
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
        <h1 className="text-3xl font-bold">Proveedores</h1>
        {/* Filtros avanzados */}
        <div className="mb-4 flex gap-2 flex-wrap items-end">
          <Input
            value={filterNombre}
            onChange={(e) => setFilterNombre(e.target.value)}
            placeholder="Nombre"
          />
          <select
            className="border rounded px-2 py-2"
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {Array.from(
              new Set(products.map((p) => p.category).filter(Boolean))
            ).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => {
              setFilterNombre("");
              setFilterCategoria("");
            }}
          >
            Limpiar filtros
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Lista de Proveedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingSupplier(null);
                      setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        address: "",
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Proveedor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      placeholder="Nombre"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder="Teléfono"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      required
                    />
                    <Input
                      placeholder="Dirección"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      required
                    />
                    <Button type="submit" className="w-full">
                      {editingSupplier ? "Actualizar" : "Crear"} Proveedor
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Dirección</TableHead>
                  {userRole === "bodeguero" && (
                    <TableHead>Productos Suministrados</TableHead>
                  )}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.email || "-"}</TableCell>
                    <TableCell>{s.phone || "-"}</TableCell>
                    <TableCell>{s.address || "-"}</TableCell>
                    {userRole === "bodeguero" && (
                      <TableCell>
                        {products.filter((p) => p.supplier_id === s.id).length >
                        0
                          ? products
                              .filter((p) => p.supplier_id === s.id)
                              .map((p) => p.name)
                              .join(", ")
                          : "-"}
                      </TableCell>
                    )}
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(s)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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

export default Suppliers;
