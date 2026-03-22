import { apiFetch } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Upload, Save, ArrowLeft, Plus, Search, Trash2, X, AlertCircle, GripVertical, GripHorizontal, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Product {
  id: number;
  title: string;
  imageLink: string;
  price: string;
}

interface TimelineItem {
  productId: number;
  startTime: number;
  endTime: number;
  product?: Product;
}

export default function VideoEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [autoThumbnails, setAutoThumbnails] = useState<string[]>([]);
  const [generatingThumbs, setGeneratingThumbs] = useState(false);
  
  const [mediaUrl, setMediaUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [title, setTitle] = useState("Novo Vídeo Interativo");
  const [description, setDescription] = useState("");
  
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState<number | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Drag and Drop State
  const [dragState, setDragState] = useState<{
    index: number;
    mode: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    initStart: number;
    initEnd: number;
    minStart: number;
    maxEnd: number;
  } | null>(null);

  useEffect(() => {
    if (isNew) return;
    const fetchVideo = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await apiFetch(`/api/videos/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const loadedThumbnail = data.video.thumbnailUrl || "";
          const loadedAutoThumbs = data.video.autoThumbnails || [];
          setMediaUrl(data.video.mediaUrl || "");
          setAutoThumbnails(loadedAutoThumbs);
          
          if (!loadedThumbnail && loadedAutoThumbs.length > 0) {
            setThumbnailUrl(loadedAutoThumbs[0]);
          } else {
            setThumbnailUrl(loadedThumbnail);
          }
          
          setTitle(data.video.title || "");
          setDescription(data.video.description || "");
          setTimeline(data.videoProducts || []);
        } else {
          alert("Vídeo não encontrado.");
          navigate("/dashboard/videos");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id, navigate, isNew]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMeta = () => setDuration(video.duration);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMeta);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMeta);
    };
  }, [mediaUrl]);

  // Video Frame Extraction via Backend API
  useEffect(() => {
    if (!mediaUrl || isNew || !id) return;
    if (autoThumbnails.length > 0) return; // Se já gerou ou carregou do banco, não faz requisição
    
    setGeneratingThumbs(true);
    let isMounted = true;
    
    const extract = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await apiFetch(`/api/videos/${id}/extract-thumbs`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          }
        });
        
        if (!res.ok) throw new Error("Falha na extração de frames");
        const data = await res.json();
        if (isMounted) {
          const generatedUrls = data.urls || [];
          setAutoThumbnails(generatedUrls);
          setThumbnailUrl(current => {
            if (!current && generatedUrls.length > 0) return generatedUrls[0];
            return current;
          });
        }
      } catch (err) {
        console.error("Erro na extração backend:", err);
      } finally {
        if (isMounted) setGeneratingThumbs(false);
      }
    };

    extract();
    return () => { isMounted = false; };
  }, [mediaUrl, isNew, id]);

  // Pointer Drag Effects
  useEffect(() => {
    if (!dragState) return;
    
    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      if (!trackRef.current) return;
      const trackWidth = trackRef.current.getBoundingClientRect().width || 1;
      const deltaX = e.clientX - dragState.startX;
      const deltaTime = (deltaX / trackWidth) * duration;
      
      setTimeline(prev => {
        const next = [...prev];
        const item = { ...next[dragState.index] };
        const minDuration = 1; 
        
        if (dragState.mode === 'move') {
          const itemDuration = dragState.initEnd - dragState.initStart;
          let newStart = dragState.initStart + deltaTime;
          if (newStart < dragState.minStart) newStart = dragState.minStart;
          if (newStart + itemDuration > dragState.maxEnd) newStart = dragState.maxEnd - itemDuration;
          item.startTime = newStart;
          item.endTime = newStart + itemDuration;
        } 
        else if (dragState.mode === 'resize-start') {
          let newStart = dragState.initStart + deltaTime;
          if (newStart < dragState.minStart) newStart = dragState.minStart;
          if (newStart > item.endTime - minDuration) newStart = item.endTime - minDuration;
          item.startTime = newStart;
        }
        else if (dragState.mode === 'resize-end') {
          let newEnd = dragState.initEnd + deltaTime;
          if (newEnd > dragState.maxEnd) newEnd = dragState.maxEnd;
          if (newEnd < item.startTime + minDuration) newEnd = item.startTime + minDuration;
          item.endTime = newEnd;
        }
        
        next[dragState.index] = item;
        return next;
      });
    };
    
    const handlePointerUp = () => setDragState(null);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, duration]);

  const handlePointerDown = (e: React.PointerEvent, index: number, mode: 'move'|'resize-start'|'resize-end') => {
    e.stopPropagation();
    e.preventDefault();
    if (!trackRef.current) return;
    
    const sorted = [...timeline].sort((a,b) => a.startTime - b.startTime);
    // Find absolute bounds for the item based on its neighbors
    // Note: timeline array might not be sorted during the drag itself, but we sort it initially before drag
    const realIdx = sorted.findIndex(t => t === timeline[index]);
    const prev = sorted[realIdx - 1];
    const next = sorted[realIdx + 1];
    
    const minStart = prev ? prev.endTime : 0;
    const maxEnd = next ? next.startTime : duration;

    setDragState({
      index,
      mode,
      startX: e.clientX,
      initStart: timeline[index].startTime,
      initEnd: timeline[index].endTime,
      minStart,
      maxEnd
    });
    setSelectedTimelineIndex(index);
    setIsAddingMode(false);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let time = (clickX / rect.width) * duration;
    if (time < 0) time = 0;
    if (time > duration) time = duration;
    
    if (videoRef.current) videoRef.current.currentTime = time;
    setSelectedTimelineIndex(null);
    setIsAddingMode(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const hasOverlap = (start: number, end: number, ignoreIdx: number = -1) => {
    return timeline.some((item, idx) => {
      if (idx === ignoreIdx) return false;
      return start < item.endTime && end > item.startTime;
    });
  };

  const handleUploadNew = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    const token = localStorage.getItem("token");
    const storeId = localStorage.getItem("activeStoreId");

    xhr.open("POST", "/api/media/upload");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    if (storeId) xhr.setRequestHeader("x-store-id", storeId);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const uploadData = JSON.parse(xhr.responseText);
          const videoRes = await apiFetch("/api/videos", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title: file.name, mediaUrl: uploadData.media.url, description: "" })
          });
          if (!videoRes.ok) throw new Error("Erro ao criar registro");
          const videoData = await videoRes.json();
          setLoading(false);
          setUploadProgress(0);
          navigate(`/dashboard/videos/edit/${videoData.video.id}`, { replace: true });
        } catch (err: any) {
          alert(err.message || "Erro inesperado.");
          setLoading(false);
        }
      } else {
        alert("Erro no upload do vídeo.");
        setLoading(false);
      }
    };

    xhr.onerror = () => {
      alert("Erro de conexão no upload.");
      setLoading(false);
    };

    xhr.send(formData);
  };

  const handleUploadThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("token");
      const uploadRes = await apiFetch("/api/media/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Erro no upload da capa");
      const uploadData = await uploadRes.json();
      setThumbnailUrl(uploadData.media.url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAutoThumb = async (imageUrl: string) => {
    try {
      setLoading(true);
      // O backend já subiu essa imagem pro R2 e nos devolveu a URL pronta.
      // Basta aceitá-la diretamente e salvar no video.
      setThumbnailUrl(imageUrl);
    } catch (err: any) {
      alert("Erro ao definir capa automática: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchProduct = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
         setSearchResults((await res.json()).products || []);
      }
    } finally {
      setSearching(false);
    }
  };

  const commitAddProduct = () => {
    if (!selectedProduct) return;
    let start = Math.floor(videoRef.current?.currentTime || 0);
    let end = start + 5;
    if (duration > 0 && end > duration) end = Math.floor(duration);

    if (hasOverlap(start, Math.min(start + 1, end))) {
       // Search for next available gap
       let foundGap = false;
       const sorted = [...timeline].sort((a,b) => a.startTime - b.startTime);
       for (let i = 0; i < sorted.length; i++) {
          const gapEnd = sorted[i+1] ? sorted[i+1].startTime : duration;
          if (gapEnd - sorted[i].endTime >= 3) {
             start = sorted[i].endTime;
             end = Math.min(start + 5, gapEnd);
             foundGap = true;
             break;
          }
       }
       if (!foundGap) {
         if (sorted[0].startTime >= 3) {
            start = 0;
            end = Math.min(3, sorted[0].startTime);
            foundGap = true;
         } else {
            alert("Não há espaço livre de pelo menos 3s na timeline. Arraste outros produtos e tente de novo.");
            return;
         }
       }
    } else {
       // clamp 
       const nextItem = timeline.find(t => t.startTime > start);
       if (nextItem && nextItem.startTime < end) end = nextItem.startTime;
    }
    
    const newItems = [...timeline, {
      productId: selectedProduct.id,
      product: selectedProduct,
      startTime: start,
      endTime: end
    }].sort((a,b) => a.startTime - b.startTime);
    
    setTimeline(newItems);
    setSelectedTimelineIndex(newItems.findIndex(t => t.productId === selectedProduct.id && t.startTime === start));
    setIsAddingMode(false);
    setSelectedProduct(null);
    setSearchQuery("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`/api/videos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title, description, mediaUrl, thumbnailUrl, productsList: timeline.map(t => ({ productId: t.productId, startTime: t.startTime, endTime: t.endTime }))
        })
      });
      if (res.ok) alert("Vídeo e timeline salvos com sucesso!");
    } finally {
      setSaving(false);
    }
  };

  if (id === "new" || !id) {
    return (
      <div className="flex flex-col gap-6 h-full max-w-3xl mx-auto w-full pt-10">
        <Button variant="ghost" className="w-fit" onClick={() => navigate("/dashboard/videos")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar a Vídeos
        </Button>
        <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-border">
            <h2 className="text-xl font-bold">Criar Novo Shoppable Video</h2>
            <p className="text-sm text-muted-foreground mt-1">Envie o vídeo matriz para começarmos a edição na timeline.</p>
          </div>
          <div className="p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 max-w-md mx-auto animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Upload className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <h3 className="text-xl font-bold mb-2">Processando Upload...</h3>
                <p className="text-sm text-muted-foreground mb-8 text-center leading-relaxed">
                  Por favor, não feche esta janela. Estamos processando o seu vídeo e isso pode levar alguns momentos dependendo do tamanho.
                </p>
                
                <div className="w-full space-y-3">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Enviando arquivo</span>
                    <span className="text-primary">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress > 0 ? uploadProgress : undefined} className="h-3 w-full" />
                </div>
              </div>
            ) : (
              <label className="relative overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-16 bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors group">
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-background border border-border flex items-center justify-center mb-5 group-hover:bg-primary/5 transition-colors shadow-sm">
                    <Video className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-base font-semibold text-foreground">
                    Clique para selecionar um vídeo do seu computador
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
                    Recomendamos formatos .mp4, .mov ou .webm. O vídeo servirá de base para a timeline interativa.
                  </p>
                </div>
                <input type="file" accept="video/*" className="hidden" onChange={handleUploadNew} disabled={loading} />
              </label>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex h-full items-center justify-center p-24 text-muted-foreground"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-5 h-full max-w-[1400px] mx-auto w-full pb-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border relative z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/videos")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-lg font-bold text-foreground line-clamp-1">NLE Studio • {title}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold flex items-center"><Video className="w-3 h-3 mr-1"/> Timeline Editor Pro</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar Alterações
        </Button>
      </div>

      <div className="flex flex-col gap-5 flex-1 min-h-0">
        
        {/* Top Row: Player & Metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bg-black/90 aspect-video rounded-xl overflow-hidden relative shadow-inner flex items-center justify-center border border-border/50">
            <video ref={videoRef} src={mediaUrl} poster={thumbnailUrl || undefined} className="w-full h-full object-contain" controls controlsList="nodownload" />
          </div>
          
          <div className="lg:col-span-4 flex flex-col">
            <Card className="border-border flex-1 flex flex-col">
              <CardHeader className="py-3 px-4 border-b border-border/50 shrink-0">
                <CardTitle className="text-sm">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5 flex-1 flex flex-col">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Título</label>
                  <input className="flex h-10 w-full rounded-md border border-input bg-white text-black px-3 py-2 text-sm focus:ring-1 focus:ring-primary shadow-sm" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Capa (Thumbnail)</label>
                  <div className="flex items-center gap-3">
                    {thumbnailUrl && <img src={thumbnailUrl} className="w-10 h-10 object-cover rounded-md border border-border shrink-0" />}
                    <label className="flex h-10 items-center justify-center rounded-md border border-input bg-secondary hover:bg-secondary/80 px-4 py-2 text-sm font-medium cursor-pointer transition-colors w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Escolher Imagem
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadThumbnail} />
                    </label>
                  </div>
                  
                  {/* GENERATED THUMBNAILS UI */}
                  {(generatingThumbs || autoThumbnails.length > 0) && (
                    <div className="mt-1">
                      <p className="text-[10px] text-muted-foreground uppercase mb-2 font-semibold">Ou escolha um frame do vídeo:</p>
                      {generatingThumbs ? (
                         <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin"/> Extraindo frames...</div>
                      ) : (
                         <div className="flex gap-2 relative overflow-x-auto pb-1 custom-scrollbar">
                           {autoThumbnails.map((t, i) => (
                              <img key={i} src={t} className="w-[72px] h-[44px] rounded-md object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all shrink-0 bg-muted border border-border" onClick={() => handleSelectAutoThumb(t)} />
                           ))}
                         </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Descrição</label>
                  <textarea className="flex flex-1 min-h-[120px] w-full rounded-md border border-input bg-white text-black px-3 py-2 text-sm focus:ring-1 focus:ring-primary resize-none shadow-sm" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Row: Advanced Timeline */}
        <div className="flex-1 flex flex-col min-w-0">
          
          <div className="bg-card rounded-xl border border-border flex flex-col grow shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center"><GripHorizontal className="w-4 h-4 mr-2 text-muted-foreground"/> Timeline de Produtos</h3>
              <div className="text-xs bg-muted/80 px-2 py-1 rounded font-mono font-medium shadow-inner tracking-widest text-primary">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* TRACK LAYER */}
            <div className="p-6 bg-muted/10 shrink-0 border-b border-border select-none">
               <div className="flex justify-between text-[10px] text-muted-foreground font-mono mb-1.5 px-0.5 opacity-60">
                  <span>00:00</span>
                  <span>{formatTime(duration)}</span>
               </div>
               
               <div 
                 ref={trackRef}
                 className="relative h-[100px] bg-background border border-border rounded-lg overflow-hidden cursor-text shadow-inner"
                 onPointerDown={handleTrackClick}
               >
                  {/* Grid background */}
                  <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px)] bg-[size:10%] pointer-events-none" />
                  
                  {/* Playhead Scrubber */}
                  <div 
                    className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-30 pointer-events-none"
                    style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  >
                    <div className="absolute -top-[2px] -left-[4px] w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-transparent border-t-red-500" />
                  </div>

                  {/* Drag Blocks */}
                  {timeline.map((item, idx) => {
                     const left = duration > 0 ? (item.startTime / duration) * 100 : 0;
                     const width = duration > 0 ? ((item.endTime - item.startTime) / duration) * 100 : 0;
                     const isSelected = selectedTimelineIndex === idx;
                     
                     return (
                       <div 
                         key={idx}
                         className={`absolute top-2 bottom-2 rounded-md transition-shadow group flex items-center overflow-hidden
                           ${isSelected ? 'bg-primary/20 ring-1 ring-primary shadow-[0_0_12px_rgba(59,130,246,0.2)] z-20' : 'bg-card ring-1 ring-border shadow-sm hover:ring-primary/50 hover:bg-muted/40 z-10'}
                           ${dragState?.index === idx ? 'cursor-grabbing opacity-90' : 'cursor-grab'}
                         `}
                         style={{ left: `${left}%`, width: `${width}%` }}
                         onPointerDown={(e) => handlePointerDown(e, idx, 'move')}
                       >
                         {/* LEFT RESIZER */}
                         <div 
                           className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-primary/20 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-background z-30"
                           onPointerDown={(e) => handlePointerDown(e, idx, 'resize-start')}
                         ><div className="w-[2px] h-4 bg-primary/50 rounded-full" /></div>
                         
                         {/* MIDDLE CONTENT */}
                         <div className="flex-1 flex gap-2 h-full items-center px-3 py-1 pointer-events-none overflow-hidden select-none">
                            {item.product?.imageLink && (
                              <img src={item.product.imageLink} className="h-full max-h-[60px] rounded aspect-square object-cover shadow-sm bg-muted border border-border/50 shrink-0 pointer-events-none" draggable={false}/>
                            )}
                            <div className="flex flex-col min-w-0 flex-1 opacity-90 hidden sm:flex pointer-events-none">
                              <span className="text-[12px] font-bold text-foreground truncate">{item.product?.title}</span>
                              <span className="text-[10px] text-muted-foreground font-mono truncate">{formatTime(item.startTime)} / {formatTime(item.endTime)}</span>
                            </div>
                         </div>

                         {/* RIGHT RESIZER */}
                         <div 
                           className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-primary/20 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-background z-30"
                           onPointerDown={(e) => handlePointerDown(e, idx, 'resize-end')}
                         ><div className="w-[2px] h-4 bg-primary/50 rounded-full" /></div>
                       </div>
                     )
                  })}
               </div>
               
               <div className="mt-3 flex gap-2">
                 <Button variant="secondary" size="sm" className="w-full text-xs font-semibold py-1 h-8" onClick={() => { setIsAddingMode(true); setSelectedTimelineIndex(null); }}>
                   <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar Bloco de Produto
                 </Button>
               </div>
            </div>

            {/* ACTION CENTER */}
            <div className="flex-1 bg-white dark:bg-background p-6 relative">
              
              {/* If Dragging something, show hint */}
              {dragState ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[1px] z-10 text-muted-foreground animate-in fade-in">
                  <div className="flex flex-col items-center">
                    <GripHorizontal className="w-8 h-8 mb-2 animate-bounce opacity-50" />
                    <p className="font-semibold text-sm">Arraste para ajustar o tempo na régua...</p>
                  </div>
                </div>
              ) : null}

              {/* State 1: Active Block Selected */}
              {selectedTimelineIndex !== null ? (
                <div className="flex gap-5 items-start animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-24 h-24 rounded-lg border-2 border-border bg-muted overflow-hidden shrink-0 shadow-sm">
                    {timeline[selectedTimelineIndex]?.product?.imageLink && <img src={timeline[selectedTimelineIndex].product?.imageLink} className="w-full h-full object-cover"/>}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <h4 className="font-semibold text-lg line-clamp-1">{timeline[selectedTimelineIndex]?.product?.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 flex-1">Você pode redimensionar clicando e arrastando as bordas diretas do bloco lá na timeline cinza. O sistema previne conflitos sozinho.</p>
                    
                    <div className="flex items-center gap-3 mt-4">
                      <Button variant="destructive" size="sm" onClick={() => { setTimeline(p => p.filter((_, i) => i !== selectedTimelineIndex)); setSelectedTimelineIndex(null); }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir da Cena
                      </Button>
                    </div>
                  </div>
                </div>
              ) : 
              
              /* State 2: Adding a NEW BLOCK */
              isAddingMode ? (
                <div className="flex flex-col sm:flex-row gap-8 animate-in fade-in duration-300">
                   <div className="flex-1 max-w-[400px]">
                     <h3 className="text-sm font-bold mb-3">Pesquisar Catálogo</h3>
                     <div className="flex gap-2">
                       <div className="relative flex-1">
                         <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground"/>
                         <input 
                           className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm focus:ring-primary" 
                           placeholder="Ex: Tênis Nike..."
                           value={searchQuery}
                           onChange={e => setSearchQuery(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleSearchProduct()}
                           autoFocus
                         />
                       </div>
                       <Button size="sm" onClick={handleSearchProduct} disabled={searching} variant="secondary">
                         {searching ? <Loader2 className="w-4 h-4 animate-spin"/> : "Enter"}
                       </Button>
                     </div>
                     
                     {searchResults.length > 0 && (
                       <div className="mt-3 border border-border rounded-lg overflow-hidden bg-background max-h-[140px] overflow-y-auto custom-scrollbar shadow-inner">
                         {searchResults.map(p => (
                           <button key={p.id} className="w-full text-left flex items-center gap-3 p-2.5 hover:bg-muted/50 border-b border-border/40 last:border-0 transition-colors" onClick={() => setSelectedProduct(p)}>
                             <img src={p.imageLink} className="w-8 h-8 rounded border object-cover shrink-0" />
                             <p className="text-xs font-medium truncate flex-1">{p.title}</p>
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                   
                   <div className="flex-1 flex flex-col justify-start border-l border-border pl-8">
                     <h3 className="text-sm font-bold mb-3">Vincular Seleção</h3>
                     {!selectedProduct ? (
                       <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded-md border border-border/50 text-center">Nenhum produto selecionado na lista.</p>
                     ) : (
                       <div className="space-y-4">
                         <div className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-lg border border-border/80 shadow-sm">
                           <img src={selectedProduct.imageLink} className="w-10 h-10 rounded object-cover shadow-sm" />
                           <p className="text-sm font-semibold truncate flex-1">{selectedProduct.title}</p>
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setSelectedProduct(null)}><X className="w-4 h-4"/></Button>
                         </div>
                         <Button className="w-full text-xs font-bold uppercase tracking-wider h-10" onClick={commitAddProduct}>
                           <Plus className="w-4 h-4 mr-2" />
                           Dropar na Timeline
                         </Button>
                         <p className="text-[10px] text-muted-foreground text-center">O sistema vai testar os intervalos de espaço vazio antes de injetar.</p>
                       </div>
                     )}
                   </div>
                </div>
              ) : 
              
              /* State 3: default empty state */
              (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center animate-in fade-in">
                  <GripVertical className="w-8 h-8 opacity-20 mb-3" />
                  <p className="text-sm max-w-sm">DICA: Clique num quadrado colorido lá encima e segure os cantos para esticar ou encolher facilmente o tempo em que o produto vai sumir.</p>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground)/0.3); border-radius: 4px; }
      `}}/>
    </div>
  );
}
