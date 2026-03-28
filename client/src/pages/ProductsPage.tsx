import { apiFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import { Search, Loader2, Edit, Trash2, PackageOpen, X, ImageIcon, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Product {
  id: number;
  externalId: string;
  title: string;
  description: string | null;
  price: string | null;
  imageLink: string | null;
  link: string | null;
  brand: string | null;
  availability: string | null;
  condition: string | null;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(50);
  const [pageInput, setPageInput] = useState("1");

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setPage(p);
    } else {
      setPageInput(page.toString());
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Voltamos para a página 1 ao buscar algo novo
    }, 50);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`/api/products?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, limit, debouncedSearch]);    // Refetch when page or search query changes

  const handleDelete = async (id: number) => {
    if (!window.confirm("Certeza que deseja remover este produto?")) return;
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(prev => prev.filter(p => p.id !== id));
      setTotalItems(prev => prev - 1);
      toast.success("Produto removido com sucesso!");
      fetchProducts(); // Refresh to keep pagination/sorting correct
    } catch {
      toast.error("Erro ao remover produto.");
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const isNew = !editingProduct.id || editingProduct.id <= 0;
      const method = isNew ? "POST" : "PUT";
      const url = isNew ? "/api/products" : `/api/products/${editingProduct.id}`;
      
      const res = await apiFetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(editingProduct),
      });
      if (res.ok) {
        const data = await res.json();
        if (isNew) {
          setProducts(prev => [data.product, ...prev]);
          setTotalItems(prev => prev + 1);
        } else {
          setProducts(prev => prev.map(p => p.id === data.product.id ? data.product : p));
        }
        setEditingProduct(null);
        toast.success(isNew ? "Produto cadastrado com sucesso!" : "Produto atualizado com sucesso!");
        fetchProducts(); // Always refresh to ensure consistency with backend
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao salvar o produto.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Certeza que deseja remover ${selectedIds.length} produtos?`)) return;
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch("/api/products/bulk-delete", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
        setTotalItems(prev => prev - selectedIds.length);
        setSelectedIds([]);
        toast.success("Produtos removidos com sucesso!");
        fetchProducts(); // Refresh to sync with backend after bulk deletion
      } else {
        toast.error("Erro ao remover produtos.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col gap-6 h-full max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Produtos Importados</h1>
          <p className="text-sm text-muted-foreground">
            {totalItems} produtos registrados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isSaving} className="animate-in fade-in zoom-in-95 duration-200">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir {selectedIds.length} {selectedIds.length === 1 ? "selecionado" : "selecionados"}
            </Button>
          )}
          <Button size="sm" onClick={() => setEditingProduct({ id: 0, externalId: "", title: "", description: "", price: "", imageLink: "", link: "", brand: "", availability: "in stock", condition: "new", createdAt: "" })}>
            <PackageOpen className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchProducts()} disabled={loading}>
            <RotateCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por ID ou Nome..."
              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden relative shadow-sm">
        {loading && products.length === 0 ? (
          <div className="flex-1 flex flex-col gap-3 p-6 justify-center items-center h-64">
             <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
             <p className="text-sm font-medium text-muted-foreground">Carregando catálogo...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-64">
            <PackageOpen className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
            <h3 className="text-lg font-semibold text-foreground">Sem produtos nesta lista</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Nenhum resultado foi encontrado na página {page} para sua busca atual.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {loading && (
              <div className="absolute inset-0 z-20 bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur border-b border-border shadow-sm">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                        checked={products.length > 0 && selectedIds.length === products.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold text-left text-muted-foreground w-16">Img</th>
                    <th className="px-4 py-3 font-semibold text-left text-muted-foreground">Produto</th>
                    <th className="px-4 py-3 font-semibold text-left text-muted-foreground">Preço</th>
                    <th className="px-4 py-3 font-semibold text-left text-muted-foreground">Marca</th>
                    <th className="px-4 py-3 font-semibold text-left text-muted-foreground">Estoque</th>
                    <th className="px-4 py-3 font-semibold text-right text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map(p => (
                    <tr key={p.id} className={cn("hover:bg-muted/30 transition-colors group", selectedIds.includes(p.id) && "bg-primary/5")}>
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {p.imageLink ? (
                          <div className="w-10 h-10 rounded overflow-hidden border border-border bg-muted flex items-center justify-center">
                            <img src={p.imageLink} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground opacity-50" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm font-medium text-foreground line-clamp-1" title={p.title}>{p.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{p.externalId}</p>
                      </td>
                      <td className="px-4 py-3">
                        {p.price ? <span className="font-medium whitespace-nowrap">{p.price}</span> : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground max-w-[120px] truncate block" title={p.brand || ""}>{p.brand || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.availability?.includes("in stock") ? "default" : "secondary"} className="whitespace-nowrap">
                          {p.availability || "N/A"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingProduct(p)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="border-t border-border px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
              <div className="text-xs text-muted-foreground flex items-center gap-3">
                <span>
                  Mostrando do {totalItems === 0 ? 0 : (page - 1) * limit + 1} ao {Math.min(page * limit, totalItems)} de {totalItems} produtos
                </span>
                {loading && <Loader2 className="w-3 h-3 animate-spin inline" />}
                
                <div className="flex items-center gap-2 border-l border-border pl-3">
                  <span className="hidden sm:inline">Itens por página:</span>
                  <select 
                    className="h-7 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    disabled={loading}
                  >
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={40}>40</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page <= 1 || loading} 
                  onClick={() => setPage(page - 1)}
                  title="Anterior"
                  className="px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <form onSubmit={handlePageSubmit} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground hidden sm:inline">Página</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages || 1}
                    className="flex h-8 w-14 text-center rounded-md border border-input bg-background px-1 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={handlePageSubmit}
                    disabled={loading || totalPages === 0}
                  />
                  <span className="text-xs text-muted-foreground hidden sm:inline">de {totalPages}</span>
                </form>

                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page >= totalPages || loading} 
                  onClick={() => setPage(page + 1)}
                  title="Próxima"
                  className="px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setEditingProduct(null)}>
          <Card className="w-full max-w-lg shadow-xl shadow-black/10 animate-in zoom-in-95 duration-200" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <form onSubmit={handleSave}>
              <CardHeader className="flex-row items-center justify-between pb-0">
                <div>
                  <CardTitle className="text-lg">{editingProduct.id > 0 ? "Editar Produto" : "Cadastrar Novo Produto"}</CardTitle>
                  {editingProduct.id > 0 && <CardDescription className="font-mono mt-1">ID: {editingProduct.externalId}</CardDescription>}
                </div>
                <Button variant="ghost" size="icon" className="-mr-2 -mt-4 text-muted-foreground" type="button" onClick={() => setEditingProduct(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={editingProduct.title || ""}
                    onChange={e => setEditingProduct({...editingProduct, title: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Link do Produto (URL)</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={editingProduct.link || ""}
                    onChange={e => setEditingProduct({...editingProduct, link: e.target.value})}
                    placeholder="https://sualoja.com/produtos/..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Link da Imagem URL</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={editingProduct.imageLink || ""}
                    onChange={e => setEditingProduct({...editingProduct, imageLink: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preço (ex: 99.99 BRL)</label>
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={editingProduct.price || ""}
                      onChange={e => setEditingProduct({...editingProduct, price: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Marca</label>
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={editingProduct.brand || ""}
                      onChange={e => setEditingProduct({...editingProduct, brand: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição</label>
                  <textarea
                    className="flex min-h-[100px] w-full items-start rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={editingProduct.description || ""}
                    onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                  />
                </div>
              </CardContent>
              <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-2 rounded-b-xl">
                <Button variant="outline" type="button" onClick={() => setEditingProduct(null)} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isSaving ? "Salvando..." : (editingProduct.id > 0 ? "Salvar Alterações" : "Cadastrar Produto")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
