import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft, Loader2, Save, Plus, Search, X, GripVertical, Video, Code2, Copy, Check, CircleDot, Eye,
    Monitor, Tablet, Smartphone, ZoomIn, ZoomOut, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ShoppableVideo {
    id: number;
    title: string;
    description: string | null;
    mediaUrl: string;
    thumbnailUrl?: string | null;
    productsList?: any[];
}

interface StoryVideoEntry {
    videoId: number;
    video?: ShoppableVideo;
}

export default function StoryEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = !id || id === "new";

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    // Form fields
    const [name, setName] = useState("");
    const [title, setTitle] = useState("");
    const [shape, setShape] = useState("round");
    const [showProducts, setShowProducts] = useState(true);
    const [bubbleWidth, setBubbleWidth] = useState("80px");
    const [bubbleHeight, setBubbleHeight] = useState("80px");
    const [borderRadius, setBorderRadius] = useState(8);

    // Integration & Conditions
    const [integrationMode, setIntegrationMode] = useState("code");
    const [selector, setSelector] = useState("");
    const [insertionMethod, setInsertionMethod] = useState("after");
    const [conditions, setConditions] = useState<any[]>([]);

    // Customization
    const [color1, setColor1] = useState("#f09433");
    const [color2, setColor2] = useState("#bc1888");
    const [angle, setAngle] = useState(45);
    const [borderEnabled, setBorderEnabled] = useState(true);

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

    const [videoList, setVideoList] = useState<StoryVideoEntry[]>([]);

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
                const res = await apiFetch(`/api/stories/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) { navigate("/dashboard/stories"); return; }
                const data = await res.json();
                setName(data.name || "");
                setTitle(data.title || "");
                setShape(data.shape || "round");
                setShowProducts(data.showProducts ?? true);
                setBubbleWidth(data.bubbleWidth || "80px");
                setBubbleHeight(data.bubbleHeight || "80px");
                setBorderRadius(data.borderRadius ?? 8);

                // Parse gradient
                const grad = data.borderGradient || "";
                if (grad.includes("linear-gradient")) {
                    const match = grad.match(/linear-gradient\((\d+)deg,\s*(#[a-fA-F0-9]+).*(#[a-fA-F0-9]+)/);
                    if (match) {
                        setAngle(parseInt(match[1]));
                        setColor1(match[2]);
                        setColor2(match[3]);
                    }
                }

                setBorderEnabled(data.borderEnabled ?? true);
                setMaxWidth(data.maxWidth || "100%");
                setMarginTop(data.marginTop || "0px");
                setMarginRight(data.marginRight || "0px");
                setMarginBottom(data.marginBottom || "0px");
                setMarginLeft(data.marginLeft || "0px");
                setPaddingTop(data.paddingTop || "0px");
                setPaddingRight(data.paddingRight || "0px");
                setPaddingBottom(data.paddingBottom || "0px");
                setPaddingLeft(data.paddingLeft || "0px");
                setIntegrationMode(data.integrationMode || "code");
                setSelector(data.selector || "");
                setInsertionMethod(data.insertionMethod || "after");
                setConditions(data.conditions || []);
                setVideoList((data.videos || []).map((v: any) => ({
                    videoId: v.id,
                    video: v
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
        if (!name.trim()) { alert("O nome da story é obrigatório."); return; }
        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            const generatedGradient = `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
            const payload = {
                name, title, shape, borderGradient: generatedGradient, borderEnabled, showProducts,
                maxWidth, marginTop, marginRight, marginBottom, marginLeft,
                paddingTop, paddingRight, paddingBottom, paddingLeft,
                bubbleWidth, bubbleHeight, borderRadius,
                integrationMode, selector, insertionMethod, conditions,
                videos: videoList.map(e => ({ id: e.videoId }))
            };

            if (isNew) {
                const res = await apiFetch("/api/stories", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error("Erro ao criar story");
                const created = await res.json();
                navigate(`/dashboard/stories/edit/${created.story.id}`, { replace: true });
            } else {
                const res = await apiFetch(`/api/stories/${id}`, {
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
            <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-3 shadow-sm relative z-10 transition-all">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/stories")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-base font-bold line-clamp-1">{name || (isNew ? "Novo Story Hub" : "Editar Story Hub")}</h1>
                        <p className="text-xs text-muted-foreground">
                            Widget Estilo Instagram · {videoList.length} vídeo{videoList.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setPreviewOpen(true)} className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        <span className="hidden sm:inline">Preview</span>
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 transition-all active:scale-95">
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
                            <div className="max-w-md">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Nome Interno <span className="text-destructive">*</span></Label>
                                <input
                                    type="text"
                                    placeholder="Ex: Stories da Home"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1.5">Este nome é apenas para sua organização interna.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Section 2: Bubble Style */}
                <div className="w-full">
                    <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-xl">
                        <CardHeader className="pb-4 border-b border-border/50">
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5" /> Estilo das Miniaturas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <Label className="text-xs font-semibold uppercase text-muted-foreground block">Arredondamento das Miniaturas</Label>
                                            <span className="text-[10px] font-mono font-bold text-primary">{borderRadius}px</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="100" step="1"
                                            value={borderRadius} onChange={e => setBorderRadius(parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        <div className="flex justify-between mt-1 px-0.5">
                                            <span className="text-[9px] text-muted-foreground uppercase font-bold">Quadrado</span>
                                            <span className="text-[9px] text-muted-foreground uppercase font-bold">Círculo</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Largura</Label>
                                            <input
                                                type="text"
                                                placeholder="80px"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={bubbleWidth}
                                                onChange={e => setBubbleWidth(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Altura</Label>
                                            <input
                                                type="text"
                                                placeholder="80px"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={bubbleHeight}
                                                onChange={e => setBubbleHeight(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Borda Colorida</Label>
                                            <p className="text-[10px] text-muted-foreground">Destaque os stories com gradiente</p>
                                        </div>
                                        <Switch checked={borderEnabled} onCheckedChange={setBorderEnabled} />
                                    </div>

                                    {borderEnabled && (
                                        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Cor Inicial</Label>
                                                    <div className="flex gap-2">
                                                        <input type="color" value={color1} onChange={e => setColor1(e.target.value)} className="w-8 h-8 rounded border p-0.5 cursor-pointer bg-background" />
                                                        <input type="text" value={color1} onChange={e => setColor1(e.target.value)} className="flex-1 h-8 rounded border px-2 text-[10px] uppercase font-mono bg-background" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Cor Final</Label>
                                                    <div className="flex gap-2">
                                                        <input type="color" value={color2} onChange={e => setColor2(e.target.value)} className="w-8 h-8 rounded border p-0.5 cursor-pointer bg-background" />
                                                        <input type="text" value={color2} onChange={e => setColor2(e.target.value)} className="flex-1 h-8 rounded border px-2 text-[10px] uppercase font-mono bg-background" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground block">Ângulo do Gradiente</Label>
                                                    <span className="text-[10px] font-mono font-bold text-primary">{angle}°</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="360" step="1"
                                                    value={angle} onChange={e => setAngle(parseInt(e.target.value))}
                                                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>
                                        </div>
                                    )}
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
                                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Largura Máxima do Container</Label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 1200px ou 100%"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={maxWidth}
                                            onChange={e => setMaxWidth(e.target.value)}
                                        />
                                    </div>

                                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50 flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Exibir Produtos</Label>
                                            <p className="text-[10px] text-muted-foreground">Mostra produtos vinculados ao vídeo no player</p>
                                        </div>
                                        <Switch checked={showProducts} onCheckedChange={setShowProducts} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider block">Margens Externas</Label>
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
                                            <Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider block">Padding Interno</Label>
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

                {/* Bottom: Video Library (Full width) */}
                <div className="w-full flex flex-col gap-5">
                    <Card className="border-border flex flex-col overflow-hidden shadow-sm">
                        <CardHeader className="pb-4 border-b border-border/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                    <Video className="w-3.5 h-3.5" /> Vídeos ({videoList.length})
                                </CardTitle>
                                {videoList.length > 1 && (
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <GripVertical className="w-3 h-3" /> Arraste para reordenar
                                    </p>
                                )}
                            </div>
                        </CardHeader>

                        <div className="p-4 border-b border-border/50 bg-muted/10">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Buscar vídeo..."
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
                                <div className="mt-2 border border-border rounded-lg overflow-hidden bg-background shadow-lg max-h-[220px] overflow-y-auto z-50">
                                    {searchResults.map(v => (
                                        <button
                                            key={v.id}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 border-b border-border/40 last:border-0 text-left transition-colors"
                                            onClick={() => addVideo(v)}
                                        >
                                            <div className="w-12 h-16 bg-black rounded overflow-hidden shrink-0 border border-border">
                                                <video src={v.mediaUrl} className="w-full h-full object-cover opacity-80" preload="metadata" muted />
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

                        <div className="flex-1 overflow-y-auto max-h-[480px]">
                            {videoList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground">
                                    <Video className="w-8 h-8 opacity-20 mb-3" />
                                    <p className="text-sm">Nenhum vídeo adicionado.</p>
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
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 group cursor-grab active:cursor-grabbing transition-all",
                                                dragOver === idx && dragIdx !== idx ? 'bg-primary/10 border-t-2 border-primary' : 'hover:bg-muted/30'
                                            )}
                                        >
                                            <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
                                            <span className="text-xs font-mono text-muted-foreground/50 w-5 shrink-0">{idx + 1}</span>
                                            <div className={cn("w-12 h-16 bg-black rounded border border-border overflow-hidden shrink-0 shadow-sm transition-all", shape === 'round' ? 'rounded-full scale-110' : 'rounded-lg')}>
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
                                                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{entry.video?.title ?? `Vídeo #${entry.videoId}`}</p>
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
                            id={id} name={name} shape={shape} borderEnabled={borderEnabled} borderGradient={`linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`} showProducts={showProducts} videoList={videoList}
                            maxWidth={maxWidth} marginTop={marginTop} marginRight={marginRight} marginBottom={marginBottom} marginLeft={marginLeft}
                            paddingTop={paddingTop} paddingRight={paddingRight} paddingBottom={paddingBottom} paddingLeft={paddingLeft}
                            bubbleWidth={bubbleWidth} bubbleHeight={bubbleHeight} borderRadius={borderRadius}
                            onClose={() => setPreviewOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Embed & Integration Section */}
            {!isNew && (
                <IntegrationSection 
                    id={id!} 
                    integrationMode={integrationMode} 
                    setIntegrationMode={setIntegrationMode}
                    selector={selector}
                    setSelector={setSelector}
                    insertionMethod={insertionMethod}
                    setInsertionMethod={setInsertionMethod}
                />
            )}

            {/* Conditions Section */}
            {!isNew && (
                <ConditionsSection 
                    conditions={conditions}
                    setConditions={setConditions}
                />
            )}
        </div>
    );
}

function LivePreviewSection({
    id, name, shape, borderEnabled, borderGradient, showProducts, videoList,
    maxWidth, marginTop, marginRight, marginBottom, marginLeft,
    paddingTop, paddingRight, paddingBottom, paddingLeft,
    bubbleWidth, bubbleHeight, borderRadius,
    onClose
}: {
    id: string | undefined, name: string, shape: string, borderEnabled: boolean, borderGradient: string, showProducts: boolean, videoList: StoryVideoEntry[],
    maxWidth: string, marginTop: string, marginRight: string, marginBottom: string, marginLeft: string,
    paddingTop: string, paddingRight: string, paddingBottom: string, paddingLeft: string,
    bubbleWidth: string, bubbleHeight: string, borderRadius: number,
    onClose?: () => void
}) {
    const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [zoom, setZoom] = useState(1);

    const previewData = {
        id: id || "preview",
        name,
        shape,
        borderGradient,
        borderEnabled,
        showProducts,
        borderRadius,
        maxWidth,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        bubbleWidth,
        bubbleHeight,
        videos: videoList.map(v => ({
            ...v.video,
            products: v.video?.productsList || []
        }))
    };

    const mockScript = `
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
      if (url.includes('/api/public/stories/')) {
         return { json: async () => (${JSON.stringify(previewData)}) };
      }
      return originalFetch(url, options);
    };
  `;

    const srcDoc = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <base href="${window.location.origin}">
      <title>Preview Stories Loja</title>
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
        <!-- Story Dynamic Element -->
        <section class="py-10 px-6 border-b border-slate-50">
          <div class="max-w-7xl mx-auto">
             <div data-vidshop-story="${id || 'preview'}"></div>
          </div>
        </section>

        <!-- Hero Section Minimal -->
        <section class="hero-gradient px-6 py-20 text-center">
          <div class="max-w-3xl mx-auto space-y-6">
            <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900">Novidades de Inverno</h1>
            <p class="text-slate-500 text-sm max-w-xl mx-auto">Toda a coleção com até 40% OFF por tempo limitado.</p>
            <button class="bg-black text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg shadow-black/10 hover:scale-105 transition-transform">Confira Agora</button>
          </div>
        </section>

        <!-- Product Grid Placeholder -->
        <section class="py-20 bg-slate-50 px-6">
          <div class="max-w-7xl mx-auto">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              ${[1, 2, 3, 4].map(i => `
                <div class="group cursor-pointer">
                  <div class="aspect-[3/4] bg-white rounded-2xl overflow-hidden relative mb-4">
                    <div class="absolute inset-0 bg-slate-200 animate-pulse transition-transform duration-500"></div>
                  </div>
                  <div class="space-y-1">
                    <div class="h-4 w-2/3 bg-slate-200 rounded animate-pulse mb-2"></div>
                    <div class="h-3 w-1/3 bg-slate-100 rounded animate-pulse"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>
      </main>

      <!-- Footer Mock -->
      <footer class="bg-white border-t border-slate-100 py-12 px-6 text-center">
        <div class="max-w-7xl mx-auto text-slate-400 text-[10px] font-bold uppercase tracking-widest">
           © 2024 VidShop Store 
        </div>
      </footer>
      
      <script>${mockScript}</script>
      <script src="${window.location.origin}/embed/vidshop.js?v=${Date.now()}"></script>
    </body>
    </html>
  `;

    let widthClass = "w-full";
    let heightStyle = "100%";
    if (device === "tablet") {
        widthClass = "w-[768px]";
        heightStyle = "1024px";
    } else if (device === "mobile") {
        widthClass = "w-[375px]";
        heightStyle = "812px";
    }

    return (
        <Card className="border-0 rounded-none overflow-hidden h-full flex flex-col bg-background shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden sm:block">Preview em Tempo Real</CardTitle>
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

            <div className={cn("bg-muted/40 flex justify-center overflow-y-auto flex-1 overflow-x-hidden", device === "desktop" ? "p-0 items-stretch" : "p-4 sm:p-8 items-start")}>
                <div
                    className={cn("bg-background overflow-hidden transition-all duration-300 origin-top flex flex-col", widthClass, device === "desktop" ? "rounded-none w-full" : "rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_20px_40px_-10px_rgba(0,0,0,0.1)] shrink-0")}
                    style={{
                        transform: device === "desktop" ? "none" : `scale(${zoom})`,
                        height: heightStyle,
                        minHeight: heightStyle
                    }}
                >
                    <iframe
                        key={JSON.stringify(previewData)}
                        className="w-full h-full border-none bg-transparent"
                        srcDoc={srcDoc}
                        title="VidShop Story Preview"
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </div>
        </Card>
    );
}

function IntegrationSection({ 
    id, integrationMode, setIntegrationMode, selector, setSelector, insertionMethod, setInsertionMethod 
}: { 
    id: string, integrationMode: string, setIntegrationMode: (v: string) => void,
    selector: string, setSelector: (v: string) => void,
    insertionMethod: string, setInsertionMethod: (v: string) => void
}) {
    const [copied, setCopied] = useState<"script" | "div" | null>(null);
    const origin = window.location.origin;
    const scriptTag = `<script src="${origin}/embed/vidshop.js" async></script>`;
    const divTag = `<div data-vidshop-story="${id}"></div>`;

    const copy = (text: string, key: "script" | "div") => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <Card className="border-border border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-border/50 flex flex-row items-center gap-2">
                <Code2 className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Integração</CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">Modo de Integração</label>
                            <select 
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                                value={integrationMode}
                                onChange={e => setIntegrationMode(e.target.value)}
                            >
                                <option value="code">Código (Manual)</option>
                                <option value="selector">Seletor CSS (Automático)</option>
                            </select>
                        </div>

                        {integrationMode === "selector" && (
                            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                                <div className="grid gap-2">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">Posição de Inserção</label>
                                    <select 
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                                        value={insertionMethod}
                                        onChange={e => setInsertionMethod(e.target.value)}
                                    >
                                        <option value="before">Antes de</option>
                                        <option value="after">Depois de</option>
                                        <option value="prepend">Primeiro item dentro de</option>
                                        <option value="append">Último item dentro de</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-xs font-semibold uppercase text-muted-foreground">Seletor CSS</label>
                                    <input 
                                        type="text"
                                        placeholder="Ex: .product-description ou #main-content"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={selector}
                                        onChange={e => setSelector(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">O story hub será injetado automaticamente em relação a este elemento.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                            <p className="text-sm font-semibold">Script Geral (Template)</p>
                        </div>
                        <div className="relative">
                            <pre className="text-[11px] bg-muted/40 border border-border rounded-lg p-3 overflow-x-auto font-mono text-foreground whitespace-pre-wrap break-all">{scriptTag}</pre>
                            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={() => copy(scriptTag, "script")}>
                                {copied === "script" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                        </div>
                        
                        {integrationMode === "code" && (
                            <div className="space-y-2 pt-2 animate-in fade-in">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                                    <p className="text-sm font-semibold">Cole onde quiser exibir</p>
                                </div>
                                <div className="relative">
                                    <pre className="text-[11px] bg-muted/40 border border-border rounded-lg p-3 overflow-x-auto font-mono text-foreground">{divTag}</pre>
                                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={() => copy(divTag, "div")}>
                                        {copied === "div" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </Button>
                                </div>
                            </div>
                        )}
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

function ConditionsSection({ conditions, setConditions }: { conditions: any[], setConditions: (v: any[]) => void }) {
    const addCondition = () => {
        setConditions([...conditions, { data: "url", operator: "contains", value: "" }]);
    };

    const removeCondition = (idx: number) => {
        setConditions(conditions.filter((_, i) => i !== idx));
    };

    const updateCondition = (idx: number, field: string, val: string) => {
        const next = [...conditions];
        next[idx] = { ...next[idx], [field]: val };
        setConditions(next);
    };

    return (
        <Card className="border-border border-zinc-200/80 dark:border-zinc-800 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <CircleDot className="w-3.5 h-3.5 text-muted-foreground" />
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Condições de Exibição</CardTitle>
                </div>
                <Button size="sm" variant="outline" onClick={addCondition} className="h-7 text-[10px] uppercase font-bold">
                    <Plus className="w-3 h-3 mr-1" /> Add Condição
                </Button>
            </CardHeader>
            <CardContent className="p-5">
                {conditions.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
                        <p className="text-xs text-muted-foreground">O story hub será exibido em todas as páginas por padrão.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {conditions.map((c, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row gap-3 items-end bg-muted/20 p-4 rounded-lg border border-border/50 relative group">
                                <div className="flex-1 w-full space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Dados</label>
                                    <select 
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                        value={c.data}
                                        onChange={e => updateCondition(idx, "data", e.target.value)}
                                    >
                                        <option value="url">Se a URL</option>
                                    </select>
                                </div>
                                <div className="flex-1 w-full space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Condição</label>
                                    <select 
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                        value={c.operator}
                                        onChange={e => updateCondition(idx, "operator", e.target.value)}
                                    >
                                        <option value="equals">for igual</option>
                                        <option value="not_equals">não é igual</option>
                                        <option value="contains">contém</option>
                                        <option value="not_contains">não contém</option>
                                    </select>
                                </div>
                                <div className="flex-[2] w-full space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Valor</label>
                                    <input
                                        type="text"
                                        placeholder="Valor ou parte da URL"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={c.value}
                                        onChange={e => updateCondition(idx, "value", e.target.value)}
                                    />
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => removeCondition(idx)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
