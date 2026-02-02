import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/i18n';
import { Clock, CheckCircle2, XCircle, Loader2, ArrowRight, Building2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type PaymentStatus = 'pending' | 'confirmed' | 'expired' | 'created' | 'failed';

interface PaymentData {
  id: string;
  status: PaymentStatus;
  expires_at: string;
  payment_reference: string;
  amount: number;
  currency: string;
  redirect_url: string | null;
  confirmed_at: string | null;
  mp_preference_id: string | null;
  product: {
    name: string | null;
    description: string | null;
  };
  merchant: {
    name: string | null;
  };
  customer: {
    email: string | null;
    name: string | null;
  };
}

interface CustomerForm {
  email: string;
  name: string;
  phone: string;
}

export const Checkout: React.FC = () => {
  const { productSlug, paymentId } = useParams<{ productSlug?: string; paymentId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [redirecting, setRedirecting] = useState(false);
  const [loadingMp, setLoadingMp] = useState(false);

  // Customer form (solo para /p/:slug)
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    email: '',
    name: '',
    phone: '',
  });

  // Crear payment desde slug usando RPC
  const createPaymentFromSlug = useCallback(async (slug: string, customer?: CustomerForm) => {
    setCreating(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_payment_from_product_slug', {
        _product_slug: slug,
        _customer_email: customer?.email || null,
        _customer_name: customer?.name || null,
        _customer_phone: customer?.phone || null,
      });

      if (rpcError) throw rpcError;

      const result = data as { success: boolean; payment_id?: string; error?: string };

      if (!result.success) {
        setError(result.error || 'No se pudo crear el pago');
        return;
      }

      // Redirigir al checkout del payment
      navigate(`/pay/${result.payment_id}`, { replace: true });
    } catch (err: any) {
      console.error('Error creating payment:', err);
      setError('Error al crear el pago. Intenta de nuevo.');
    } finally {
      setCreating(false);
    }
  }, [navigate]);

  // Cargar payment por ID
  const loadPayment = useCallback(async (id: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_public_payment_view', {
        _payment_id: id,
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as { success: boolean; payment?: PaymentData; error?: string };

      if (!result.success || !result.payment) {
        setError(result.error || 'Pago no encontrado');
        return;
      }

      setPayment(result.payment);
    } catch (err: any) {
      console.error('Error loading payment:', err);
      setError('Error al cargar el pago');
    } finally {
      setLoading(false);
    }
  }, []);

  // Efecto inicial
  useEffect(() => {
    if (paymentId) {
      loadPayment(paymentId);
    } else if (productSlug) {
      setShowCustomerForm(true);
      setLoading(false);
    } else {
      setError('Enlace de pago inválido');
      setLoading(false);
    }
  }, [paymentId, productSlug, loadPayment]);

  // Countdown timer
  useEffect(() => {
    if (!payment?.expires_at || payment.status !== 'pending') return;

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expires = new Date(payment.expires_at).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && payment.status === 'pending') {
        setPayment(prev => prev ? { ...prev, status: 'expired' } : null);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [payment?.expires_at, payment?.status]);

  // Realtime subscription para cambios de estado
  useEffect(() => {
    if (!paymentId) return;

    const channel = supabase
      .channel(`payment-${paymentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${paymentId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as PaymentStatus;
          setPayment(prev => prev ? { ...prev, status: newStatus, confirmed_at: payload.new.confirmed_at } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paymentId]);

  // Redirect automático cuando se confirma
  useEffect(() => {
    if (payment?.status !== 'confirmed' || !payment.redirect_url || redirecting) return;

    const handleRedirect = async () => {
      setRedirecting(true);

      // Obtener URL firmada con HMAC
      try {
        const { data, error } = await supabase.rpc('generate_payment_redirect_signature', {
          _payment_id: payment.id,
        });

        if (error) throw error;

        const result = data as { success: boolean; redirect_url?: string };

        if (result.success && result.redirect_url) {
          // Esperar 3 segundos para mostrar confirmación
          setTimeout(() => {
            window.location.href = result.redirect_url!;
          }, 3000);
        }
      } catch (err) {
        console.error('Error getting redirect URL:', err);
      }
    };

    handleRedirect();
  }, [payment?.status, payment?.redirect_url, payment?.id, redirecting]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle customer form submit
  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (productSlug) {
      createPaymentFromSlug(productSlug, customerForm);
    }
  };

  // Iniciar pago con Mercado Pago
  const handlePayWithMercadoPago = async () => {
    if (!payment) return;

    setLoadingMp(true);
    try {
      const response = await supabase.functions.invoke('create-mp-preference', {
        body: { payment_id: payment.id },
      });

      if (response.error) {
        console.error('Error creating MP preference:', response.error);
        toast({
          title: 'Error',
          description: 'No se pudo iniciar el pago. Intenta de nuevo.',
          variant: 'destructive',
        });
        return;
      }

      const data = response.data as { 
        success: boolean; 
        preference_id?: string; 
        init_point?: string;
        sandbox_init_point?: string;
        error?: string;
        status?: string;
      };

      if (!data.success) {
        // If payment is already in a different status, reload
        if (data.status && data.status !== 'pending') {
          await loadPayment(payment.id);
        }
        toast({
          title: 'Error',
          description: data.error || 'No se pudo crear la preferencia de pago',
          variant: 'destructive',
        });
        return;
      }

      // Redirect to Mercado Pago checkout
      // In production, use init_point. In sandbox, use sandbox_init_point
      const redirectUrl = data.init_point || data.sandbox_init_point;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        toast({
          title: 'Error',
          description: 'No se recibió la URL de pago de Mercado Pago',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error initiating MP payment:', err);
      toast({
        title: 'Error',
        description: 'Error al conectar con Mercado Pago',
        variant: 'destructive',
      });
    } finally {
      setLoadingMp(false);
    }
  };

  // Render customer form
  if (showCustomerForm && !payment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <span className="text-3xl font-bold text-primary">Δ</span>
              </div>
              <h1 className="text-2xl font-bold">DeltaPay</h1>
              <p className="text-muted-foreground">Completá tus datos para continuar</p>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre (opcional)</Label>
                <Input
                  id="name"
                  placeholder="Tu nombre"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+54 9 11 1234-5678"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="input-field"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full btn-primary-glow gap-2"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando pago...
                  </>
                ) : (
                  <>
                    Continuar al pago
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando pago...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !payment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground">{error || 'Pago no encontrado'}</p>
        </div>
      </div>
    );
  }

  // Expired state
  if (payment.status === 'expired') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Pago expirado</h1>
          <p className="text-muted-foreground mb-6">
            Este enlace de pago ha expirado. Solicitá uno nuevo al vendedor.
          </p>
          <p className="text-sm text-muted-foreground font-mono">
            Ref: {payment.payment_reference}
          </p>
        </div>
      </div>
    );
  }

  // Confirmed state
  if (payment.status === 'confirmed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <CheckCircle2 className="h-20 w-20 text-emerald-500 mx-auto relative" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-emerald-500">¡Pago confirmado!</h1>
          <p className="text-muted-foreground mb-6">
            Tu pago de {formatCurrency(payment.amount, payment.currency as 'ARS' | 'BRL' | 'USD', 'es')} fue procesado correctamente.
          </p>

          {payment.redirect_url && (
            <div className="space-y-3">
              {redirecting ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Redirigiendo...</span>
                </div>
              ) : (
                <Button
                  className="w-full btn-primary-glow gap-2"
                  onClick={async () => {
                    try {
                      const { data } = await supabase.rpc('generate_payment_redirect_signature', {
                        _payment_id: payment.id,
                      });
                      const result = data as { success: boolean; redirect_url?: string };
                      if (result.success && result.redirect_url) {
                        window.location.href = result.redirect_url;
                      }
                    } catch (err) {
                      toast({ title: 'Error al redirigir', variant: 'destructive' });
                    }
                  }}
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-6 font-mono">
            Ref: {payment.payment_reference}
          </p>
        </div>
      </div>
    );
  }

  // Pending payment - Main checkout view with Mercado Pago
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{payment.merchant.name || 'DeltaPay'}</h1>
        </div>

        {/* Order summary */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Tu pedido</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{payment.product.name || 'Producto'}</p>
              {payment.product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{payment.product.description}</p>
              )}
            </div>
            <p className="stat-value text-xl">
              {formatCurrency(payment.amount, payment.currency as 'ARS' | 'BRL' | 'USD', 'es')}
            </p>
          </div>

          <div className="border-t border-border pt-4 flex items-center justify-between">
            <span className="font-semibold">Total a pagar</span>
            <span className="stat-value text-2xl">
              {formatCurrency(payment.amount, payment.currency as 'ARS' | 'BRL' | 'USD', 'es')}
            </span>
          </div>
        </div>

        {/* Timer */}
        <div className={cn(
          "glass rounded-xl p-4 flex items-center justify-between",
          timeLeft < 300 && "border-amber-500/50 bg-amber-500/5"
        )}>
          <div className="flex items-center gap-3">
            <Clock className={cn("h-5 w-5", timeLeft < 300 ? "text-amber-500" : "text-muted-foreground")} />
            <span className="text-sm">Tiempo restante</span>
          </div>
          <span className={cn(
            "font-mono text-lg font-bold",
            timeLeft < 300 && "text-amber-500"
          )}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Mercado Pago Payment */}
        <div className="glass rounded-xl p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="font-semibold text-lg">Pagá con Mercado Pago</h2>
            <p className="text-sm text-muted-foreground">
              Usá tu dinero en cuenta de Mercado Pago, tarjeta de crédito, débito o efectivo.
            </p>
          </div>

          {/* Mercado Pago Button */}
          <Button
            onClick={handlePayWithMercadoPago}
            disabled={loadingMp || timeLeft === 0}
            className="w-full h-14 text-lg gap-3 bg-[#009EE3] hover:bg-[#0087CC] text-white font-semibold"
          >
            {loadingMp ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Conectando con Mercado Pago...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Pagar con Mercado Pago
              </>
            )}
          </Button>

          {/* MP Logo and trust badges */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <svg className="h-6" viewBox="0 0 68 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25.5 0C18.6 0 13 5.4 13 12C13 18.6 18.6 24 25.5 24C32.4 24 38 18.6 38 12C38 5.4 32.4 0 25.5 0ZM25.5 19.5C21.1 19.5 17.5 16.1 17.5 12C17.5 7.9 21.1 4.5 25.5 4.5C29.9 4.5 33.5 7.9 33.5 12C33.5 16.1 29.9 19.5 25.5 19.5Z" fill="#009EE3"/>
                <path d="M8.5 0C3.8 0 0 3.8 0 8.5V15.5C0 20.2 3.8 24 8.5 24H10V19.5H8.5C6.3 19.5 4.5 17.7 4.5 15.5V8.5C4.5 6.3 6.3 4.5 8.5 4.5H10V0H8.5Z" fill="#009EE3"/>
                <path d="M59.5 0C54.8 0 51 3.8 51 8.5V24H55.5V8.5C55.5 6.3 57.3 4.5 59.5 4.5C61.7 4.5 63.5 6.3 63.5 8.5V24H68V8.5C68 3.8 64.2 0 59.5 0Z" fill="#009EE3"/>
                <path d="M42.5 0C37.8 0 34 3.8 34 8.5V24H38.5V8.5C38.5 6.3 40.3 4.5 42.5 4.5C44.7 4.5 46.5 6.3 46.5 8.5V24H51V8.5C51 3.8 47.2 0 42.5 0Z" fill="#009EE3"/>
              </svg>
              <span>Pago seguro</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>Procesado por DeltaPay con Mercado Pago</p>
          <p className="font-mono">Ref: {payment.payment_reference}</p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
