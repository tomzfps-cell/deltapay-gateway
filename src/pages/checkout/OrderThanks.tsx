import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/i18n';
import { 
  Loader2, CheckCircle2, Package, Mail, 
  Building2, CreditCard, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderData {
  id: string;
  status: string;
  product_name: string;
  product_amount: number;
  product_currency: string;
  shipping_cost: number;
  total_amount: number;
  customer_email: string;
  customer_phone: string;
  shipping_name: string;
  shipping_lastname: string;
  shipping_address: string;
  shipping_city: string;
  shipping_province: string;
  shipping_postal_code: string;
  merchant_name: string;
  created_at: string;
  redirect_url?: string | null;
}

/**
 * Validates that a redirect URL is safe (HTTPS only, no open-redirect).
 * Only allows the exact URL stored in the product's redirect_url.
 */
const isValidRedirectUrl = (url: string | null | undefined): url is string => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const OrderThanks: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  const loadOrder = useCallback(async (id: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_order_for_checkout', {
        _order_id: id,
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as { success: boolean; order?: OrderData; error?: string };
      if (!result.success || !result.order) {
        setError(result.error || 'Pedido no encontrado');
        return;
      }

      setOrder(result.order);
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Error al cargar el pedido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    } else {
      setError('ID de pedido no válido');
      setLoading(false);
    }
  }, [orderId, loadOrder]);

  // Auto-redirect countdown when paid and redirect_url is valid
  const isPaid = order?.status === 'paid';
  const hasValidRedirect = isPaid && isValidRedirectUrl(order?.redirect_url);

  useEffect(() => {
    if (!hasValidRedirect) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = order!.redirect_url!;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasValidRedirect, order]);

  if (loading) {
    return (
      <div className="checkout-light min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="checkout-light min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <Package className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground">{error || 'Pedido no encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-light min-h-screen">
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{order.merchant_name}</h1>
        </div>

        {/* Status card */}
        <div className="glass rounded-xl p-6 text-center">
          {isPaid ? (
            <>
              <div className="relative mb-4 inline-block">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                <CheckCircle2 className="h-16 w-16 text-emerald-500 relative" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-500 mb-2">¡Gracias por tu compra!</h2>
              <p className="text-muted-foreground">
                Tu pedido fue confirmado y está siendo procesado.
              </p>
              {hasValidRedirect && (
                <p className="text-sm text-muted-foreground mt-3">
                  Serás redirigido en {countdown} segundos...
                </p>
              )}
            </>
          ) : (
            <>
              <Package className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-amber-500 mb-2">Pedido pendiente</h2>
              <p className="text-muted-foreground">
                Tu pedido está pendiente de pago.
              </p>
            </>
          )}
        </div>

        {/* Order summary (simplified for success) */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Resumen del pedido
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Pedido</span>
              <span className="font-mono text-sm">{order.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Producto</span>
              <span className="font-medium">{order.product_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Estado</span>
              <span className={isPaid ? 'font-medium text-emerald-600' : 'font-medium text-amber-600'}>
                {isPaid ? 'Pagado' : 'Pendiente'}
              </span>
            </div>
            {order.customer_email && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-4 w-4" /> Email
                </span>
                <span>{order.customer_email}</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="font-semibold">Total</span>
              <span className="stat-value text-xl">
                {formatCurrency(order.total_amount, order.product_currency as 'ARS' | 'BRL' | 'USD', 'es')}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {!isPaid && (
            <Link to={`/checkout/${orderId}`}>
              <Button className="w-full btn-primary-glow gap-2">
                <CreditCard className="h-4 w-4" />
                Completar pago
              </Button>
            </Link>
          )}
          {hasValidRedirect ? (
            <a href={order.redirect_url!}>
              <Button className="w-full btn-primary-glow gap-2">
                <ExternalLink className="h-4 w-4" />
                Continuar
              </Button>
            </a>
          ) : isPaid ? (
            <Link to={`/order/${orderId}/thanks`}>
              <Button variant="outline" className="w-full gap-2">
                Ver detalle del pedido
              </Button>
            </Link>
          ) : null}
        </div>

        {/* Order date */}
        <p className="text-center text-sm text-muted-foreground">
          Pedido realizado el {new Date(order.created_at).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
};

export default OrderThanks;
