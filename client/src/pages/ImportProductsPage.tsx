import { apiFetch } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { Upload, Link as LinkIcon, AlertCircle, Loader2, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ImportJob {
  id: number;
  sourceType: "file" | "url";
  sourceUrl: string;
  status: "pending" | "processing" | "completed" | "failed";
  processedItems: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SyncJob {
  id: number;
  url: string;
  frequencyDays: number;
  syncTime: string;
  nextSyncAt: string;
  lastSyncAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function ImportProductsPage() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [syncs, setSyncs] = useState<SyncJob[]>([]);
  const [urlInput, setUrlInput] = useState("");
  
  // Recurring Configuration
  const [isRecurring, setIsRecurring] = useState(false);
  const [syncInterval, setSyncInterval] = useState(1);
  const [syncTime, setSyncTime] = useState("03:00");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem("token");
      const [resJobs, resSyncs] = await Promise.all([
        apiFetch("/api/catalog/imports", { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch("/api/catalog/syncs", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (resJobs.ok) {
        const data = await resJobs.json();
        setJobs(data.imports || []);
      }
      if (resSyncs.ok) {
         const data = await resSyncs.json();
         setSyncs(data.syncs || []);
      }
    } catch (e) {
      console.error("Failed to fetch jobs");
    }
  };

  // Poll every 3 seconds
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("token");
      
      const endpoint = isRecurring ? "/api/catalog/sync" : "/api/catalog/import";
      const bodyPayload = isRecurring 
          ? { url: urlInput, frequencyDays: syncInterval, syncTime } 
          : { url: urlInput };

      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Auth handled by apiFetch
        },
        body: JSON.stringify(bodyPayload),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao iniciar importação");
      
      setUrlInput("");
      setIsRecurring(false);
      fetchJobs();
      toast.success(isRecurring ? "Sincronização agendada com sucesso!" : "Importação iniciada com sucesso!");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch("/api/catalog/import", {
        method: "POST",
        // headers: handled by apiFetch
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao fazer upload");
      
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchJobs();
      toast.success("Upload concluído! A importação foi iniciada.");
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSync = async (id: number) => {
    if (!window.confirm("Deseja realmente remover esta automação? Seu catálogo não será apagado.")) return;
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`/api/catalog/syncs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchJobs();
      toast.success("Agendamento removido!");
    } catch (e) {
      toast.error("Erro ao excluir agendamento.");
    }
  };

  const getStatusBadge = (status: ImportJob["status"]) => {
    switch (status) {
      case "completed": return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-0">Concluído</Badge>;
      case "failed": return <Badge variant="destructive">Falhou</Badge>;
      case "processing": return <Badge className="bg-blue-500 hover:bg-blue-600 border-0">Processando</Badge>;
      default: return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const getStatusIcon = (status: ImportJob["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "failed": return <XCircle className="w-5 h-5 text-destructive" />;
      case "processing": return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <Loader2 className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full max-w-5xl mx-auto w-full pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Importar Catálogo</h1>
        <p className="text-sm text-muted-foreground">
          Importe seus produtos usando o formato de XML do Facebook.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-primary" />
              Importar por URL
            </CardTitle>
            <CardDescription>
              Cole o link direto para o feed XML público.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUrlSubmit} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://exemplo.com/feed.xml"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
                <Button type="submit" disabled={isSubmitting || !urlInput}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Importar"}
                </Button>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="recurring" 
                  checked={isRecurring} 
                  onChange={e => setIsRecurring(e.target.checked)} 
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="recurring" className="text-sm font-medium cursor-pointer">
                  Sincronizar Automaticamente
                </label>
              </div>

              {isRecurring && (
                <div className="flex gap-3 p-4 bg-muted/30 rounded-lg border border-border animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Frequência</label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={syncInterval} 
                      onChange={e => setSyncInterval(Number(e.target.value))}
                    >
                      {Array.from({ length: 30 }).map((_, i) => (
                        <option key={i+1} value={i+1}>
                          {i === 0 ? "Todo dia" : `A cada ${i+1} dias`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32 space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Horário</label>
                    <input 
                      type="time" 
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={syncTime} 
                      onChange={e => setSyncTime(e.target.value)} 
                      required
                    />
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Upload de Arquivo
            </CardTitle>
            <CardDescription>
              Envie um arquivo XML pesado (até 500MB).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              accept=".xml"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              className="w-full h-10 border-dashed border-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {isSubmitting ? "Enviando..." : "Selecionar Arquivo XML"}
            </Button>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Arquivos de upload são importações manuais, feitas apenas uma vez.
            </p>
          </CardContent>
        </Card>
      </div>

      {syncs.length > 0 && (
         <Card className="border-border flex flex-col overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <CardTitle className="text-base">Cronogramas de Sincronização</CardTitle>
              </div>
              <CardDescription>Links que estão operando em piloto automático.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {syncs.map((sync) => (
                  <div key={sync.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-medium text-foreground truncate" title={sync.url}>
                         {sync.url}
                       </p>
                       <div className="flex items-center gap-2 mt-1">
                         <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                           {sync.frequencyDays === 1 ? 'Diário' : `A cada ${sync.frequencyDays} dias`} às {sync.syncTime}
                         </span>
                         <span className="text-xs text-muted-foreground">•</span>
                         <span className="text-xs text-muted-foreground">
                           Próximo: {new Date(sync.nextSyncAt).toLocaleString("pt-BR")}
                         </span>
                       </div>
                     </div>
                     <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDeleteSync(sync.id)}>
                       <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
                ))}
              </div>
            </CardContent>
         </Card>
      )}

      {/* Queue List */}
      <Card className="border-border flex-1 border flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20 pb-3">
          <CardTitle className="text-base">Histórico e Fila</CardTitle>
          <CardDescription>Acompanhe o disparo das importações em tempo real.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto max-h-[400px]">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <AlertCircle className="w-8 h-8 mb-3 opacity-20" />
              <p className="text-sm">Nenhuma importação encontrada.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                  <div className="shrink-0">{getStatusIcon(job.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate" title={job.sourceType === "url" ? job.sourceUrl : "Arquivo Local"}>
                      {job.sourceType === "url" ? job.sourceUrl : "Arquivo Local"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(job.createdAt).toLocaleString("pt-BR")}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {job.processedItems} itens lidos
                      </span>
                      {job.error && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-destructive truncate max-w-[200px]" title={job.error}>
                            {job.error}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusBadge(job.status)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
