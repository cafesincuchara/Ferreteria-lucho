import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Truck,
  Clock,
  Bell,
  Menu,
  LogOut,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { userRole, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", roles: ["gerente", "contador", "cajero", "bodeguero"] },
    { icon: Users, label: "Usuarios", path: "/users", roles: ["gerente"] },
    { icon: Package, label: "Productos", path: "/products", roles: ["gerente", "bodeguero"] },
    { icon: ShoppingCart, label: "Inventario", path: "/inventory", roles: ["gerente", "bodeguero"] },
    { icon: DollarSign, label: "Ventas", path: "/sales", roles: ["gerente", "cajero"] },
    { icon: DollarSign, label: "Contabilidad", path: "/accounting", roles: ["gerente", "contador"] },
    { icon: Truck, label: "Proveedores", path: "/suppliers", roles: ["gerente", "bodeguero"] },
    { icon: Clock, label: "Historial", path: "/logs", roles: ["gerente"] },
    { icon: Bell, label: "Alertas", path: "/alerts", roles: ["gerente", "bodeguero"] },
  ];

  const filteredNavItems = navItems.filter((item) =>
    userRole ? item.roles.includes(userRole) : false
  );

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex flex-col h-full", mobile ? "p-4" : "")}>
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Wrench className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-lg">Don Lucho</h2>
          <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-4 border-t pt-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r">
        <Sidebar />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b bg-background">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <span className="font-bold">Don Lucho</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar mobile />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="md:pt-0 pt-16">
          {children}
        </div>
      </main>
    </div>
  );
};
