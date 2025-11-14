import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Products from "./pages/Products";
import NotFound from "./pages/NotFound";
import Sales from "./pages/Sales";
import Accounting from "./pages/Accounting";
import Alerts from "./pages/Alerts";
import Logs from "./pages/Logs";
import Suppliers from "./pages/Suppliers";
import Inventory from "./pages/Inventory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["gerente"]}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute allowedRoles={["gerente", "bodeguero"]}>
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute allowedRoles={["gerente", "cajero"]}>
                  <Sales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting"
              element={
                <ProtectedRoute allowedRoles={["gerente", "contador"]}>
                  <Accounting />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute allowedRoles={["gerente", "bodeguero"]}>
                  <Alerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logs"
              element={
                <ProtectedRoute allowedRoles={["gerente"]}>
                  <Logs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute allowedRoles={["gerente", "bodeguero"]}>
                  <Suppliers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute allowedRoles={["gerente", "bodeguero"]}>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
