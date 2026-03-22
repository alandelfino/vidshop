import { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
import {
  Loader2, Store as StoreIcon, Plus, Check, X,
  Zap, Rocket, Gem, Crown, Globe, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { useNavigate } from "react-router-dom";

// ─── Plan definitions ─────────────────────────────────────────────────────────

type PlanId = "pro" | "ultra" | "gold";

const PLANS: Record<PlanId, {
  name: string;
  price: string;
  description: string;
  borderColor: string;
  accentColor: string;
  badge?: string;
  icon: React.ReactNode;
  features: string[];
}> = {

  pro: {
    name: "Pro",
    price: "R$ 39,90/mês",
    description: "Para lojas que estão crescendo rápido.",
    borderColor: "border-blue-500",
    accentColor: "text-blue-500",
    badge: "Popular",
    icon: <Rocket className="w-5 h-5 text-blue-500" />,
    features: ["2 Carrosseis", "50 Vídeos", "10.000 views / mês", "Suporte prioritário"],
  },
  ultra: {
    name: "Ultra",
    price: "R$ 99,90/mês",
    description: "Recursos ilimitados para alto volume.",
    borderColor: "border-purple-500",
    accentColor: "text-purple-500",
    badge: "Recomendado",
    icon: <Gem className="w-5 h-5 text-purple-500" />,
    features: ["Carrosseis ilimitados", "Vídeos ilimitados", "50.000 views / mês", "Analytics avançado"],
  },
  gold: {
    name: "Gold",
    price: "R$ 299,90/mês",
    description: "Sem limites. Ideal para grandes operações.",
    borderColor: "border-yellow-500",
    accentColor: "text-yellow-500",
    icon: <Crown className="w-5 h-5 text-yellow-500" />,
    features: ["Tudo ilimitado", "Views ilimitadas", "Suporte VIP 24/7", "Integrações exclusivas"],
  },
};

// ─── Create Store Modal ────────────────────────────────────────────────────────

function CreateStoreModal({ onClose, onCreated }: { onClose: () => void; onCreated: (store: any) => void }) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [plan, setPlan] = useState<PlanId>("pro");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !domain.trim()) {
      setError("Nome e domínio são obrigatórios.");
      return;
    }
    setError("");
    setIsPending(true);
    try {
      const res = await apiFetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, allowedDomain: domain, plan }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data.store);
      } else {
        setError(data.error || "Erro ao criar loja.");
      }
    } catch {
      setError("Erro na conexão.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Criar Nova Loja</h2>
          <p className="text-sm text-muted-foreground">Configure seu novo ambiente de vídeos interativos.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col gap-10">

        {/* Store info */}
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold">Informações da Loja</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" /> Nome da Loja
              </label>
              <Input
                placeholder="Ex: Minha Loja de Roupas"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" /> Domínio (obrigatório)
              </label>
              <Input
                placeholder="Ex: minhaloja.com.br"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Apenas requisições deste domínio poderão exibir seus carrosseis.
              </p>
            </div>
          </div>
        </div>

        {/* Plan selector */}
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold">Escolha o Plano</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([id, p]) => {
              const isSelected = plan === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlan(id)}
                  className={`relative text-left rounded-xl border-2 p-5 flex flex-col gap-3 transition-all duration-150 focus:outline-none
                    ${p.borderColor}
                    ${isSelected ? "bg-primary/5 shadow-lg scale-[1.02]" : "bg-muted/20 hover:bg-muted/40"}
                  `}
                >
                  {!isSelected && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                      14 dias grátis
                    </span>
                  )}
                  {p.badge && isSelected && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                      {p.badge}
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">{p.icon}</div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{p.name}</p>
                    <p className={`text-sm font-semibold ${p.accentColor}`}>{p.price}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                  </div>
                  <ul className="space-y-1">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-px" />{f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Todas as lojas incluem <strong>14 dias de teste grátis automático</strong> sem necessidade de cartão de crédito no momento da criação.
          </p>
        </div>

        {/* Error */}
        {error && <p className="text-sm text-destructive font-medium">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button type="submit" disabled={isPending || !name.trim() || !domain.trim()}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {isPending ? "Criando..." : "Criar Loja"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StoresPage() {
  const { stores, activeStore, setActiveStore, fetchStores, loading } = useStore();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchStores(); }, []);

  const handleSelectStore = (store: any) => {
    setActiveStore(store);
    navigate("/dashboard");
  };

  const handleCreated = async (store: any) => {
    await fetchStores();
    setActiveStore(store);
    setShowModal(false);
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-muted-foreground w-full h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="mt-4 text-sm">Carregando lojas...</p>
      </div>
    );
  }

  const planColors: Record<string, string> = {
    gold:  "border-yellow-400/60 text-yellow-500 bg-yellow-500/10",
    ultra: "border-purple-400/60 text-purple-500 bg-purple-500/10",
    pro:   "border-blue-400/60 text-blue-500 bg-blue-500/10",
    free:  "border-border text-muted-foreground bg-muted/50",
  };

  return (
    <div className="max-w-5xl mx-auto w-full py-10 px-4">
      {showModal && <CreateStoreModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Minhas Lojas</h1>
          <p className="text-muted-foreground mt-2">
            Selecione a loja que deseja gerenciar ou crie uma nova.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Criar Nova Loja
        </Button>
      </div>

      {/* Store list */}
      {stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-xl bg-muted/10 text-center">
          <StoreIcon className="w-12 h-12 text-muted-foreground opacity-25 mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma loja ainda</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs">
            Crie sua primeira loja para começar a gerenciar seus vídeos e carrosseis.
          </p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Criar Primeira Loja
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map(store => (
            <Card
              key={store.id}
              className={`cursor-pointer transition-all hover:border-primary/50 relative overflow-hidden ${
                activeStore?.id === store.id ? "border-primary shadow-sm bg-primary/5" : ""
              }`}
              onClick={() => handleSelectStore(store)}
            >
              {activeStore?.id === store.id && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground p-1 rounded-bl-lg">
                  <Check className="w-4 h-4" />
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <StoreIcon className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  {store.plan && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${planColors[store.plan] || planColors.free}`}>
                      {store.plan}
                    </span>
                  )}
                </div>
                <CardTitle>{store.name}</CardTitle>
                <CardDescription className="line-clamp-1">
                  {store.allowedDomain || "Sem domínio configurado"}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
