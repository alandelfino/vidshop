import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Video,
  Trash2,
  Loader2,
  FolderOpen,
  X,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

type Filter = "all" | "image" | "video";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getToken() {
  return localStorage.getItem("token") ?? "";
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchMedia() {
    setLoading(true);
    try {
      const res = await fetch("/api/media", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setItems(data.media ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMedia();
  }, []);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setUploadError("Tipo não permitido. Envie somente imagens ou vídeos.");
      return;
    }
    setUploadError("");
    setUploading(true);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Erro ao fazer upload.");
        return;
      }
      setItems((prev) => [data.media, ...prev]);
    } catch {
      setUploadError("Erro de conexão. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    // Upload all files sequentially
    Array.from(files).forEach((f) => uploadFile(f));
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await fetch(`/api/media/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setItems((prev) => prev.filter((m) => m.id !== id));
      if (preview?.id === id) setPreview(null);
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = items.filter((item) => {
    if (filter === "image") return item.mimeType.startsWith("image/");
    if (filter === "video") return item.mimeType.startsWith("video/");
    return true;
  });

  const imageCount = items.filter((i) => i.mimeType.startsWith("image/")).length;
  const videoCount = items.filter((i) => i.mimeType.startsWith("video/")).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mídias</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} arquivo{items.length !== 1 ? "s" : ""} · {imageCount} imagens · {videoCount} vídeos
          </p>
        </div>
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="min-h-[44px] w-full sm:w-auto"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? "Enviando..." : "Fazer upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-center justify-between gap-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-4 py-2.5">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError("")} className="text-destructive hover:opacity-70 transition-opacity">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg px-6 py-8 flex flex-col items-center gap-3 cursor-pointer",
          "transition-all duration-150",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/40"
        )}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {dragging ? "Solte para fazer upload" : "Arraste arquivos aqui"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ou clique para selecionar · Imagens e vídeos · Até 100 MB
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {(["all", "image", "video"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all duration-150 border-b-2 -mb-px",
              filter === f
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" && "Todos"}
            {f === "image" && <><ImageIcon className="w-3.5 h-3.5" />Imagens</>}
            {f === "video" && <><Video className="w-3.5 h-3.5" />Vídeos</>}
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 font-normal">
              {f === "all" ? items.length : f === "image" ? imageCount : videoCount}
            </span>
          </button>
        ))}
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FolderOpen className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "Nenhuma mídia encontrada" : `Nenhum(a) ${filter === "image" ? "imagem" : "vídeo"} encontrado(a)`}
          </p>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Fazer upload
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => {
            const isImage = item.mimeType.startsWith("image/");
            const isDeleting = deletingId === item.id;

            return (
              <div
                key={item.id}
                className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted cursor-pointer"
                onClick={() => setPreview(item)}
              >
                {/* Thumbnail */}
                {isImage ? (
                  <img
                    src={item.url}
                    alt={item.originalName}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-foreground/5">
                    <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex flex-col justify-between p-2.5 opacity-0 group-hover:opacity-100">
                  {/* Top: delete button */}
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      disabled={isDeleting}
                      className="w-7 h-7 rounded-md bg-destructive/90 hover:bg-destructive flex items-center justify-center transition-colors duration-150"
                    >
                      {isDeleting
                        ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                        : <Trash2 className="w-3 h-3 text-white" />
                      }
                    </button>
                  </div>

                  {/* Bottom: file info */}
                  <div>
                    <p className="text-white text-xs font-medium truncate leading-tight">
                      {item.originalName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-xs py-0 px-1.5 bg-white/20 text-white border-0">
                        {isImage ? "Imagem" : "Vídeo"}
                      </Badge>
                      <span className="text-white/70 text-xs">{formatBytes(item.size)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative bg-card rounded-xl overflow-hidden max-w-3xl w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{preview.originalName}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(preview.size)} · {preview.mimeType}</p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="ml-4 text-muted-foreground hover:text-foreground transition-colors duration-150 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-auto bg-muted/30 flex items-center justify-center p-4">
              {preview.mimeType.startsWith("image/") ? (
                <img
                  src={preview.url}
                  alt={preview.originalName}
                  className="max-w-full max-h-full object-contain rounded"
                />
              ) : (
                <video
                  src={preview.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[60vh] rounded"
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Enviado em {new Date(preview.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </p>
              <Button
                variant="destructive"
                size="sm"
                disabled={deletingId === preview.id}
                onClick={() => handleDelete(preview.id)}
              >
                {deletingId === preview.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Trash2 className="w-3 h-3" />
                }
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
