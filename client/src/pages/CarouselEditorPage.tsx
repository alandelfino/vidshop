import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Save, Plus, Search, X, Eye, EyeOff, GripVertical, Video, Code2, Copy, Check, Monitor, Tablet, Smartphone, ZoomIn, ZoomOut, RotateCcw, CircleDot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ShoppableVideo {
  id: number;
  title: string;
  description: string | null;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  productsList?: any[];
}

interface CarouselVideoEntry {
  videoId: number;
  video?: ShoppableVideo;
}

export default function CarouselEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitle, setSubtitle] = useState("");
  const [subtitleColor, setSubtitleColor] = useState("#666666");
  const [layout, setLayout] = useState("3d-card");
  const [showProducts, setShowProducts] = useState(true);
  
  // Carousel settings
  const [previewTime, setPreviewTime] = useState(4); // Default to 4

  // Card Styles
  const [cardBorderWidth, setCardBorderWidth] = useState(0);
  const [cardBorderColor, setCardBorderColor] = useState("#000000");
  const [cardBorderRadius, setCardBorderRadius] = useState(12);

  // Layout customization
  const [maxWidth, setMaxWidth] = useState("100%");
  const [marginTop, setMarginTop] = useState("0px");
  const [marginRight, setMarginRight] = useState("0px");
  const [marginBottom, setMarginBottom] = useState("0px");
  const [marginLeft, setMarginLeft] = useState("0px");
  const [paddingTop, setPaddingTop] = useState("0px");
  const [paddingRight, setPaddingRight] = useState("0px");
  const [paddingBottom, setPaddingBottom] = useState("0px");
  const [paddingLeft, setPaddingLeft] = useState("0px");

  const [videoList, setVideoList] = useState<CarouselVideoEntry[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ShoppableVideo[]>([]);
  const [searching, setSearching] = useState(false);

  // Preview Modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // Drag re-order
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await apiFetch(`/api/carousels/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) { navigate("/dashboard/carousels"); return; }
        const data = await res.json();
        setName(data.carousel.name || "");
        setTitle(data.carousel.title || "");
        setTitleColor(data.carousel.titleColor || "#000000");
        setSubtitle(data.carousel.subtitle || "");
        setSubtitleColor(data.carousel.subtitleColor || "#666666");
        setLayout(data.carousel.layout || "3d-card");
        setShowProducts(data.carousel.showProducts ?? true);
        setPreviewTime(data.carousel.previewTime ?? 4);
        setCardBorderWidth(data.carousel.cardBorderWidth ?? 0);
        setCardBorderColor(data.carousel.cardBorderColor || "#000000");
        setCardBorderRadius(data.carousel.cardBorderRadius ?? 12);
        setMaxWidth(data.carousel.maxWidth || "100%");
        setMarginTop(data.carousel.marginTop || "0px");
        setMarginRight(data.carousel.marginRight || "0px");
        setMarginBottom(data.carousel.marginBottom || "0px");
        setMarginLeft(data.carousel.marginLeft || "0px");
        setPaddingTop(data.carousel.paddingTop || "0px");
        setPaddingRight(data.carousel.paddingRight || "0px");
        setPaddingBottom(data.carousel.paddingBottom || "0px");
        setPaddingLeft(data.carousel.paddingLeft || "0px");
        setVideoList((data.videos || []).map((v: any) => ({
          videoId: v.videoId,
          video: v.video
        })));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew, navigate]);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch("/api/videos", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const all: ShoppableVideo[] = (await res.json()).videos || [];
        const q = searchQuery.trim().toLowerCase();
        setSearchResults(q ? all.filter(v => v.title.toLowerCase().includes(q)) : all);
      }
    } finally {
      setSearching(false);
    }
  };

  const addVideo = (v: ShoppableVideo) => {
    if (videoList.some(e => e.videoId === v.id)) return;
    setVideoList(prev => [...prev, { videoId: v.id, video: v }]);
    setSearchResults([]);
    setSearchQuery("");
  };

  const removeVideo = (idx: number) => setVideoList(prev => prev.filter((_, i) => i !== idx));

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragEnter = (idx: number) => setDragOver(idx);
  const handleDragEnd = () => {
    if (dragIdx !== null && dragOver !== null && dragIdx !== dragOver) {
      const next = [...videoList];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(dragOver, 0, moved);
      setVideoList(next);
    }
    setDragIdx(null);
    setDragOver(null);
  };

  const handleSave = async () => {
    if (!name.trim()) { alert("O nome do carrossel é obrigatório."); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name, title, subtitle, titleColor, subtitleColor, layout, showProducts,
        previewTime, cardBorderWidth, cardBorderColor, cardBorderRadius,
        maxWidth, marginTop, marginRight, marginBottom, marginLeft,
        paddingTop, paddingRight, paddingBottom, paddingLeft,
        videoIds: videoList.map(e => e.videoId)
      };

      if (isNew) {
        const createRes = await apiFetch("/api/carousels", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            name, title, subtitle, titleColor, subtitleColor, layout, showProducts, previewTime: previewTime === 0 ? 4 : previewTime,
            cardBorderWidth, cardBorderColor, cardBorderRadius,
            maxWidth, marginTop, marginRight, marginBottom, marginLeft,
            paddingTop, paddingRight, paddingBottom, paddingLeft
          })
        });
        if (!createRes.ok) throw new Error("Erro ao criar carrossel");
        const created = await createRes.json();
        await apiFetch(`/api/carousels/${created.carousel.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        navigate(`/dashboard/carousels/edit/${created.carousel.id}`, { replace: true });
      } else {
        const res = await apiFetch(`/api/carousels/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Erro ao salvar");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center p-24">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-10">
      {/* Header */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-3 shadow-sm relative z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/carousels")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-base font-bold line-clamp-1">{name || (isNew ? "Novo Carrossel" : "Editar Carrossel")}</h1>
            <p className="text-xs text-muted-foreground">
              {videoList.length} vídeo{videoList.length !== 1 ? "s" : ""} · {showProducts ? "Com Produtos" : "Sem Produtos"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setPreviewOpen(true)} className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 items-stretch">
        
        {/* Section 1: Basic Info */}
        <div className="w-full">
          <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <CircleDot className="w-3.5 h-3.5" /> Informações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">
                      Nome Interno <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Lançamentos Junho"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5">Este nome é apenas para sua organização interna.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 pt-1">
                    <div className="flex-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">Título Público</label>
                      <input
                        type="text"
                        placeholder="Ex: Vídeos em Destaque"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">Cor (<span className="font-mono">{titleColor}</span>)</label>
                      <input
                        type="color"
                        className="h-10 w-24 rounded-md border border-input bg-background p-1 cursor-pointer"
                        value={titleColor}
                        onChange={e => setTitleColor(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 pt-0 sm:pt-6">
                    <div className="flex-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">Subtítulo</label>
                      <textarea
                        placeholder="Subtítulo curto do carrossel..."
                        className="flex min-h-[105px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        value={subtitle}
                        onChange={e => setSubtitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">Cor (<span className="font-mono">{subtitleColor}</span>)</label>
                      <input
                        type="color"
                        className="h-10 w-24 rounded-md border border-input bg-background p-1 cursor-pointer"
                        value={subtitleColor}
                        onChange={e => setSubtitleColor(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Card Styles */}
        <div className="w-full">
          <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" /> Estilos dos Cards
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold uppercase text-muted-foreground block">Arredondamento das Bordas</label>
                      <span className="text-[10px] font-mono font-bold text-primary">{cardBorderRadius}px</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="1"
                      value={cardBorderRadius} onChange={e => setCardBorderRadius(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-1 px-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold">Quadrado</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold">Círculo</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold uppercase text-muted-foreground block">Espessura da Borda</label>
                      <span className="text-[10px] font-mono font-bold text-primary">{cardBorderWidth}px</span>
                    </div>
                    <input
                      type="range" min="0" max="20" step="1"
                      value={cardBorderWidth} onChange={e => setCardBorderWidth(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 block">Cor da Borda</label>
                    <div className="flex gap-2">
                      <input type="color" value={cardBorderColor} onChange={e => setCardBorderColor(e.target.value)} className="w-10 h-10 rounded border p-0.5 cursor-pointer bg-background" />
                      <input type="text" value={cardBorderColor} onChange={e => setCardBorderColor(e.target.value)} className="flex-1 h-10 rounded border px-3 text-sm uppercase font-mono bg-background" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowProducts(!showProducts)}>
                    <div className="space-y-0.5 pointer-events-none">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Exibir Produtos</label>
                      <p className="text-[10px] text-muted-foreground">{showProducts ? "Exibe os cards sobre o vídeo" : "Oculta links de compra"}</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-colors shrink-0 relative pointer-events-none ${showProducts ? 'bg-primary' : 'bg-muted'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${showProducts ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Container/Hub Style */}
        <div className="w-full">
          <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5" /> Configurações do Hub
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">Modelo do Carrossel</label>
                    <select
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={layout}
                      onChange={e => setLayout(e.target.value)}
                    >
                      <option value="3d-card">Cartão 3D</option>
                      <option value="slider">Slider Simples</option>
                      <option value="stories" disabled>Stories (Em Breve)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">Tempo de Preview</label>
                    <select
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                      value={previewTime}
                      onChange={e => setPreviewTime(Number(e.target.value))}
                    >
                      <option value={4}>4 Segundos</option>
                      <option value={5}>5 Segundos</option>
                      <option value={6}>6 Segundos</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1.5">Define quanto do vídeo é reproduzido antes de avançar para o próximo.</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">Largura Máxima do Container (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: 1200px ou 100%"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={maxWidth}
                      onChange={e => setMaxWidth(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5">Lembre-se que o carrossel respeitará o tamanho da div pai na sua loja.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider block">Margens Externas</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] uppercase text-muted-foreground block mb-0.5">Topo</label>
                          <input type="text" className="h-8 w-full rounded border border-input bg-background px-2 text-[11px]" value={marginTop} onChange={e => setMarginTop(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-muted-foreground block mb-0.5">Baixo</label>
                          <input type="text" className="h-8 w-full rounded border border-input bg-background px-2 text-[11px]" value={marginBottom} onChange={e => setMarginBottom(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-muted-foreground block mb-0.5">Esq.</label>
                          <input type="text" className="h-8 w-full rounded border border-input bg-background px-2 text-[11px]" value={marginLeft} onChange={e => setMarginLeft(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-muted-foreground block mb-0.5">Dir.</label>
                          <input type="text" className="h-8 w-full rounded border border-input bg-background px-2 text-[11px]" value={marginRight} onChange={e => setMarginRight(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider block">Padding Interno</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] uppercase text-muted-foreground block mb-0.5">Topo</label>
                          <input type="text" className="h-8 w-full rounded border border-input bg-background px-2 text-[11px]" value={paddingTop} onChange={e => setPaddingTop(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-muted-foreground block mb-0.5">Baixo</label>
                          <input type="text" className="h-8 w-full rounded border border-input bg-background px-2 text-[11px]" value={paddingBottom} onChange={e => setPaddingBottom(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-muted-foreground block mb-0.5">Esq.</label>
                          <input type="text" className="h-8 w-full rounded border border-input bg-background px-2 text-[11px]" value={paddingLeft} onChange={e => setPaddingLeft(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase text-muted-foreground block mb-0.5">Dir.</label>
                          <input type="text" className="h-8 w-full rounded border border-input bg-background px-2 text-[11px]" value={paddingRight} onChange={e => setPaddingRight(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 4: Videos */}
        <div className="w-full">
          <Card className="border-border flex flex-col overflow-hidden border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  <Video className="w-3.5 h-3.5" /> Vídeos do Carrossel ({videoList.length})
                </CardTitle>
                {videoList.length > 1 && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <GripVertical className="w-3 h-3" /> Arraste para reordenar
                  </p>
                )}
              </div>
            </CardHeader>

            {/* Search */}
            <div className="p-4 border-b border-border/50 bg-muted/10">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar vídeo pelo título..."
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button size="sm" variant="secondary" onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-2 border border-border rounded-lg overflow-hidden bg-background shadow-lg max-h-[220px] overflow-y-auto">
                  {searchResults.map(v => (
                    <button
                      key={v.id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 border-b border-border/40 last:border-0 text-left transition-colors"
                      onClick={() => addVideo(v)}
                    >
                      <div className="w-14 h-9 bg-black rounded overflow-hidden shrink-0 border border-border">
                        <video src={v.mediaUrl} poster={v.thumbnailUrl || undefined} className="w-full h-full object-cover opacity-80" preload="metadata" muted />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{v.title}</p>
                        {v.description && <p className="text-[10px] text-muted-foreground truncate">{v.description}</p>}
                      </div>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Video List */}
            <div className="flex-1 overflow-y-auto max-h-[420px]">
              {videoList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <Video className="w-8 h-8 opacity-20 mb-3" />
                  <p className="text-sm border-0">Nenhum vídeo adicionado ainda.</p>
                  <p className="text-xs mt-1">Use a busca acima para encontrar seus vídeos cadastrados.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {videoList.map((entry, idx) => (
                    <div
                      key={`${entry.videoId}-${idx}`}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnter={() => handleDragEnter(idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      className={`flex items-center gap-3 px-4 py-3 group cursor-grab active:cursor-grabbing transition-all
                        ${dragOver === idx && dragIdx !== idx ? 'bg-primary/10 border-t-2 border-primary' : 'hover:bg-muted/30'}`}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground/50 w-5 shrink-0">{idx + 1}</span>
                      <div className="w-16 h-10 bg-black rounded border border-border overflow-hidden shrink-0">
                        {entry.video?.mediaUrl && (
                          <video
                            src={entry.video.mediaUrl}
                            poster={entry.video.thumbnailUrl || undefined}
                            className="w-full h-full object-cover opacity-80"
                            preload="metadata"
                            muted
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{entry.video?.title ?? `Vídeo #${entry.videoId}`}</p>
                        {entry.video?.description && (
                          <p className="text-xs text-muted-foreground truncate">{entry.video.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeVideo(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Preview Modal Overlay */}
      {previewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
          <div className="w-full h-full flex flex-col relative z-50">
            <LivePreviewSection 
              id={id} name={name} title={title} subtitle={subtitle} titleColor={titleColor} subtitleColor={subtitleColor} 
              layout={layout} showProducts={showProducts} previewTime={previewTime} videoList={videoList}
              cardBorderWidth={cardBorderWidth} cardBorderColor={cardBorderColor} cardBorderRadius={cardBorderRadius}
              maxWidth={maxWidth} marginTop={marginTop} marginRight={marginRight} marginBottom={marginBottom} marginLeft={marginLeft}
              paddingTop={paddingTop} paddingRight={paddingRight} paddingBottom={paddingBottom} paddingLeft={paddingLeft}
              onClose={() => setPreviewOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Embed Section — only for existing carousels */}
      {!isNew && (
        <EmbedSection id={id!} />
      )}
    </div>
  );
}

function LivePreviewSection({ 
    id, name, title, subtitle, titleColor, subtitleColor, layout, showProducts, previewTime, videoList, 
    cardBorderWidth, cardBorderColor, cardBorderRadius,
    maxWidth, marginTop, marginRight, marginBottom, marginLeft,
    paddingTop, paddingRight, paddingBottom, paddingLeft,
    onClose 
}: { 
    id: string | undefined, name: string, title: string, subtitle: string, titleColor: string, subtitleColor: string, layout: string, showProducts: boolean, previewTime: number, videoList: CarouselVideoEntry[], 
    cardBorderWidth: number, cardBorderColor: string, cardBorderRadius: number,
    maxWidth: string, marginTop: string, marginRight: string, marginBottom: string, marginLeft: string,
    paddingTop: string, paddingRight: string, paddingBottom: string, paddingLeft: string,
    onClose?: () => void 
}) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [zoom, setZoom] = useState(1);

  const previewData = {
    carousel: { 
        id: id || "preview", name, title, subtitle, titleColor, subtitleColor, layout, showProducts, previewTime,
        cardBorderWidth, cardBorderColor, cardBorderRadius,
        maxWidth, marginTop, marginRight, marginBottom, marginLeft,
        paddingTop, paddingRight, paddingBottom, paddingLeft
    },
    // A API agora retorna a lista de vídeos com a propriedade productsList
    videos: videoList.map(v => ({ ...v.video, productsList: v.video?.productsList || [] }))
  };

  const mockScript = `
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
      if (url.includes('/api/public/carousels/')) {
         return { json: async () => (${JSON.stringify(previewData)}) };
      }
      return originalFetch(url, options);
    };
  `;

  const touchMockScript = device !== "desktop" ? `
    let isDragging = false;
    let startPos = { x: 0, y: 0 };
    let scrollPos = { top: 0, left: 0 };
    
    document.addEventListener("DOMContentLoaded", () => {
      document.body.style.cursor = 'grab';
      
      // Hide scrollbars purely visually to match a phone screen
      const style = document.createElement('style');
      style.innerHTML = '::-webkit-scrollbar { display: none; } * { -ms-overflow-style: none; scrollbar-width: none; }';
      document.head.appendChild(style);
    });

    document.addEventListener('mousedown', (e) => {
        if(e.button !== 0) return;
        isDragging = true;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        
        startPos = { x: e.clientX, y: e.clientY };
        scrollPos = { 
            left: window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft, 
            top: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop 
        };
    }, { passive: true });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startPos.x;
        const dy = e.clientY - startPos.y;
        
        window.scrollTo(scrollPos.left - dx, scrollPos.top - dy);
    }, { passive: true });

    const stopDrag = () => {
        isDragging = false;
        document.body.style.cursor = 'grab';
        document.body.style.removeProperty('user-select');
    };

    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('mouseleave', stopDrag);
  ` : "";

  const srcDoc = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <base href="${window.location.origin}">
      <title>Preview Loja</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; margin: 0; background: #ffffff; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .hero-gradient { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); }
      </style>
    </head>
    <body class="antialiased text-slate-900">
      <!-- Top Bar -->
      <div class="bg-black text-white text-[10px] py-1.5 text-center font-bold tracking-widest uppercase">
        Frete Grátis em pedidos acima de R$ 200
      </div>

      <!-- Header -->
      <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center transition-all">
        <div class="flex items-center gap-8">
          <img src="/src/public/vidshop-logo.png" alt="Vidshop" class="h-7 w-auto object-contain" />
          <nav class="hidden md:flex gap-6 text-[13px] font-semibold text-slate-600">
            <a href="#" class="hover:text-primary transition-colors">Coleção 2024</a>
            <a href="#" class="hover:text-primary transition-colors">Mais Vendidos</a>
            <a href="#" class="hover:text-primary transition-colors">Sale</a>
          </nav>
        </div>
        <div class="flex items-center gap-4 text-slate-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </div>
      </header>

      <main>
        <!-- Hero Section -->
        <section class="hero-gradient px-6 py-16 md:py-24 text-center">
          <div class="max-w-3xl mx-auto space-y-6">
            <span class="inline-block px-3 py-1 bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-widest rounded-full">Nova Temporada</span>
            <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">Descubra seu próximo <br/>estilo favorito.</h1>
            <p class="text-slate-500 text-sm md:text-base max-w-xl mx-auto">Explore nossa curadoria exclusiva de peças minimalistas e atemporais, desenhadas para elevar sua experiência diária.</p>
            <div class="flex items-center justify-center gap-4 pt-4">
              <button class="bg-black text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-black/10 hover:scale-105 transition-transform">Comprar Agora</button>
              <button class="bg-white text-slate-900 border border-slate-200 px-8 py-3 rounded-full text-sm font-bold hover:bg-slate-50 transition-colors">Saiba Mais</button>
            </div>
          </div>
        </section>

        <!-- Dynamic Element (Carousel) -->
        <section class="py-12 px-6">
          <div class="max-w-7xl mx-auto">
            <div class="flex items-end justify-between mb-8">
              <div>
                <span class="text-primary font-bold text-xs uppercase tracking-widest">Shop the Look</span>
                <h2 class="text-2xl font-extrabold tracking-tight">Vistos Recentemente</h2>
              </div>
              <a href="#" class="text-sm font-bold border-b-2 border-primary pb-0.5">Ver tudo</a>
            </div>
            
            <!-- Carousel Inject Point -->
            <div data-vidshop-carousel="${id || 'preview'}" class="w-full"></div>
          </div>
        </section>

        <!-- Static Product Grid -->
        <section class="py-20 bg-slate-50 px-6">
          <div class="max-w-7xl mx-auto">
            <h2 class="text-2xl font-extrabold tracking-tight mb-12 text-center">Nossos Essenciais</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              ${[1, 2, 3, 4].map(i => `
                <div class="group cursor-pointer">
                  <div class="aspect-[3/4] bg-white rounded-2xl overflow-hidden relative mb-4">
                    <div class="absolute inset-0 bg-slate-200 animate-pulse group-hover:scale-105 transition-transform duration-500"></div>
                  </div>
                  <div class="space-y-1">
                    <h4 class="text-sm font-bold">Produto Essencial 0${i}</h4>
                    <p class="text-xs text-slate-500 font-medium">Categoria Premium</p>
                    <p class="text-sm font-extrabold text-primary">R$ 189,90</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
      </main>

      <!-- Footer Mock -->
      <footer class="bg-white border-t border-slate-100 py-12 px-6 text-center">
        <div class="max-w-7xl mx-auto">
          <p class="text-slate-400 text-xs font-medium uppercase tracking-[0.2em]">© 2024 VidShop Store • Experiência de Vídeo Shoppable</p>
        </div>
      </footer>
      
      <script>${mockScript}</script>
      <script>${touchMockScript}</script>
      <script src="${window.location.origin}/embed/vidshop.js"></script>
    </body>
    </html>
  `;

  let widthClass = "w-full";
  let baseHeight: number | string = "100%";
  let baseWidth: number | string = "100%";

  if (device === "tablet") {
      widthClass = "w-[768px]";
      baseHeight = 1024;
      baseWidth = 768;
  } else if (device === "mobile") {
      widthClass = "w-[375px]";
      baseHeight = 812;
      baseWidth = 375;
  }

  return (
    <Card className="border-0 rounded-none overflow-hidden h-full flex flex-col shadow-none">
      <CardHeader className="py-3 px-4 sm:py-4 sm:px-6 border-b border-border bg-muted/20 flex flex-row items-center justify-between shrink-0 flex-wrap gap-4">
        
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest hidden sm:block">Preview em Tempo Real</CardTitle>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1 shadow-sm">
           <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} title="Diminuir Zoom">
             <ZoomOut className="w-4 h-4" />
           </Button>
           <div className="w-12 text-center text-[11px] font-mono font-bold tracking-wider text-primary">
             {Math.round(zoom * 100)}%
           </div>
           <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setZoom(z => Math.min(2, z + 0.1))} title="Aumentar Zoom">
             <ZoomIn className="w-4 h-4" />
           </Button>
           <div className="w-[1px] h-4 bg-border mx-1" />
           <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setZoom(1)} title="Redefinir Zoom">
             <RotateCcw className="w-3.5 h-3.5" />
           </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-background border border-border rounded-lg p-1">
            <Button variant={device === "desktop" ? "secondary" : "ghost"} size="icon" className="h-7 w-7 rounded-sm" onClick={() => { setDevice("desktop"); setZoom(1); }} title="Desktop">
              <Monitor className="w-4 h-4" />
            </Button>
            <Button variant={device === "tablet" ? "secondary" : "ghost"} size="icon" className="h-7 w-7 rounded-sm" onClick={() => { setDevice("tablet"); setZoom(0.8); }} title="Tablet">
              <Tablet className="w-4 h-4" />
            </Button>
            <Button variant={device === "mobile" ? "secondary" : "ghost"} size="icon" className="h-7 w-7 rounded-sm" onClick={() => { setDevice("mobile"); setZoom(0.8); }} title="Mobile">
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full ml-2 text-muted-foreground hover:bg-muted" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      {/* Scrollable Container */}
      <div className={cn("bg-muted flex justify-center overflow-y-auto flex-1 h-[600px] sm:h-auto overflow-x-hidden", device === "desktop" ? "p-0 items-stretch" : "p-4 sm:p-8 items-start")}>
        {/* Dynamic Bounding Box matching Scaled size */}
        <div 
           className={cn("transition-all duration-300 ease-out flex", device === "desktop" ? "flex-1 w-full" : "relative justify-center")} 
           style={{ 
             width: typeof baseWidth === 'number' ? `calc(${baseWidth}px * ${zoom})` : '100%',
             height: typeof baseHeight === 'number' ? `calc(${baseHeight}px * ${zoom})` : '100%',
             minHeight: typeof baseHeight === 'string' ? baseHeight : undefined
           }}
        >
          {/* Unscaled Element with Visual Scale Applied */}
          <div 
             className={cn("bg-background overflow-hidden flex flex-col transition-transform duration-300 ease-out origin-top", widthClass, device === 'desktop' ? 'rounded-none flex-1 w-full' : 'absolute rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_20px_40px_-10px_rgba(0,0,0,0.1)]')}
             style={{ 
               transform: device === "desktop" ? "none" : `scale(${zoom})`, 
               height: typeof baseHeight === 'number' ? `${baseHeight}px` : baseHeight
             }}
          >
              <iframe 
                key={JSON.stringify(previewData)}
                className="w-full h-full border-none bg-transparent flex-1"
                srcDoc={srcDoc}
                title="VidShop Embed Preview"
                sandbox="allow-scripts allow-same-origin"
              />
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmbedSection({ id }: { id: string }) {
  const [copied, setCopied] = useState<"script" | "div" | null>(null);
  const origin = window.location.origin;
  const scriptTag = `<script src="${origin}/embed/vidshop.js" async></script>`;
  const divTag = `<div data-vidshop-carousel="${id}"></div>`;

  const copy = (text: string, key: "script" | "div") => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4 border-b border-border/50 flex flex-row items-center gap-2">
        <Code2 className="w-4 h-4 text-muted-foreground" />
        <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Integração — Código de Embed</CardTitle>
      </CardHeader>
      <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
            <p className="text-sm font-semibold">Adicione UMA VEZ no template da loja</p>
          </div>
          <div className="relative">
            <pre className="text-[11px] bg-muted/40 border border-border rounded-lg p-3 overflow-x-auto font-mono text-foreground whitespace-pre-wrap break-all">{scriptTag}</pre>
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={() => copy(scriptTag, "script")}>
              {copied === "script" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
            <p className="text-sm font-semibold">Cole onde quiser exibir o carrossel</p>
          </div>
          <div className="relative">
            <pre className="text-[11px] bg-muted/40 border border-border rounded-lg p-3 overflow-x-auto font-mono text-foreground">{divTag}</pre>
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={() => copy(divTag, "div")}>
              {copied === "div" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
        <div className="sm:col-span-2 pt-2 border-t border-border mt-2">
           <p className="text-xs text-muted-foreground flex items-center gap-2">
             ⚠️ <strong>O script geral deve ser adicionado apenas UMA VEZ na loja.</strong>
             Se você já tem um Carrossel ou Story ativo, não há necessidade de adicionar o script novamente, basta colocar a div acima.
           </p>
        </div>
      </CardContent>
    </Card>
  );
}
