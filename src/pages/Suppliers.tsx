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

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface Product {
  id: string;
  name: string;
  category: string | null;
  supplier_id: string | null;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const Suppliers = () => {
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<{
    id: string;
    msg: string;
  } | null>(null);
  const { userRole } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [filterNombre, setFilterNombre] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error("Error al cargar productos:", err);
      setAlertMsg("Error al cargar productos: " + err.message);
    }
  };

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from("suppliers").select("*");
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err: any) {
      console.error("Error al cargar proveedores:", err);
      setAlertMsg("Error al cargar proveedores: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setAlertMsg("El nombre del proveedor es obligatorio");
      return;
    }

    try {
      setIsLoading(true);
      
      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(formData)
          .eq("id", editingSupplier.id);
        
        if (error) throw error;
        setAlertMsg("Proveedor actualizado correctamente");
      } else {
        const { error } = await supabase.from("suppliers").insert(formData);
        
        if (error) throw error;
        setAlertMsg("Proveedor creado correctamente");
      }
      
      setOpen(false);
      resetForm();
      await loadSuppliers();
    } catch (err: any) {
      console.error("Error al guardar proveedor:", err);
      if (err?.message?.includes("Failed to fetch")) {
        setAlertMsg("Sin conexión a internet. Intenta nuevamente.");
      } else {
        setAlertMsg("Error al guardar: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", address: "" });
    setEditingSupplier(null);
  };

  const handleEdit = (supplier: Supplier) => {
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
  };

  const confirmDelete = async () => {
    if (!confirmMsg) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", confirmMsg.id);
      
      if (error) throw error;
      
      setAlertMsg("Proveedor eliminado correctamente");
      setConfirmMsg(null);
      await loadSuppliers();
    } catch (err: any) {
      console.error("Error al eliminar proveedor:", err);
      if (err?.message?.includes("Failed to fetch")) {
        setAlertMsg("Sin conexión a internet. Intenta nuevamente.");
      } else {
        setAlertMsg("Error al eliminar: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (userRole !== "gerente" && userRole !== "bodeguero") {
    return (
      <DashboardLayout>
        <div className="p-6">No tienes acceso a esta sección.</div>
      </DashboardLayout>
    );
  }

  const filteredSuppliers = suppliers.filter((s) => {
    let match = true;
    
    if (filterNombre && !s.name?.toLowerCase().includes(filterNombre.toLowerCase())) {
      match = false;
    }
    
    if (filterCategoria) {
      const supplierProducts = products.filter((p) => p.supplier_id === s.id);
      if (!supplierProducts.some((p) => p.category === filterCategoria)) {
        match = false;
      }
    }
    
    return match;
  });

  const uniqueCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {alertMsg && (
          <div className="mb-4 p-3 rounded bg-yellow-100 text-yellow-900 border border-yellow-300">
            {alertMsg}
            <button 
              className="float-right font-bold" 
              onClick={() => setAlertMsg(null)}
              aria-label="Cerrar alerta"
            >
              &times;
            </button>
          </div>
        )}
        
        {confirmMsg && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-900 border border-red-300 flex justify-between items-center">
            <span>{confirmMsg.msg}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDelete}
                disabled={isLoading}
              >
                Eliminar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmMsg(null)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
        
        <h1 className="text-3xl font-bold">Proveedores</h1>
        
        <div className="mb-4 flex gap-2 flex-wrap items-end">
          <Input
            value={filterNombre}
            onChange={(e) => setFilterNombre(e.target.value)}
            placeholder="Filtrar por nombre"
            className="max-w-xs"
          />
          <select
            className="border rounded px-3 py-2"
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat as string}>
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
                    onClick={resetForm}
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
                      placeholder="Nombre *"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      disabled={isLoading}
                    />
                    <Input
                      placeholder="Email *"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      disabled={isLoading}
                    />
                    <Input
                      placeholder="Teléfono *"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      required
                      disabled={isLoading}
                    />
                    <Input
                      placeholder="Dirección *"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      required
                      disabled={isLoading}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Guardando..." : editingSupplier ? "Actualizar" : "Crear"} Proveedor
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {isLoading ? (
              <div className="text-center py-4">Cargando...</div>
            ) : (
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
                  {filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={userRole === "bodeguero" ? 6 : 5} className="text-center">
                        No se encontraron proveedores
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSuppliers.map((s) => {
                      const supplierProducts = products.filter((p) => p.supplier_id === s.id);
                      
                      return (
                        <TableRow key={s.id}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{s.email || "-"}</TableCell>
                          <TableCell>{s.phone || "-"}</TableCell>
                          <TableCell>{s.address || "-"}</TableCell>
                          {userRole === "bodeguero" && (
                            <TableCell>
                              {supplierProducts.length > 0
                                ? supplierProducts.map((p) => p.name).join(", ")
                                : "-"}
                            </TableCell>
                          )}
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(s)}
                              disabled={isLoading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(s.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Suppliers;