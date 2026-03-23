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
        description: "Perfeito para lojas em crescimento.",
        borderColor: "border-blue-500",
        accentColor: "text-blue-500",
        icon: <Rocket className="w-5 h-5 text-blue-500" />,
        features: ["2 Carrosseis", "50 Vídeos", "10.000 views / mês", "Suporte prioritário"],
    },
    ultra: {
        name: "Ultra",
        price: "R$ 99,90/mês",
        description: "O melhor custo-benefício para volume.",
        borderColor: "border-purple-600",
        accentColor: "text-purple-600",
        badge: "Mais Escolhido",
        icon: <Gem className="w-5 h-5 text-purple-600" />,
        features: ["Carrosseis ilimitados", "Vídeos ilimitados", "50.000 views / mês", "Analytics avançado"],
    },
    gold: {
        name: "Gold",
        price: "R$ 299,90/mês",
        description: "Experiência completa sem limites.",
        borderColor: "border-amber-500",
        accentColor: "text-amber-600",
        badge: "Enterprise",
        icon: <Crown className="w-5 h-5 text-amber-500" />,
        features: ["Tudo ilimitado", "Views ilimitadas", "Suporte VIP 24/7", "Customização total"],
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
                    <h2 className="text-xl font-bold tracking-tight">Crie sua nova loja</h2>
                    <p className="text-sm text-muted-foreground">Comece agora com 15 dias de teste totalmente grátis.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 flex flex-col gap-10">

                {/* Store info */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-base font-semibold">1. Informações da Loja</h3>
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
                                className="bg-muted/30"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-muted-foreground" /> Domínio onde o carrossel será exibido
                            </label>
                            <Input
                                placeholder="Ex: minhaloja.com.br"
                                value={domain}
                                onChange={e => setDomain(e.target.value)}
                                disabled={isPending}
                                className="bg-muted/30"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Importante: Seus vídeos só carregarão neste domínio por segurança.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Plan selector */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-base font-semibold">2. Escolha o nível do seu teste grátis (15 dias)</h3>
                    <p className="text-xs text-muted-foreground -mt-3">Você terá todos os recursos do plano escolhido durante o período de teste.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                        {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([id, p]) => {
                            const isSelected = plan === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setPlan(id)}
                                    className={`relative text-left rounded-xl border-2 p-5 flex flex-col gap-3 transition-all duration-200 focus:outline-none
                    ${isSelected
                                            ? `${p.borderColor} bg-background shadow-[0_0_25px_rgba(0,0,0,0.08)] scale-[1.05] z-10 ring-4 ring-primary/5`
                                            : "border-border bg-muted/10 opacity-70 hover:opacity-100 hover:border-muted-foreground/30"
                                        }
                  `}
                                >
                                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-semibold px-4 py-1 rounded-full uppercase tracking-tighter shadow-sm z-20 transition-colors bg-green-500`}>
                                        15 dias grátis
                                    </span>

                                    {p.badge && isSelected && (
                                        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm">
                                            {p.badge}
                                        </span>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                                            {p.icon}
                                        </div>
                                        {isSelected && (
                                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <p className={`font-black text-base tracking-tight ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>{p.name}</p>
                                        <div className="flex items-baseline gap-1">
                                            <p className={`text-lg font-black ${p.accentColor}`}>{p.price.split('/')[0]}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium">/{p.price.split('/')[1]}</p>
                                        </div>
                                        <p className="text-[11px] leading-snug text-muted-foreground mt-1 font-medium">{p.description}</p>
                                    </div>

                                    <div className="h-px bg-border/50 my-1" />

                                    <ul className="space-y-1.5">
                                        {p.features.map(f => (
                                            <li key={f} className="flex items-start gap-2 text-[11px] font-medium text-foreground/80">
                                                <Check className={`w-3.5 h-3.5 shrink-0 mt-px ${isSelected ? "text-green-500" : "text-muted-foreground/50"}`} />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                        <X className="w-4 h-4" /> {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-center gap-4 py-6 border-t border-border mt-4">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} className="text-muted-foreground">Voltar</Button>
                    <Button
                        type="submit"
                        size="lg"
                        className="px-12 py-6 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                        disabled={isPending || !name.trim() || !domain.trim()}
                    >
                        {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2 fill-current" />}
                        {isPending ? "Configurando sua loja..." : "Iniciar teste grátis"}
                    </Button>
                </div>
                <p className="text-center text-[10px] text-muted-foreground -mt-6">
                    Nenhum cartão de crédito necessário agora. Cancele quando quiser.
                </p>
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
        gold: "border-yellow-400/60 text-yellow-500 bg-yellow-500/10",
        ultra: "border-purple-400/60 text-purple-500 bg-purple-500/10",
        pro: "border-blue-400/60 text-blue-500 bg-blue-500/10",
        free: "border-border text-muted-foreground bg-muted/50",
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
                            className={`cursor-pointer transition-all hover:border-primary/50 relative overflow-hidden ${activeStore?.id === store.id ? "border-primary shadow-sm bg-primary/5" : ""
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
