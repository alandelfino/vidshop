import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import { Loader2, Plus, Edit, Trash2, Video, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "./DashboardPage";
import { useStore } from "../context/StoreContext";

const PLANS = {
  free: { name: "Free", limits: { videos: 10 } },
  pro: { name: "Pro", limits: { videos: 50 } },
  ultra: { name: "Ultra", limits: { videos: 999999 } },
  gold: { name: "Gold", limits: { videos: 999999 } }
};

interface ShoppableVideo {
  id: number;
  mediaUrl: string;
  thumbnailUrl: string | null;
  title: string;
  description: string | null;
  tags: string[] | null;
  createdAt: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<ShoppableVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const user = useAuthUser();
  const { activeStore } = useStore();

  const handleNewVideo = () => {
    const plan = PLANS[(activeStore?.plan as keyof typeof PLANS) || "free"];
    if (videos.length >= plan.limits.videos) {
      if (window.confirm(`Oops, você atingiu o limite de ${plan.limits.videos} vídeos no plano ${plan.name}. Faça o upgrade agora para expandir!`)) {
        navigate("/dashboard/billing");
      }
      return;
    }
    navigate("/dashboard/videos/new");
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch("/api/videos", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Certeza que deseja excluir este vídeo interactivo?")) return;
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`/api/videos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(prev => prev.filter(v => v.id !== id));
    } catch {
      alert("Erro ao excluir vídeo.");
    }
  };

  const filtered = videos.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6 h-full max-w-7xl mx-auto w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Vídeos Interativos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus vídeos "Shoppable" amarrados com produtos reais.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar vídeos..."
              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={handleNewVideo}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Vídeo
          </Button>
        </div>
      </div>

      {loading ? (
         <div className="flex flex-col items-center justify-center p-24 text-muted-foreground">
           <Loader2 className="w-8 h-8 animate-spin" />
           <p className="mt-4 text-sm font-medium">Carregando seus vídeos...</p>
         </div>
      ) : videos.length === 0 ? (
         <div className="flex flex-col items-center justify-center p-24 text-center border border-dashed rounded-xl border-border bg-muted/10">
           <Video className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
           <h3 className="text-lg font-semibold text-foreground">Nenhum vídeo</h3>
           <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
             Você ainda não enviou nenhum vídeo com produtos relacionados. Crie seu primeiro Shoppable Video apertando abaixo.
           </p>
           <Button onClick={handleNewVideo}>
             <Plus className="w-4 h-4 mr-2" />
             Criar Primeiro Vídeo
           </Button>
         </div>
      ) : (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(video => (
              <Card key={video.id} className="overflow-hidden group flex flex-col hover:shadow-md transition-all border-border bg-card">
                 <div className="relative aspect-video bg-black overflow-hidden pointer-events-none">
                    <video 
                      src={video.mediaUrl} 
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                      preload="metadata"
                      poster={video.thumbnailUrl || undefined}
                      muted
                      loop
                      onMouseEnter={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                      onMouseLeave={e => {
                        const target = e.target as HTMLVideoElement;
                        target.pause();
                        target.currentTime = 0;
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-3 pt-8 pb-3 text-white transition-transform duration-300">
                      <p className="font-semibold text-sm line-clamp-1">{video.title}</p>
                      {video.tags && video.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 opacity-80">
                          {video.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded-md bg-white/20 text-[9px] font-bold backdrop-blur-sm border border-white/10 uppercase">
                              {tag}
                            </span>
                          ))}
                          {video.tags.length > 3 && <span className="text-[9px] font-bold text-white/60">+{video.tags.length - 3}</span>}
                        </div>
                      )}
                    </div>
                 </div>
                 <div className="p-4 flex-1 flex flex-col pb-4">
                    <p className="text-xs text-muted-foreground mb-3 flex-1 line-clamp-2">
                       {video.description || "Sem descrição."}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                       <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                         {new Date(video.createdAt).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}
                       </span>
                       <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                         <Button variant="secondary" size="icon" className="h-8 w-8 hover:bg-primary hover:text-primary-foreground" onClick={() => navigate(`/dashboard/videos/edit/${video.id}`)} title="Editar Timeline">
                           <Edit className="w-3.5 h-3.5" />
                         </Button>
                         <Button variant="secondary" size="icon" className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(video.id)} title="Excluir">
                           <Trash2 className="w-3.5 h-3.5" />
                         </Button>
                       </div>
                    </div>
                 </div>
              </Card>
            ))}
         </div>
      )}
    </div>
  );
}
