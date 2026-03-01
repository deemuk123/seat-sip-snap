import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fetchAuditLogs } from "@/lib/supabase-superadmin";
import { format } from "date-fns";

type AuditLog = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
};

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAuditLogs();
        setLogs(data as AuditLog[]);
      } catch {
        toast({ title: "Error loading audit logs", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Audit Logs</h2>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-8">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <ScrollText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No audit logs recorded yet.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {log.target_type}
                    {log.target_id && <span className="font-mono ml-1 text-muted-foreground">({log.target_id.slice(0, 8)}…)</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {JSON.stringify(log.details)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </motion.div>
  );
};

export default AuditLogs;
