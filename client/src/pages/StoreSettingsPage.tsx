import { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Trash2 } from "lucide-react";

export default function StoreSettingsPage() {
  const { activeStore, fetchStores } = useStore();
  const [domain, setDomain] = useState("");
  const [storeName, setStoreName] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);

  useEffect(() => {
    if (activeStore) {
      setDomain(activeStore.allowedDomain || "");
      setStoreName(activeStore.name || "");
    }
  }, [activeStore]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    setSavingDomain(true);
    try {
      const res = await apiFetch(`/api/stores/${activeStore.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: storeName, 
          allowedDomain: domain
        })
      });
      if (res.ok) {
        await fetchStores();
        toast.success("Configurações salvas com sucesso!");
      } else {
        toast.error("Erro ao salvar configurações.");
      }
    } finally {
      setSavingDomain(false);
    }
  };

  if (!activeStore) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Configurações da Loja</h1>
        <p className="text-muted-foreground mt-2">
          Edite as propriedades e permissões de acesso da loja ativa.
        </p>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-primary">Instalação Global</CardTitle>
          <CardDescription>
            Copie e cole os códigos abaixo no seu site para habilitar os carrosséis e stories.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CSS do Embed (Recomendado no &lt;head&gt;)</Label>
            <div className="relative group">
              <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto border border-border font-mono">
                {`<link rel="stylesheet" href="${window.location.origin}/embed/vidshop.css">`}
              </pre>
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2 h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  navigator.clipboard.writeText(`<link rel="stylesheet" href="${window.location.origin}/embed/vidshop.css">`);
                  toast.success("CSS copiado para a área de transferência!");
                }}
              >
                Copiar
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Script JS (Recomendado antes do fechamento do &lt;/body&gt;)</Label>
            <div className="relative group">
              <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto border border-border font-mono">
                {`<script src="${window.location.origin}/embed/vidshop.js"></script>`}
              </pre>
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2 h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  navigator.clipboard.writeText(`<script src="${window.location.origin}/embed/vidshop.js"></script>`);
                  toast.success("Script copiado para a área de transferência!");
                }}
              >
                Copiar
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              * O script JS injetará o CSS automaticamente se você não o adicionar manualmente, mas adicioná-lo no &lt;head&gt; evita saltos de layout (CLS).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-primary">Informações e Acesso</CardTitle>
          <CardDescription>Altere o nome da loja e o domínio permitido para requisições externas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
            
            <div className="grid gap-2">
              <Label htmlFor="storeName">Nome da Loja</Label>
              <Input 
                id="storeName" 
                placeholder="Nome da Loja" 
                value={storeName} 
                onChange={e => setStoreName(e.target.value)} 
                disabled={savingDomain} 
                className="max-w-md"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="domain">Domínio Permitido (CORS)</Label>
              <Input 
                id="domain" 
                placeholder="ex: meudominio.com.br" 
                value={domain} 
                onChange={e => setDomain(e.target.value)} 
                disabled={savingDomain} 
                className="max-w-md"
              />
              <p className="text-xs text-muted-foreground max-w-xl">
                Apenas as requisições oriundas deste domínio poderão carregar os carrosséis de vídeos via Embed API. Este campo é obrigatório para sua segurança.
              </p>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <Button type="submit" disabled={savingDomain || !domain.trim() || !storeName.trim()} className="w-full sm:w-auto">
                {savingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {savingDomain ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
            
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3 text-destructive">
          <CardTitle className="text-base font-semibold">Zona de Perigo</CardTitle>
          <CardDescription className="text-destructive/80 font-medium">Ações irreversíveis que impactam permanentemente sua loja.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/20 rounded-lg bg-background">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Limpar Base de Produtos</p>
              <p className="text-xs text-muted-foreground max-w-md">
                Isso removerá instantaneamente todos os produtos cadastrados e desvinculará todos os produtos de seus vídeos. Esta ação não pode ser desfeita.
              </p>
            </div>
            <Button 
               variant="destructive" 
               size="sm"
               disabled={savingDomain} 
               onClick={async () => {
                 if (window.confirm("VOCÊ TEM CERTEZA? Esta ação removerá TODOS os produtos da sua base permanentemente e não pode ser desfeita.")) {
                   try {
                     setSavingDomain(true);
                     const res = await apiFetch("/api/products/clear-base", { method: "POST" });
                     if (res.ok) {
                       toast.success("Tarefa de limpeza iniciada em background!");
                     } else {
                       toast.error("Erro ao solicitar limpeza.");
                     }
                   } catch {
                     toast.error("Falha na comunicação com o servidor.");
                   } finally {
                     setSavingDomain(false);
                   }
                 }
               }}
            >
              {savingDomain ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Limpar Base de Produtos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
