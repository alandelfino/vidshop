import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, X } from "lucide-react";

interface Product {
  id: number;
  title: string;
  imageLink?: string;
}

interface ProductMultiSelectProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}

export function ProductMultiSelect({
  selectedIds,
  onChange,
  placeholder = "Buscar produtos para adicionar..."
}: ProductMultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function fetchInitial() {
      if (!selectedIds || selectedIds.length === 0) {
        setSelectedProducts([]);
        return;
      }
      
      // Prevent refetching if our current objects perfectly match the requested IDs
      const currentIds = selectedProducts.map(p => p.id);
      if (selectedIds.length === currentIds.length && selectedIds.every(id => currentIds.includes(id))) {
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const res = await apiFetch(`/api/products?ids=${selectedIds.join(",")}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok && active) {
          const data = await res.json();
          setSelectedProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to fetch initial products:", err);
      }
    }
    fetchInitial();
    return () => { active = false; };
  }, [selectedIds]);

  useEffect(() => {
    let timeoutId: any;
    async function search() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      
      setSearching(true);
      try {
        const token = localStorage.getItem("token");
        const res = await apiFetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
           setSearchResults(data.products || []);
        }
      } finally {
        setSearching(false);
      }
    }

    if (searchQuery.trim() !== "") {
      timeoutId = setTimeout(search, 300);
    } else {
      setSearchResults([]);
    }

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (product: Product) => {
    if (!selectedIds.includes(product.id)) {
      const newIds = [...selectedIds, product.id];
      onChange(newIds);
      // Optimistic update
      setSelectedProducts([...selectedProducts, product]);
    }
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleRemove = (idToRemove: number) => {
    const newIds = selectedIds.filter(id => id !== idToRemove);
    onChange(newIds);
    setSelectedProducts(selectedProducts.filter(p => p.id !== idToRemove));
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="min-h-[36px] w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm flex flex-wrap gap-1 items-center focus-within:ring-1 focus-within:ring-ring">
        {selectedProducts.map((p) => (
          <Badge key={p.id} variant="secondary" className="flex items-center gap-1 text-[10px] font-medium h-6">
            <span className="truncate max-w-[120px]">{p.title}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(p.id);
              }}
              className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        ))}
        {/* Fill up remaining space with an invisible input placeholder or missing product IDs */}
        {selectedIds.filter(id => !selectedProducts.find(sp => sp.id === id)).map(missingId => (
           <Badge key={missingId} variant="secondary" className="flex items-center gap-1 text-[10px] h-6 border-red-200 bg-red-50 text-red-700">
             <span>Carregando ID: {missingId}...</span>
             <button
               type="button"
               onClick={() => handleRemove(missingId)}
               className="ml-1 rounded-full text-red-700/50 hover:text-red-700"
             >
               <X className="h-3 w-3" />
             </button>
           </Badge>
        ))}
        <input
          type="text"
          placeholder={selectedIds.length === 0 ? placeholder : ""}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="flex-1 bg-transparent border-none outline-none min-w-[120px] text-[11px] h-6"
        />
        {searching && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />}
      </div>

      {isOpen && searchQuery.trim().length > 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 max-h-[220px] overflow-y-auto">
          {searchResults.length === 0 && !searching ? (
            <div className="py-6 text-center text-[11px] text-muted-foreground">Nenhum produto encontrado.</div>
          ) : (
            <div className="flex flex-col p-1 gap-1">
              {searchResults.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                return (
                  <button
                    key={product.id}
                    className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors ${isSelected ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelect(product);
                    }}
                    disabled={isSelected}
                  >
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                      {product.imageLink ? (
                        <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 border bg-muted">
                          <img src={product.imageLink} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded flex-shrink-0 border bg-muted flex items-center justify-center">
                          <Search className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="truncate flex-1 text-left font-medium">{product.title}</span>
                      <span className="text-[9px] text-muted-foreground">ID: {product.id}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
