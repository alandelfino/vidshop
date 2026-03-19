import { BarChart3, ShoppingCart, Users, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const kpis = [
  { label: "Receita Total", value: "R$ 48.291", change: "+12,5%", up: true, icon: BarChart3 },
  { label: "Pedidos", value: "1.284", change: "+8,2%", up: true, icon: ShoppingCart },
  { label: "Clientes Ativos", value: "3.842", change: "+4,1%", up: true, icon: Users },
  { label: "Taxa de Conversão", value: "3,64%", change: "-0,3%", up: false, icon: TrendingUp },
];

const recentOrders = [
  { id: "#4521", customer: "Ana Lima", product: "Tênis Casual", value: "R$ 289,90", status: "Entregue" },
  { id: "#4520", customer: "Bruno Souza", product: "Camiseta Polo", value: "R$ 119,90", status: "Enviado" },
  { id: "#4519", customer: "Carla Rocha", product: "Calça Slim", value: "R$ 199,90", status: "Processando" },
  { id: "#4518", customer: "Daniel Melo", product: "Jaqueta Jeans", value: "R$ 349,90", status: "Entregue" },
  { id: "#4517", customer: "Erica Torres", product: "Vestido Floral", value: "R$ 229,90", status: "Cancelado" },
];

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Entregue: "default",
  Enviado: "outline",
  Processando: "secondary",
  Cancelado: "destructive",
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function DashboardHome() {
  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground mt-1">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.up ? <TrendingUp className="w-3 h-3 text-primary" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                    <span className={cn("text-xs font-medium", kpi.up ? "text-primary" : "text-destructive")}>
                      {kpi.change}
                    </span>
                    <span className="text-xs text-muted-foreground">vs. mês anterior</span>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <kpi.icon className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders table */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Pedidos Recentes</CardTitle>
              <CardDescription>Últimas 5 transações da loja</CardDescription>
            </div>
            <Button variant="outline" size="sm">Ver todos</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-border bg-muted/50">
                  {["Pedido", "Cliente", "Produto", "Valor", "Status"].map((h, i) => (
                    <th key={h} className={cn(
                      "text-left text-xs font-semibold text-muted-foreground px-6 py-3 uppercase tracking-wider",
                      i >= 2 && "hidden md:table-cell",
                      i >= 3 && "text-right"
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-medium text-foreground">{order.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar fallback={getInitials(order.customer)} size="sm" />
                        <span className="text-sm text-foreground font-medium whitespace-nowrap">{order.customer}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{order.product}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-foreground whitespace-nowrap">{order.value}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
