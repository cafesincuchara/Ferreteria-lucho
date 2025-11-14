import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, X } from "lucide-react";

const Alerts = () => {
  const { userRole } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false });
    setAlerts(data || []);
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
        <h1 className="text-3xl font-bold">Alertas</h1>
        <Card>
          <CardHeader>
            <CardTitle>Alertas del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-muted-foreground">No hay alertas.</div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Alert
                    key={alert.id}
                    variant={
                      alert.alert_type === "stock_bajo"
                        ? "destructive"
                        : "default"
                    }
                    className="relative"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <button
                      className="absolute right-2 top-2 p-1 rounded hover:bg-muted"
                      aria-label="Eliminar alerta"
                      onClick={async () => {
                        if (confirm("¿Eliminar esta alerta?")) {
                          await supabase
                            .from("alerts")
                            .delete()
                            .eq("id", alert.id);
                          setAlerts(alerts.filter((a) => a.id !== alert.id));
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <AlertTitle>{alert.title}</AlertTitle>
                    <AlertDescription>{alert.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Alerts;
