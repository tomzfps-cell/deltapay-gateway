import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/lib/i18n';
import { Plus, MoreVertical, Copy, ExternalLink, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'ARS' | 'BRL' | 'USD';
  active: boolean;
  salesCount: number;
  totalRevenue: number;
}

const mockProducts: Product[] = [
  { id: 'prod_001', name: 'Plan Mensual', description: 'Acceso completo por 30 días', price: 15000, currency: 'ARS', active: true, salesCount: 156, totalRevenue: 2340000 },
  { id: 'prod_002', name: 'Plan Anual', description: 'Acceso completo por 1 año con 20% de descuento', price: 144000, currency: 'ARS', active: true, salesCount: 42, totalRevenue: 6048000 },
  { id: 'prod_003', name: 'Consultoría Individual', description: 'Sesión de 1 hora personalizada', price: 25000, currency: 'ARS', active: true, salesCount: 28, totalRevenue: 700000 },
  { id: 'prod_004', name: 'Curso Completo', description: 'Acceso de por vida al curso online', price: 89000, currency: 'ARS', active: false, salesCount: 89, totalRevenue: 7921000 },
];

export const Products: React.FC = () => {
  const { t, locale, currency: displayCurrency } = useApp();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('products')}</h1>
          <p className="text-muted-foreground">
            Crea y gestiona tus productos y links de pago
          </p>
        </div>
        <Button className="gap-2 btn-primary-glow">
          <Plus className="h-4 w-4" />
          {t('createProduct')}
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockProducts.map((product) => (
          <div
            key={product.id}
            className="glass rounded-xl p-6 transition-all hover:border-primary/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{product.name}</h3>
                  {!product.active && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-strong">
                  <DropdownMenuItem className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <QrCode className="h-4 w-4" />
                    Ver QR
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="stat-value text-2xl">
                {formatCurrency(product.price, product.currency, locale)}
              </span>
            </div>

            <div className="mt-4 flex gap-4 border-t border-border/50 pt-4 text-sm">
              <div>
                <p className="text-muted-foreground">Ventas</p>
                <p className="font-mono font-medium">{product.salesCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ingresos</p>
                <p className="font-mono font-medium text-success">
                  {formatCurrency(product.totalRevenue, product.currency, locale)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;
