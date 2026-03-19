import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  ShoppingBag,
  Menu,
  ImageIcon,
  PackageOpen,
  ArrowDownToLine,
  PlaySquare,
  LayoutGrid
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AuthUser {
  id: number;
  name: string;
  email: string;
}

const navGroups = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { icon: PlaySquare, label: "Vídeos", path: "/dashboard/videos" },
      { icon: LayoutGrid, label: "Carrosseis", path: "/dashboard/carousels" },
      { icon: ImageIcon, label: "Mídias", path: "/dashboard/media" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { icon: PackageOpen, label: "Produtos", path: "/dashboard/products" },
      { icon: ArrowDownToLine, label: "Importar", path: "/dashboard/import" },
    ],
  },
];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/"); return; }

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
        else { localStorage.removeItem("token"); navigate("/"); }
      })
      .catch(() => { localStorage.removeItem("token"); navigate("/"); })
      .finally(() => setLoading(false));
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  let title = "Dashboard";
  let subtitle = "Visão geral da sua loja";
  
  if (path === "/dashboard/media") { title = "Mídias"; subtitle = "Gerencie imagens e vídeos"; }
  else if (path === "/dashboard/products") { title = "Produtos"; subtitle = "Gerencie seu inventário importado"; }
  else if (path === "/dashboard/import") { title = "Importação"; subtitle = "Adicione produtos via feed XML"; }
  else if (path.startsWith("/dashboard/videos")) { title = "Shoppable Videos"; subtitle = "Crie experiências interativas para seus clientes"; }

  const Sidebar = (
    <aside className="flex flex-col h-full w-64 bg-foreground text-white">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <ShoppingBag className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold tracking-tight">onstore</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-3 mb-2">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 w-full text-left min-h-[40px]",
                    path === item.path
                      ? "bg-white/10 text-white font-medium border-l-2 border-primary"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md">
          {loading ? (
            <Skeleton className="w-8 h-8 rounded-full bg-white/10" />
          ) : (
            <Avatar fallback={user ? getInitials(user.name) : "?"} size="sm" className="bg-primary/20 text-primary shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {loading ? (
              <Skeleton className="h-3 w-24 bg-white/10" />
            ) : (
              <>
                <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-white/40 truncate">{user?.email}</p>
              </>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-destructive transition-colors duration-150 p-1 rounded"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">{Sidebar}</div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex">{Sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 px-4 sm:px-6 lg:px-8 h-16 border-b border-border bg-card shrink-0">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">{subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  Olá, <span className="font-medium text-foreground">{user?.name.split(" ")[0]}</span>
                </span>
                <Avatar fallback={user ? getInitials(user.name) : "?"} size="sm" />
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
