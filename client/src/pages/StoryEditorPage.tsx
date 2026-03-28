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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProductMultiSelect } from "@/components/ProductMultiSelect";

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

function LivePreviewSection({
    id, name, shape, borderEnabled, borderGradient, showProducts, videoList,
    maxWidth, marginTop, marginRight, marginBottom, marginLeft,
    paddingTop, paddingRight, paddingBottom, paddingLeft,
    bubbleWidth, bubbleHeight, borderRadius,
    conditions,
    onClose
}: {
    id: string | undefined, name: string, shape: string, borderEnabled: boolean, borderGradient: string, showProducts: boolean, videoList: StoryVideoEntry[],
    maxWidth: string, marginTop: string, marginRight: string, marginBottom: string, marginLeft: string,
    paddingTop: string, paddingRight: string, paddingBottom: string, paddingLeft: string,
    bubbleWidth: string, bubbleHeight: string, borderRadius: number,
    conditions: any[],
    onClose?: () => void
}) {
    const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
    const [zoom, setZoom] = useState(1);

    const previewData = {
        id: id || "preview",
        name, shape, borderGradient, borderEnabled, showProducts, borderRadius,
        maxWidth, marginTop, marginRight, marginBottom, marginLeft,
        paddingTop, paddingRight, paddingBottom, paddingLeft,
        bubbleWidth, bubbleHeight,
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
    window.dataLayer = window.dataLayer || [];
    ${conditions
            .filter((c: any) => c.data === 'dataLayer' && c.value)
            .map((c: any) => {
                const key = (c.key || "type").replace(/^\[\d+\]\./, "").replace(/^[^a-zA-Z0-9]/, "");
                return `window.dataLayer.push({ "${key}": "${c.value}" });`;
            }).join('\n')}
  `;

    const srcDoc = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <base href="${window.location.origin}">
      <title>Preview Stories</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; margin: 0; background: #ffffff; }
      </style>
    </head>
    <body class="antialiased text-slate-900">
      <div class="bg-black text-white text-[10px] py-1.5 text-center font-bold tracking-widest uppercase">Frete Grátis</div>
      <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex justify-between items-center">
        <img src="/src/public/vidshop-logo.png" alt="Vidshop" class="h-7 w-auto" />
      </header>
      <main>
        <section class="py-10 px-6 border-b">
           <div class="max-w-7xl mx-auto"><div data-vidshop-story="${id || 'preview'}"></div></div>
        </section>
        <section class="px-6 py-20 text-center bg-slate-50">
           <h1 class="text-3xl font-extrabold text-slate-900">Novidades</h1>
        </section>
      </main>
      <script>\${mockScript}<\/script>
      <script src="${window.location.origin}/embed/vidshop.js?v=${Date.now()}"></script>
    </body>
    </html>
    `;

    let widthClass = "w-full";
    let heightStyle = "100%";
    if (device === "tablet") { widthClass = "w-[768px]"; heightStyle = "1024px"; }
    else if (device === "mobile") { widthClass = "w-[375px]"; heightStyle = "812px"; }

    return (
        <Card className="border-0 rounded-none overflow-hidden h-full flex flex-col bg-background shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden sm:block">Preview em Tempo Real</CardTitle>
                </div>
                <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.25, z - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
                    <div className="w-12 text-center text-[11px] font-bold text-primary">{Math.round(zoom * 100)}%</div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-background border border-border rounded-lg p-1">
                        <Button variant={device === "desktop" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => { setDevice("desktop"); setZoom(1); }}><Monitor className="w-4 h-4" /></Button>
                        <Button variant={device === "tablet" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => { setDevice("tablet"); setZoom(0.8); }}><Tablet className="w-4 h-4" /></Button>
                        <Button variant={device === "mobile" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => { setDevice("mobile"); setZoom(0.8); }}><Smartphone className="w-4 h-4" /></Button>
                    </div>
                    {onClose && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full ml-2" onClick={onClose}><X className="w-5 h-5" /></Button>}
                </div>
            </CardHeader>
            <div className={cn("bg-muted/40 flex justify-center overflow-y-auto flex-1", device === "desktop" ? "p-0 items-stretch" : "p-8 items-start")}>
                <div className={cn("bg-background overflow-hidden transition-all duration-300 origin-top flex flex-col", widthClass, device === "desktop" ? "" : "rounded-xl shadow-xl")} style={{ transform: device === "desktop" ? "none" : `scale(${zoom})`, height: heightStyle, minHeight: heightStyle }}>
                    <iframe key={JSON.stringify(previewData)} className="w-full h-full border-none" srcDoc={srcDoc} title="Preview" sandbox="allow-scripts allow-same-origin" />
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
        <Card className="border-border shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-border/50 flex flex-row items-center gap-2">
                <Code2 className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Integração</CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Modo de Integração</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-ring" value={integrationMode} onChange={e => setIntegrationMode(e.target.value)}>
                            <option value="code">Código (Manual)</option>
                            <option value="selector">Seletor CSS (Automático)</option>
                        </select>
                        {integrationMode === "selector" && (
                            <div className="space-y-4 pt-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Posição</Label>
                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={insertionMethod} onChange={e => setInsertionMethod(e.target.value)}>
                                    <option value="before">Antes de</option>
                                    <option value="after">Depois de</option>
                                    <option value="prepend">Primeiro item dentro de</option>
                                    <option value="append">Último item dentro de</option>
                                </select>
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Seletor CSS</Label>
                                <input type="text" placeholder="Ex: .product-description" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={selector} onChange={e => setSelector(e.target.value)} />
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm font-semibold">Script Geral (Template)</p>
                        <div className="relative">
                            <pre className="text-[11px] bg-muted/40 border rounded-lg p-3 font-mono whitespace-pre-wrap break-all">{scriptTag}</pre>
                            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={() => copy(scriptTag, "script")}>{copied === "script" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}</Button>
                        </div>
                        {integrationMode === "code" && (
                            <div className="relative mt-4">
                                <pre className="text-[11px] bg-muted/40 border rounded-lg p-3 font-mono">{divTag}</pre>
                                <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={() => copy(divTag, "div")}>{copied === "div" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}</Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ConditionsSection({ conditions, setConditions }: { conditions: any[], setConditions: (v: any[]) => void }) {
    const addCondition = () => setConditions([...conditions, { data: "url", operator: "contains", value: "" }]);
    const removeCondition = (idx: number) => setConditions(conditions.filter((_, i) => i !== idx));
    const updateCondition = (idx: number, field: string, val: string) => {
        const next = [...conditions];
        next[idx] = { ...next[idx], [field]: val };
        setConditions(next);
    };

    return (
        <Card className="border-border shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-border/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2"><CircleDot className="w-3.5 h-3.5 text-muted-foreground" /><CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Condições de Exibição</CardTitle></div>
                <Button size="sm" variant="outline" onClick={addCondition} className="h-7 text-[10px] uppercase font-bold"><Plus className="w-3 h-3 mr-1" /> Add Condição</Button>
            </CardHeader>
            <CardContent className="p-5">
                {conditions.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-border rounded-xl"><p className="text-xs text-muted-foreground">Exibido em todas as páginas por padrão.</p></div>
                ) : (
                    <div className="space-y-4">
                        {conditions.map((c, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row gap-3 items-end bg-muted/20 p-4 rounded-lg border border-border/50">
                                <div className="flex-1 w-full space-y-1.5"><Label className="text-[10px] font-bold uppercase">Dados</Label><select className="flex h-9 w-full rounded-md border bg-background px-3 text-xs" value={c.data} onChange={e => updateCondition(idx, "data", e.target.value)}><option value="url">URL</option><option value="dataLayer">dataLayer</option></select></div>
                                {c.data === 'dataLayer' && (<div className="flex-1 w-full space-y-1.5"><Label className="text-[10px] font-bold uppercase">Caminho</Label><input type="text" placeholder="Ex: [0].type" className="flex h-9 w-full rounded-md border bg-background px-3 text-xs" value={c.key || ""} onChange={e => updateCondition(idx, "key", e.target.value)} /></div>)}
                                <div className="flex-1 w-full space-y-1.5"><Label className="text-[10px] font-bold uppercase">Condição</Label><select className="flex h-9 w-full rounded-md border bg-background px-3 text-xs" value={c.operator} onChange={e => updateCondition(idx, "operator", e.target.value)}><option value="equals">igual</option><option value="not_equals">diferente</option><option value="contains">contém</option><option value="not_contains">não contém</option></select></div>
                                <div className="flex-[2] w-full space-y-1.5"><Label className="text-[10px] font-bold uppercase">Valor</Label><input type="text" placeholder="Valor" className="flex h-9 w-full rounded-md border bg-background px-3 text-xs" value={c.value} onChange={e => updateCondition(idx, "value", e.target.value)} /></div>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeCondition(idx)}><X className="w-4 h-4" /></Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function DynamicVideoConditionsEditor({ conditions, setConditions }: { conditions: any[], setConditions: (v: any[]) => void }) {
    const [previewVideos, setPreviewVideos] = useState<any[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const timeout = setTimeout(async () => {
            setLoadingPreview(true);
            try {
                const token = localStorage.getItem("token");
                const res = await apiFetch("/api/videos/preview-dynamic", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ conditions, pageUrl: "" })
                });
                if (res.ok && isMounted) {
                    const data = await res.json();
                    setPreviewVideos(data.videos || []);
                }
            } finally {
                if (isMounted) setLoadingPreview(false);
            }
        }, 400);
        return () => { isMounted = false; clearTimeout(timeout); };
    }, [conditions]);

    const addCondition = () => setConditions([...conditions, { field: "title", operator: "contains", value: "" }]);
    const removeCondition = (idx: number) => setConditions(conditions.filter((_, i) => i !== idx));
    const updateCondition = (idx: number, field: string, val: any) => {
        const next = [...conditions];
        next[idx] = { ...next[idx], [field]: val };
        if (field === "field") {
            if (val === "title" || val === "description") next[idx].operator = "contains";
            if (val === "tags") next[idx].operator = "contains_tags";
            if (val === "products") next[idx].operator = "contains_products";
            next[idx].value = "";
        }
        if (field === "operator" && (val === "url_equals_page_url" || val === "url_contains_page_url")) {
            next[idx].value = "";
        }
        setConditions(next);
    };

    const hasPageUrlCondition = conditions.some((c: any) => c.operator === "url_equals_page_url" || c.operator === "url_contains_page_url");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <Label className="text-xs font-bold uppercase opacity-70">Regras de Extração Dinâmica</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Vídeos da sua biblioteca que atenderem às regras serão incluídos neste story automaticamente.</p>
                </div>
                <Button size="sm" variant="outline" onClick={addCondition} className="h-7 text-[10px] uppercase font-bold"><Plus className="w-3 h-3 mr-1" /> Add Regra</Button>
            </div>
            
            {conditions.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-border rounded-xl"><p className="text-xs text-muted-foreground">Nenhuma regra configurada. Todos os vídeos aparecerão neste story.</p></div>
            ) : (
                <div className="space-y-3">
                    {conditions.map((c, idx) => (
                        <div key={idx} className="flex flex-col lg:flex-row gap-3 items-end bg-muted/20 p-4 rounded-xl border">
                            <div className="flex-1 w-full space-y-1.5"><Label className="text-[10px] font-bold uppercase">Atributo</Label>
                                <select className="flex h-9 w-full rounded-md border bg-background px-3 text-[11px]" value={c.field} onChange={e => updateCondition(idx, "field", e.target.value)}>
                                    <option value="title">Nome do Vídeo</option>
                                    <option value="tags">Tags do Vídeo</option>
                                    <option value="description">Descrição do Vídeo</option>
                                    <option value="products">Produtos (IDs)</option>
                                </select>
                            </div>
                            <div className="flex-1 w-full space-y-1.5"><Label className="text-[10px] font-bold uppercase">Condição</Label>
                                <select className="flex h-9 w-full rounded-md border bg-background px-3 text-[11px]" value={c.operator} onChange={e => updateCondition(idx, "operator", e.target.value)}>
                                    {(c.field === "title" || c.field === "description") && (
                                        <>
                                            <option value="contains">contém</option>
                                            <option value="not_contains">não contém</option>
                                            <option value="equal_to">é igual a</option>
                                            <option value="not_equal_to">não é igual a</option>
                                        </>
                                    )}
                                    {c.field === "tags" && (
                                        <>
                                            <option value="contains_tags">contém as tags</option>
                                            <option value="not_contains_tags">não contém as tags</option>
                                        </>
                                    )}
                                    {c.field === "products" && (
                                        <>
                                            <option value="contains_products">contém os produtos</option>
                                            <option value="not_contains_products">não contém os produtos</option>
                                            <option value="contains_only_product">contém SOMENTE os produtos</option>
                                            <option value="url_equals_page_url">URL do produto é IGUAL à página do visitante</option>
                                            <option value="url_contains_page_url">URL do produto CONTÉM a página do visitante</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="flex-[2] w-full space-y-1.5"><Label className="text-[10px] font-bold uppercase">Valores Associados</Label>
                                {c.operator === "url_equals_page_url" || c.operator === "url_contains_page_url" ? (
                                    <input type="text" disabled placeholder="Analisado dinamicamente..." className="flex h-9 w-full rounded-md border text-muted-foreground bg-muted/50 px-3 text-[11px] cursor-not-allowed" value="Automático pelo Contexto da Página" />
                                ) : c.field === "products" ? (
                                    <ProductMultiSelect
                                        selectedIds={Array.isArray(c.value) ? c.value.map(Number) : []}
                                        onChange={(ids) => updateCondition(idx, "value", ids)}
                                    />
                                ) : (
                                    <input type="text" placeholder={c.field === "tags" ? "Ex: tag1, tag2 (separados por vírgula)" : "Texto..."} className="flex h-9 w-full rounded-md border bg-background px-3 text-[11px]" value={Array.isArray(c.value) ? c.value.join(", ") : c.value} onChange={e => {
                                        const val = e.target.value;
                                        if (c.field === "tags") {
                                            updateCondition(idx, "value", val.split(",").map((s: string) => s.trim()).filter(Boolean));
                                        } else {
                                            updateCondition(idx, "value", val);
                                        }
                                    }} />
                                )}
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeCondition(idx)}><X className="w-4 h-4" /></Button>
                        </div>
                    ))}
                </div>
            )}

            <div className="pt-4 border-t mt-4 space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold uppercase opacity-70">Resultado do Filtro</Label>
                    {!hasPageUrlCondition && (
                        <div className="flex items-center gap-2">
                            {loadingPreview && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                            {!loadingPreview && <span className="text-[10px] text-muted-foreground font-bold bg-muted border border-border/50 px-2 py-0.5 rounded shadow-sm">{previewVideos.length} vídeo(s)</span>}
                        </div>
                    )}
                </div>
                {hasPageUrlCondition ? (
                    <div className="text-center py-5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg">
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">✨ Os vídeos serão listados dinamicamente de acordo com a URL da página do visitante.</span>
                    </div>
                ) : previewVideos.length === 0 ? (
                    <div className="text-center py-5 bg-muted/20 border rounded-lg"><span className="text-[11px] font-semibold text-muted-foreground">Nenhum vídeo atende aos critérios atuais.</span></div>
                ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted">
                        {previewVideos.map(v => (
                            <div key={v.id} className="min-w-[6.5rem] max-w-[6.5rem] aspect-[9/16] bg-black rounded-lg relative overflow-hidden flex-shrink-0 border shadow-sm group">
                                {v.thumbnailUrl ? (
                                    <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted"><Video className="w-6 h-6 text-muted-foreground/30" /></div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-white">
                                    <p className="text-[9px] font-bold line-clamp-2 leading-tight">{v.title}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function StoryEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = !id || id === "new";

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [title, setTitle] = useState("");
    const [shape, setShape] = useState("round");
    const [showProducts, setShowProducts] = useState(true);
    const [bubbleWidth, setBubbleWidth] = useState("80px");
    const [bubbleHeight, setBubbleHeight] = useState("80px");
    const [borderRadius, setBorderRadius] = useState(8);
    const [integrationMode, setIntegrationMode] = useState("code");
    const [selector, setSelector] = useState("");
    const [insertionMethod, setInsertionMethod] = useState("after");
    const [conditions, setConditions] = useState<any[]>([]);
    const [videoSelectionType, setVideoSelectionType] = useState("manual");
    const [dynamicVideoConditions, setDynamicVideoConditions] = useState<any[]>([]);
    const [color1, setColor1] = useState("#f09433");
    const [color2, setColor2] = useState("#bc1888");
    const [angle, setAngle] = useState(45);
    const [borderEnabled, setBorderEnabled] = useState(true);
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
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ShoppableVideo[]>([]);
    const [searching, setSearching] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dragOver, setDragOver] = useState<number | null>(null);

    useEffect(() => {
        if (isNew) return;
        const load = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await apiFetch(`/api/stories/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) { navigate("/dashboard/stories"); return; }
                const data = await res.json();
                setName(data.name || "");
                setTitle(data.title || "");
                setShape(data.shape || "round");
                setShowProducts(data.showProducts ?? true);
                setBubbleWidth(data.bubbleWidth || "80px");
                setBubbleHeight(data.bubbleHeight || "80px");
                setBorderRadius(data.borderRadius ?? 8);
                const grad = data.borderGradient || "";
                if (grad.includes("linear-gradient")) {
                    const match = grad.match(/linear-gradient\((\d+)deg,\s*(#[a-fA-F0-9]+).*(#[a-fA-F0-9]+)/);
                    if (match) { setAngle(parseInt(match[1])); setColor1(match[2]); setColor2(match[3]); }
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
                setVideoSelectionType(data.videoSelectionType || "manual");
                setDynamicVideoConditions(data.dynamicVideoConditions || []);
                setVideoList((data.videos || []).map((v: any) => ({ videoId: v.id, video: v })));
            } finally { setLoading(false); }
        };
        load();
    }, [id, isNew, navigate]);

    const handleSearch = async () => {
        setSearching(true);
        try {
            const token = localStorage.getItem("token");
            const res = await apiFetch("/api/videos", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const all: ShoppableVideo[] = (await res.json()).videos || [];
                const q = searchQuery.trim().toLowerCase();
                setSearchResults(q ? all.filter(v => v.title.toLowerCase().includes(q)) : all);
            }
        } finally { setSearching(false); }
    };

    const addVideo = (v: ShoppableVideo) => {
        if (videoList.some(e => e.videoId === v.id)) return;
        setVideoList(prev => [...prev, { videoId: v.id, video: v }]);
        setSearchResults([]);
        setSearchQuery("");
    };

    const handleSave = async () => {
        if (!name.trim()) { toast.error("O nome é obrigatório."); return; }
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
                videoSelectionType, dynamicVideoConditions,
                videos: videoList.map(e => ({ id: e.videoId }))
            };
            const method = isNew ? "POST" : "PUT";
            const url = isNew ? "/api/stories" : `/api/stories/${id}`;
            const res = await apiFetch(url, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Erro ao salvar");
            toast.success("Story salva com sucesso!");
            if (isNew) { const created = await res.json(); navigate(`/dashboard/stories/edit/${created.story.id}`, { replace: true }); }
        } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
    };

    if (loading) return <div className="flex h-full items-center justify-center p-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-10">
            <div className="flex items-center justify-between bg-card border rounded-xl px-5 py-3 shadow-sm relative z-10">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/stories")}><ArrowLeft className="w-5 h-5" /></Button>
                    <div><h1 className="text-base font-bold line-clamp-1">{name || "Novo Story Hub"}</h1><p className="text-xs text-muted-foreground">{videoList.length} vídeos</p></div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2"><Monitor className="w-4 h-4" /><span>Preview</span></Button>
                    <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Salvar</Button>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <Card><CardHeader><CardTitle className="text-xs font-bold uppercase">Informações</CardTitle></CardHeader>
                    <CardContent><Label className="text-xs font-semibold uppercase">Nome</Label><input type="text" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={name} onChange={e => setName(e.target.value)} /></CardContent></Card>

                <Card><CardHeader><CardTitle className="text-xs font-bold uppercase">Bubble Style</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between"><Label className="text-xs font-semibold uppercase">Borda Ativa</Label><Switch checked={borderEnabled} onCheckedChange={setBorderEnabled} /></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase text-muted-foreground/70 tracking-wider">Formato & Tamanho</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Formato</Label>
                                    <select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={shape} onChange={e => setShape(e.target.value)}>
                                        <option value="round">Círculo</option>
                                        <option value="square">Quadrado</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Arredondamento</Label><input type="number" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={borderRadius} onChange={e => setBorderRadius(Number(e.target.value))} /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Largura</Label><input type="text" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={bubbleWidth} onChange={e => setBubbleWidth(e.target.value)} /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Altura</Label><input type="text" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={bubbleHeight} onChange={e => setBubbleHeight(e.target.value)} /></div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase text-muted-foreground/70 tracking-wider">Cores da Borda</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Cor 1</Label><div className="flex gap-2"><input type="color" value={color1} onChange={e => setColor1(e.target.value)} className="w-10 h-10 rounded border p-0.5 cursor-pointer" /><input type="text" value={color1} onChange={e => setColor1(e.target.value)} className="flex-1 h-10 rounded border px-3 text-xs font-mono uppercase" /></div></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase">Cor 2</Label><div className="flex gap-2"><input type="color" value={color2} onChange={e => setColor2(e.target.value)} className="w-10 h-10 rounded border p-0.5 cursor-pointer" /><input type="text" value={color2} onChange={e => setColor2(e.target.value)} className="flex-1 h-10 rounded border px-3 text-xs font-mono uppercase" /></div></div>
                                <div className="col-span-2 space-y-1.5"><Label className="text-[10px] font-bold uppercase">Ângulo do Gradiente ({angle}°)</Label><input type="range" min="0" max="360" value={angle} onChange={e => setAngle(Number(e.target.value))} className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" /></div>
                            </div>
                        </div>
                    </div>
                </CardContent></Card>

                <Card><CardHeader><CardTitle className="text-xs font-bold uppercase">Layout do Hub</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-1.5"><Label className="text-xs font-semibold uppercase">Largura Máxima</Label><input type="text" value={maxWidth} onChange={e => setMaxWidth(e.target.value)} className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder="Ex: 100% ou 1200px" /></div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3"><Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider block">Margens Externas</Label><div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5"><Label className="text-[9px] uppercase">Topo</Label><input type="text" className="h-8 w-full rounded border px-2 text-[11px]" value={marginTop} onChange={e => setMarginTop(e.target.value)} /></div>
                            <div className="space-y-0.5"><Label className="text-[9px] uppercase">Baixo</Label><input type="text" className="h-8 w-full rounded border px-2 text-[11px]" value={marginBottom} onChange={e => setMarginBottom(e.target.value)} /></div>
                            <div className="space-y-0.5"><Label className="text-[9px] uppercase">Esq.</Label><input type="text" className="h-8 w-full rounded border px-2 text-[11px]" value={marginLeft} onChange={e => setMarginLeft(e.target.value)} /></div>
                            <div className="space-y-0.5"><Label className="text-[9px] uppercase">Dir.</Label><input type="text" className="h-8 w-full rounded border px-2 text-[11px]" value={marginRight} onChange={e => setMarginRight(e.target.value)} /></div>
                        </div></div>
                        <div className="space-y-3"><Label className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider block">Padding Interno</Label><div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5"><Label className="text-[9px] uppercase">Topo</Label><input type="text" className="h-8 w-full rounded border px-2 text-[11px]" value={paddingTop} onChange={e => setPaddingTop(e.target.value)} /></div>
                            <div className="space-y-0.5"><Label className="text-[9px] uppercase">Baixo</Label><input type="text" className="h-8 w-full rounded border px-2 text-[11px]" value={paddingBottom} onChange={e => setPaddingBottom(e.target.value)} /></div>
                            <div className="space-y-0.5"><Label className="text-[9px] uppercase">Esq.</Label><input type="text" className="h-8 w-full rounded border px-2 text-[11px]" value={paddingLeft} onChange={e => setPaddingLeft(e.target.value)} /></div>
                            <div className="space-y-0.5"><Label className="text-[9px] uppercase">Dir.</Label><input type="text" className="h-8 w-full rounded border px-2 text-[11px]" value={paddingRight} onChange={e => setPaddingRight(e.target.value)} /></div>
                        </div></div>
                    </div>
                </CardContent></Card>

                <IntegrationSection id={id!} integrationMode={integrationMode} setIntegrationMode={setIntegrationMode} selector={selector} setSelector={setSelector} insertionMethod={insertionMethod} setInsertionMethod={setInsertionMethod} />
                <ConditionsSection conditions={conditions} setConditions={setConditions} />

                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
                        <CardTitle className="text-xs font-bold uppercase text-muted-foreground/70 tracking-widest">Seleção de Vídeos</CardTitle>
                        <div className="flex bg-muted p-1 rounded-lg w-fit">
                            <button onClick={() => setVideoSelectionType("manual")} className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", videoSelectionType === "manual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>Manual</button>
                            <button onClick={() => setVideoSelectionType("dynamic")} className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", videoSelectionType === "dynamic" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}>Dinâmica</button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {videoSelectionType === "dynamic" ? (
                            <DynamicVideoConditionsEditor conditions={dynamicVideoConditions} setConditions={setDynamicVideoConditions} />
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-2 mb-4">
                                    <input type="text" placeholder="Buscar..." className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }} />
                                    <Button onClick={handleSearch} disabled={searching}>Buscar</Button>
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="mb-4 border rounded-lg overflow-hidden bg-background shadow-lg max-h-[200px] overflow-y-auto">
                                        {searchResults.map(v => (
                                            <button key={v.id} className="w-full flex items-center gap-3 px-3 py-2 border-b hover:bg-muted/50" onClick={() => addVideo(v)}>
                                                <img src={v.thumbnailUrl || ""} alt="th" className="w-10 h-14 object-cover bg-black/10 rounded" />
                                                <span className="text-xs font-semibold flex-1 text-left">{v.title}</span><Plus className="w-4 h-4 text-primary" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="divide-y divide-border border rounded-xl mt-4">
                                    {videoList.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum vídeo adicionado manualmente ainda. Busque e adicione acima.</div>}
                                    {videoList.map((entry, idx) => (
                                        <div key={idx} className="flex items-center gap-3 py-3 px-4 hover:bg-muted/30 group">
                                            <GripVertical className="w-4 h-4 text-muted-foreground/30 cursor-grab" />
                                            <img src={entry.video?.thumbnailUrl || ""} alt="th" className="w-10 h-14 object-cover bg-black/10 rounded" />
                                            <span className="text-sm font-semibold flex-1">{entry.video?.title}</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-30 group-hover:opacity-100 transition-opacity" onClick={() => setVideoList(prev => prev.filter((_, i) => i !== idx))}><X className="w-4 h-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {previewOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
                    <div className="w-full h-full flex flex-col relative z-50">
                        <LivePreviewSection
                            id={id} name={name} shape={shape} borderEnabled={borderEnabled} borderGradient={`linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`} showProducts={showProducts} videoList={videoList}
                            maxWidth={maxWidth} marginTop={marginTop} marginRight={marginRight} marginBottom={marginBottom} marginLeft={marginLeft}
                            paddingTop={paddingTop} paddingRight={paddingRight} paddingBottom={paddingBottom} paddingLeft={paddingLeft}
                            bubbleWidth={bubbleWidth} bubbleHeight={bubbleHeight} borderRadius={borderRadius}
                            conditions={conditions}
                            onClose={() => setPreviewOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
