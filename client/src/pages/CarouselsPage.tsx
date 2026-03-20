import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Loader2, LayoutGrid, Package, Eye, EyeOff, Code2, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Carousel {
  id: number;
  name: string;
  title: string | null;
  subtitle: string | null;
  showProducts: boolean;
  createdAt: string;
  updatedAt: string;
}

function EmbedModal({ carousel, onClose }: { carousel: Carousel; onClose: () => void }) {
  const [copied, setCopied] = useState<"script" | "div" | null>(null);

  const origin = window.location.origin;
  const scriptTag = `<script src="${origin}/embed/carousel.js" async></script>`;
  const divTag = `<div data-vidshop-carousel="${carousel.id}"></div>`;

  const copy = (text: string, key: "script" | "div") => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl p-6 flex flex-col gap-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Código de Embed</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Carrossel: <strong>{carousel.name}</strong></p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Step 1 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
            <p className="text-sm font-semibold">Adicione UMA VEZ no template global da loja</p>
          </div>
          <div className="relative">
            <pre className="text-xs bg-muted/50 border border-border rounded-lg p-3 overflow-x-auto font-mono text-foreground">
              {scriptTag}
            </pre>
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={() => copy(scriptTag, "script")}>
              {copied === "script" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
            <p className="text-sm font-semibold">Coloque onde quiser exibir o carrossel</p>
          </div>
          <div className="relative">
            <pre className="text-xs bg-muted/50 border border-border rounded-lg p-3 overflow-x-auto font-mono text-foreground">
              {divTag}
            </pre>
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={() => copy(divTag, "div")}>
              {copied === "div" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border/50">
          💡 Múltiplos carrosseis na mesma loja? O <code className="font-mono">&lt;script&gt;</code> é adicionado apenas uma vez.
          Copie e cole quantos <code className="font-mono">&lt;div&gt;</code> precisar, com IDs diferentes.
        </p>
      </div>
    </div>
  );
}

export default function CarouselsPage() {
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loading, setLoading] = useState(true);
  const [embedTarget, setEmbedTarget] = useState<Carousel | null>(null);
  const navigate = useNavigate();

  const fetchCarousels = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/carousels", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setCarousels((await res.json()).carousels || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCarousels(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja excluir este carrossel?")) return;
    const token = localStorage.getItem("token");
    await fetch(`/api/carousels/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    setCarousels(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-10">
      {embedTarget && <EmbedModal carousel={embedTarget} onClose={() => setEmbedTarget(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Carrosseis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie coleções de vídeos para exibição em carrossel.</p>
        </div>
        <Button onClick={() => navigate("/dashboard/carousels/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Carrossel
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
        </div>
      ) : carousels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-xl bg-muted/10 text-center">
          <LayoutGrid className="w-12 h-12 text-muted-foreground opacity-25 mb-4" />
          <h3 className="text-lg font-semibold">Nenhum carrossel</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs">
            Crie seu primeiro carrossel para organizar vídeos e exibi-los em qualquer loja.
          </p>
          <Button onClick={() => navigate("/dashboard/carousels/new")}>
            <Plus className="w-4 h-4 mr-2" /> Criar Carrossel
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {carousels.map(c => (
            <Card key={c.id} className="group border-border hover:shadow-md transition-all overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary/70 to-primary/40" />
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-base truncate">{c.name}</p>
                    {c.title && <p className="text-sm text-muted-foreground truncate mt-0.5">{c.title}</p>}
                  </div>
                  <Badge variant={c.showProducts ? "default" : "secondary"} className="shrink-0 text-[10px] font-semibold py-0.5 px-2 flex items-center gap-1">
                    {c.showProducts ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {c.showProducts ? "Com Produtos" : "Sem Produtos"}
                  </Badge>
                </div>

                {c.subtitle && (
                  <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 rounded-md px-3 py-2 border border-border/50">
                    {c.subtitle}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-auto">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {new Date(c.updatedAt).toLocaleDateString("pt-BR")}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-500"
                      onClick={() => setEmbedTarget(c)}
                      title="Código de Embed"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                      onClick={() => navigate(`/dashboard/carousels/edit/${c.id}`)}
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(c.id)}
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
