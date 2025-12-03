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
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

const translations = {
  en: {
    title: "Action History",
    registeredActions: "Registered Actions",
    date: "Date",
    user: "User",
    action: "Action",
    entity: "Entity",
    details: "Details",
  },
  es: {
    title: "Historial de Acciones",
    registeredActions: "Acciones Registradas",
    date: "Fecha",
    user: "Usuario",
    action: "Acción",
    entity: "Entidad",
    details: "Detalles",
  },
};

const Logs = () => {
  const { userRole } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [language, setLanguage] = useState("es");

  const t = translations[language];
  const locale = language === "es" ? es : enUS;

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const { data } = await supabase
      .from("action_logs")
      .select("*")
      .order("created_at", { ascending: false });
    setLogs(data || []);
  };

  if (userRole !== "gerente") {
    return (
      <DashboardLayout>
        <div className="p-6">No tienes acceso a esta sección.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t.title}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t.registeredActions}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.date}</TableHead>
                  <TableHead>{t.user}</TableHead>
                  <TableHead>{t.action}</TableHead>
                  <TableHead>{t.entity}</TableHead>
                  <TableHead>{t.details}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                        locale,
                      })}
                    </TableCell>
                    <TableCell>{log.user_id}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.entity_type}</TableCell>
                    <TableCell>
                      {typeof log.details === "object" ? (
                        <pre className="whitespace-pre-wrap text-sm">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : (
                        log.details
                      )}
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

export default Logs;
