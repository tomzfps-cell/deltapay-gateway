import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Clock, CheckCircle, XCircle, Loader2, QrCode } from 'lucide-react';
import { formatCurrency } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface PaymentData {
  id: string;
  status: string;
  payment_reference: string;
  amount_local: number;
  currency: 'ARS' | 'BRL' | 'USD';
  expires_at: string;
  customer_name: string | null;
  customer_email: string | null;
  snapshot_redirect_url: string | null;
  merchant: {
    business_name: string;
    bank_alias: string | null;
    bank_cbu: string | null;
    bank_instructions: string | null;
  };
  product: {
    name: string;
    description: string | null;
  } | null;
}

export const Checkout: React.FC = () => {
  const { productSlug, paymentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Customer form (only for new payments)
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Fetch or create payment
  useEffect(() => {
    const loadPayment = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (paymentId) {
          // Load existing payment
          const { data, error: fetchError } = await supabase
            .from('payments')
            .select(`
              id, status, payment_reference, amount_local, currency, expires_at,
              customer_name, customer_email, snapshot_redirect_url,
              merchant:merchant_id (business_name, bank_alias, bank_cbu, bank_instructions),
              product:product_id (name, description)
            `)
            .eq('id', paymentId)
            .single();

          if (fetchError) throw fetchError;
          setPayment(data as unknown as PaymentData);
        } else if (productSlug) {
          // Find product by slug
          const { data: product, error: productError } = await supabase
            .from('products')
            .select(`
              id, name, description, price, currency, redirect_url, is_active,
              merchant:merchant_id (id, business_name, bank_alias, bank_cbu, bank_instructions, allowed_domains)
            `)
            .eq('slug', productSlug)
            .eq('is_active', true)
            .single();

          if (productError || !product) {
            setError('Producto no encontrado o no disponible');
            setIsLoading(false);
            return;
          }

          // Store product data for form display
          setPayment({
            id: '',
            status: 'new',
            payment_reference: '',
            amount_local: product.price,
            currency: product.currency as 'ARS' | 'BRL' | 'USD',
            expires_at: '',
            customer_name: null,
            customer_email: null,
            snapshot_redirect_url: product.redirect_url,
            merchant: product.merchant as PaymentData['merchant'],
            product: { name: product.name, description: product.description },
          });
        }
      } catch (err: any) {
        console.error('Error loading payment:', err);
        setError('Error al cargar el pago');
      } finally {
        setIsLoading(false);
      }
    };

    loadPayment();
  }, [productSlug, paymentId]);

  // Countdown timer
  useEffect(() => {
    if (!payment?.expires_at || payment.status !== 'pending') return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(payment.expires_at).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && payment.status === 'pending') {
        setPayment((prev) => prev ? { ...prev, status: 'expired' } : null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [payment?.expires_at, payment?.status]);

  // Real-time status updates
  useEffect(() => {
    if (!payment?.id || payment.status !== 'pending') return;

    const channel = supabase
      .channel(`payment-${payment.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${payment.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status;
          setPayment((prev) => prev ? { ...prev, status: newStatus } : null);

          if (newStatus === 'confirmed' && payment.snapshot_redirect_url) {
            // Redirect after 3 seconds
            setTimeout(() => {
              window.location.href = payment.snapshot_redirect_url!;
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [payment?.id, payment?.status, payment?.snapshot_redirect_url]);

  const createPayment = async () => {
    if (!productSlug) return;

    setIsCreating(true);

    try {
      // Find product again to get fresh data
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, price, currency, redirect_url, merchant_id')
        .eq('slug', productSlug)
        .eq('is_active', true)
        .single();

      if (productError || !product) {
        throw new Error('Producto no disponible');
      }

      // Create payment
      const { data: newPayment, error: createError } = await supabase
        .from('payments')
        .insert({
          merchant_id: product.merchant_id,
          product_id: product.id,
          amount_local: product.price,
          currency: product.currency,
          customer_name: customerName || null,
          customer_email: customerEmail || null,
          snapshot_price: product.price,
          snapshot_currency: product.currency,
          snapshot_redirect_url: product.redirect_url,
          status: 'pending',
        })
        .select('id')
        .single();

      if (createError) throw createError;

      // Redirect to payment page
      navigate(`/pay/${newPayment.id}`, { replace: true });
    } catch (err: any) {
      console.error('Error creating payment:', err);
      toast({
        title: 'Error',
        description: err.message || 'No se pudo crear el pago',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">{error || 'Pago no encontrado'}</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  // New payment form (before creating)
  if (payment.status === 'new') {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">{payment.merchant.business_name}</h1>
            <p className="text-muted-foreground mt-1">Checkout seguro</p>
          </div>

          {/* Product */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-semibold text-lg">{payment.product?.name}</h2>
            {payment.product?.description && (
              <p className="text-sm text-muted-foreground mt-1">{payment.product.description}</p>
            )}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total a pagar</span>
                <span className="text-2xl font-bold text-gradient">
                  {formatCurrency(payment.amount_local, payment.currency, 'es')}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Form */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="font-semibold">Tus datos (opcional)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Tu nombre"
                className="input-field"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="tu@email.com"
                className="input-field"
              />
            </div>

            <Button
              onClick={createPayment}
              disabled={isCreating}
              className="w-full btn-primary-glow"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Continuar al pago'
              )}
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20">
                <span className="text-xs font-bold text-primary">Δ</span>
              </span>
              <span>Procesado por DeltaPay</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Payment status screens
  if (payment.status === 'confirmed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-success/20 flex items-center justify-center animate-glow">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">¡Pago Confirmado!</h1>
            <p className="text-muted-foreground mt-2">
              Tu pago ha sido procesado correctamente.
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Referencia</p>
            <p className="font-mono text-lg">{payment.payment_reference}</p>
          </div>
          {payment.snapshot_redirect_url ? (
            <p className="text-sm text-muted-foreground">
              Redirigiendo automáticamente...
            </p>
          ) : (
            <Button onClick={() => window.close()} variant="outline">
              Cerrar
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (payment.status === 'expired') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pago Expirado</h1>
            <p className="text-muted-foreground mt-2">
              El tiempo para completar este pago ha vencido.
            </p>
          </div>
          <Button onClick={() => navigate(-1)} variant="outline">
            Volver a intentar
          </Button>
        </div>
      </div>
    );
  }

  // Pending payment - main checkout view
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{payment.merchant.business_name}</h1>
        </div>

        {/* Timer */}
        <div className={cn(
          'rounded-xl p-4 flex items-center justify-between',
          timeLeft < 120 ? 'bg-destructive/20 border border-destructive/30' : 'glass'
        )}>
          <div className="flex items-center gap-2">
            <Clock className={cn('h-5 w-5', timeLeft < 120 ? 'text-destructive' : 'text-warning')} />
            <span className="text-sm">Tiempo restante</span>
          </div>
          <span className={cn(
            'font-mono text-xl font-bold',
            timeLeft < 120 ? 'text-destructive' : 'text-foreground'
          )}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Order Summary */}
        <div className="glass rounded-xl p-6">
          <h2 className="font-semibold mb-4">Tu pedido</h2>
          {payment.product && (
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-medium">{payment.product.name}</p>
                {payment.product.description && (
                  <p className="text-sm text-muted-foreground">{payment.product.description}</p>
                )}
              </div>
            </div>
          )}
          <div className="pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total</span>
              <span className="text-2xl font-bold text-gradient">
                {formatCurrency(payment.amount_local, payment.currency, 'es')}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="glass rounded-xl p-6 space-y-6">
          <h2 className="font-semibold">Cómo pagar</h2>

          {/* QR Section */}
          <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-lg">
            <div className="w-48 h-48 bg-muted flex items-center justify-center rounded-lg">
              <QrCode className="h-24 w-24 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Escaneá el QR con tu app bancaria
            </p>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-4 text-sm text-muted-foreground">o transferí a</span>
          </div>

          {/* Bank Details */}
          <div className="space-y-4">
            {payment.merchant.bank_alias && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Alias</p>
                  <p className="font-mono font-medium">{payment.merchant.bank_alias}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(payment.merchant.bank_alias!, 'alias')}
                  className="shrink-0"
                >
                  {copiedField === 'alias' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {payment.merchant.bank_cbu && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">CBU/CVU</p>
                  <p className="font-mono font-medium text-sm">{payment.merchant.bank_cbu}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(payment.merchant.bank_cbu!, 'cbu')}
                  className="shrink-0"
                >
                  {copiedField === 'cbu' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {/* Reference */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Referencia (obligatoria)</p>
                <p className="font-mono font-bold text-primary text-lg">{payment.payment_reference}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(payment.payment_reference, 'ref')}
                className="shrink-0"
              >
                {copiedField === 'ref' ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          {payment.merchant.bank_instructions && (
            <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
              {payment.merchant.bank_instructions}
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="glass rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
            <span className="text-sm text-muted-foreground">Esperando pago...</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            La página se actualizará automáticamente al confirmar
          </p>
        </div>

        {/* Footer */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20">
              <span className="text-xs font-bold text-primary">Δ</span>
            </span>
            <span>Procesado por DeltaPay</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
