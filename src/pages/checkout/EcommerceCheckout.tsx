import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/i18n';
import {
  Loader2, ArrowRight, ArrowLeft, Building2, Mail, Phone,
  MapPin, CreditCard, CheckCircle2, Package, Truck,
  ShieldCheck, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Types
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
  product_image_url?: string | null;
}

interface PaymentData {
  id: string;
  status: string;
  idempotency_key: string;
}

type Step = 'contact' | 'shipping' | 'payment' | 'confirmation';

interface ContactForm {
  email: string;
  phone: string;
}

interface ShippingForm {
  name: string;
  lastname: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export const EcommerceCheckout: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<Step>('contact');
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // MP SDK state
  const [mpReady, setMpReady] = useState(false);
  const cardFormRef = useRef<any>(null);
  const mpInstanceRef = useRef<any>(null);

  // Forms
  const [contactForm, setContactForm] = useState<ContactForm>({
    email: '',
    phone: '',
  });

  const [shippingForm, setShippingForm] = useState<ShippingForm>({
    name: '',
    lastname: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
  });

  const steps: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: 'contact', label: 'Contacto', icon: Mail },
    { id: 'shipping', label: 'Envío', icon: Truck },
    { id: 'payment', label: 'Pago', icon: CreditCard },
    { id: 'confirmation', label: 'Confirmación', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // Load order data
  const loadOrder = useCallback(async (id: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_order_for_checkout', {
        _order_id: id,
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as {
        success: boolean;
        order?: OrderData & { product_image_url?: string };
        payment?: PaymentData;
        error?: string;
      };

      if (!result.success || !result.order) {
        setError(result.error || 'Pedido no encontrado');
        return;
      }

      setOrder(result.order);
      setPayment(result.payment || null);

      // Pre-fill forms
      if (result.order.customer_email || result.order.customer_phone) {
        setContactForm({
          email: result.order.customer_email || '',
          phone: result.order.customer_phone || '',
        });
      }

      if (result.order.shipping_name) {
        setShippingForm({
          name: result.order.shipping_name || '',
          lastname: result.order.shipping_lastname || '',
          address: result.order.shipping_address || '',
          city: result.order.shipping_city || '',
          province: result.order.shipping_province || '',
          postal_code: result.order.shipping_postal_code || '',
        });
      }

      if (result.order.status === 'paid') {
        setCurrentStep('confirmation');
      }
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

  // ✅ MP: init CardForm only in payment step
  useEffect(() => {
    if (currentStep !== 'payment') return;
    if (!order) return;

    let mounted = true;

    const ensureScript = async () => {
      if (window.MercadoPago) return;
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('No se pudo cargar el SDK de Mercado Pago'));
        document.body.appendChild(script);
      });
    };

    const waitForDom = async () => {
      const requiredIds = [
        'form-checkout',
        'form-checkout__cardNumber',
        'form-checkout__expirationDate',
        'form-checkout__securityCode',
        'form-checkout__cardholderName',
        'form-checkout__issuer',
        'form-checkout__installments',
        'form-checkout__identificationType',
        'form-checkout__identificationNumber',
        'form-checkout__cardholderEmail',
      ];

      for (let i = 0; i < 80; i++) {
        if (requiredIds.every(id => document.getElementById(id))) return;
        await new Promise(res => setTimeout(res, 50));
      }
      throw new Error('DOM no listo para CardForm (ids no encontrados)');
    };

    const initMPCardForm = async () => {
      try {
        setMpReady(false);
        setPaymentError(null);

        await ensureScript();
        await waitForDom();

        if (!mounted) return;

        const TEST_PUBLIC_KEY = 'TEST-031c70a1-fe57-4322-beb1-ca8f842e8f9d';

        const mp = new window.MercadoPago(TEST_PUBLIC_KEY, { locale: 'es-AR' });
        mpInstanceRef.current = mp;

        // cleanup previous
        try { cardFormRef.current?.unmount?.(); } catch {}
        cardFormRef.current = null;

        const cardForm = mp.cardForm({
          amount: String(order.total_amount || 0),
          iframe: false,
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número de tarjeta' },
            expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/YY' },
            securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
            cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Nombre' },
            issuer: { id: 'form-checkout__issuer', placeholder: 'Banco emisor' },
            installments: { id: 'form-checkout__installments', placeholder: 'Cuotas' },
            identificationType: { id: 'form-checkout__identificationType', placeholder: 'Tipo doc' },
            identificationNumber: { id: 'form-checkout__identificationNumber', placeholder: 'Documento' },
            cardholderEmail: { id: 'form-checkout__cardholderEmail', placeholder: 'E-mail' },
          },
          callbacks: {
            onFormMounted: (err: any) => {
              if (!mounted) return;
              if (err) {
                console.error('[MP] onFormMounted error:', err);
                setPaymentError('Error inicializando Mercado Pago.');
                return;
              }
              console.log('[MP] CardForm mounted OK');
              setMpReady(true);
            },

            onSubmit: async (event: any) => {
              event.preventDefault();
              if (!cardFormRef.current) return;

              // debug DOM values
              const cn = (document.getElementById('form-checkout__cardNumber') as HTMLInputElement)?.value;
              const ex = (document.getElementById('form-checkout__expirationDate') as HTMLInputElement)?.value;
              const cv = (document.getElementById('form-checkout__securityCode') as HTMLInputElement)?.value;
              console.log('[MP DEBUG] dom values:', { cn, ex, cv });

              const data = cardFormRef.current?.getCardFormData?.();
              console.log('[MP DEBUG] onSubmit data:', data);

              const token = data?.token;
              if (!token) {
                setPaymentError('MP no pudo generar el token. Revisá los datos de tarjeta.');
                return;
              }

              await handlePaymentWithToken(data);
            },

            onError: (err: any) => {
              console.error('[MP] onError:', err);
              const msg =
                err?.cause?.[0]?.message ||
                err?.message ||
                err?.cause?.[0]?.description ||
                'Error de Mercado Pago';
              setPaymentError(msg);
            },

            onFetching: (resource: string) => {
              console.log('[MP] fetching:', resource);
            },
          },
        });

        cardFormRef.current = cardForm;
      } catch (e) {
        console.error('[MP] init error:', e);
        if (mounted) setPaymentError('Error inicializando Mercado Pago.');
        setMpReady(true);
      }
    };

    initMPCardForm();

    return () => {
      mounted = false;
      try { cardFormRef.current?.unmount?.(); } catch {}
      cardFormRef.current = null;
      mpInstanceRef.current = null;
      setMpReady(false);
    };
  }, [currentStep, order?.total_amount, order?.id]);

  // Save contact data
  const saveContactData = async () => {
    if (!contactForm.email || !contactForm.phone) {
      toast({ title: 'Completá todos los campos', variant: 'destructive' });
      return false;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_order_checkout_data', {
        _order_id: orderId,
        _customer_email: contactForm.email,
        _customer_phone: contactForm.phone,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        toast({ title: result.error || 'Error al guardar', variant: 'destructive' });
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error saving contact:', err);
      toast({ title: 'Error al guardar los datos', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Save shipping data
  const saveShippingData = async () => {
    const { name, lastname, address, city, province, postal_code } = shippingForm;
    if (!name || !lastname || !address || !city || !province || !postal_code) {
      toast({ title: 'Completá todos los campos', variant: 'destructive' });
      return false;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_order_checkout_data', {
        _order_id: orderId,
        _shipping_name: name,
        _shipping_lastname: lastname,
        _shipping_address: address,
        _shipping_city: city,
        _shipping_province: province,
        _shipping_postal_code: postal_code,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        toast({ title: result.error || 'Error al guardar', variant: 'destructive' });
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error saving shipping:', err);
      toast({ title: 'Error al guardar los datos', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const goToNextStep = async () => {
    if (currentStep === 'contact') {
      const saved = await saveContactData();
      if (saved) setCurrentStep('shipping');
    } else if (currentStep === 'shipping') {
      const saved = await saveShippingData();
      if (saved) setCurrentStep('payment');
    }
  };

  const goToPreviousStep = () => {
    if (currentStep === 'shipping') setCurrentStep('contact');
    else if (currentStep === 'payment') setCurrentStep('shipping');
  };

  const getPaymentErrorMessage = (detail: string): string => {
    const messages: Record<string, string> = {
      'cc_rejected_bad_filled_card_number': 'Número de tarjeta incorrecto',
      'cc_rejected_bad_filled_date': 'Fecha de vencimiento incorrecta',
      'cc_rejected_bad_filled_other': 'Datos de tarjeta incorrectos',
      'cc_rejected_bad_filled_security_code': 'Código de seguridad incorrecto',
      'cc_rejected_blacklist': 'Tarjeta no permitida',
      'cc_rejected_call_for_authorize': 'Debés autorizar el pago con tu banco',
      'cc_rejected_card_disabled': 'Tarjeta deshabilitada',
      'cc_rejected_duplicated_payment': 'Pago duplicado',
      'cc_rejected_high_risk': 'Pago rechazado por prevención de fraude',
      'cc_rejected_insufficient_amount': 'Fondos insuficientes',
      'cc_rejected_invalid_installments': 'Cuotas no válidas',
      'cc_rejected_max_attempts': 'Límite de intentos alcanzado',
      'pending_contingency': 'Pago pendiente de confirmación',
      'pending_review_manual': 'Pago en revisión',
    };
    return messages[detail] || detail;
  };

  // ✅ Paga usando token ya generado por MP en onSubmit
  const handlePaymentWithToken = async (cardFormData: any) => {
    if (processing) return;

    setProcessing(true);
    setPaymentError(null);

    try {
      const response = await supabase.functions.invoke('mp-pay', {
        body: {
          order_id: orderId,
          token: cardFormData.token,
          payment_method_id: cardFormData.paymentMethodId,
          issuer_id: cardFormData.issuerId,
          installments: parseInt(cardFormData.installments) || 1,
          payer: {
            email: contactForm.email,
            identification: cardFormData.identificationType && cardFormData.identificationNumber ? {
              type: cardFormData.identificationType,
              number: cardFormData.identificationNumber,
            } : undefined,
          },
        },
      });

      if (response.error) throw response.error;

      const result = response.data as {
        success: boolean;
        status?: string;
        status_detail?: string;
        error?: string;
      };

      console.log('[MP DEBUG] Payment result:', result);

      if (result.success && result.status === 'approved') {
        setOrder(prev => prev ? { ...prev, status: 'paid' } : null);
        setCurrentStep('confirmation');
        toast({ title: '¡Pago aprobado!', description: 'Tu pedido fue confirmado' });
      } else if (result.success && (result.status === 'in_process' || result.status === 'pending')) {
        toast({
          title: 'Pago en proceso',
          description: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
        });
      } else {
        setPaymentError(getPaymentErrorMessage(result.status_detail || result.error || 'Error desconocido'));
      }
    } catch (err: any) {
      console.error('[MP DEBUG] Payment error:', err);
      setPaymentError(err?.message || 'Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen checkout-light flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  // Error state
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

  // Confirmation
  if (currentStep === 'confirmation' || order.status === 'paid') {
    return (
      <div className="min-h-screen checkout-light flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md shadow-lg">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <CheckCircle2 className="h-20 w-20 text-emerald-500 mx-auto relative" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-emerald-500">¡Pedido confirmado!</h1>
          <p className="text-gray-600 mb-6">
            Tu pedido de {order.product_name} fue procesado correctamente.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3 mb-6 border border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-500">Producto</span>
              <span className="font-medium text-gray-900">{order.product_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total pagado</span>
              <span className="font-semibold text-cyan-600">
                {formatCurrency(order.total_amount, order.product_currency as 'ARS' | 'BRL' | 'USD', 'es')}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <span className="text-gray-500 text-sm">Envío a:</span>
              <p className="text-sm text-gray-700">
                {order.shipping_name} {order.shipping_lastname}<br />
                {order.shipping_address}<br />
                {order.shipping_city}, {order.shipping_province} {order.shipping_postal_code}
              </p>
            </div>
          </div>

          <Button
            className="w-full gap-2 bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg"
            onClick={() => navigate(`/order/${orderId}/thanks`)}
          >
            Ver detalles del pedido
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen checkout-light">
      <div className="max-w-6xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-50 mb-3">
            <Building2 className="h-6 w-6 text-cyan-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{order.merchant_name}</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8 px-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                <div className={cn("flex flex-col items-center", isActive && "scale-110")}>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    isCompleted ? "bg-cyan-500 text-white" :
                      isActive ? "bg-cyan-100 text-cyan-600 ring-2 ring-cyan-500" :
                        "bg-gray-100 text-gray-400"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={cn(
                    "text-xs mt-1 hidden sm:block",
                    isActive ? "text-cyan-600 font-medium" : "text-gray-500"
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-12 h-0.5 mx-2",
                    index < currentStepIndex ? "bg-cyan-500" : "bg-gray-200"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1fr,380px] gap-8">
          {/* Main content */}
          <div className="space-y-6">
            {/* Contact step */}
            {currentStep === 'contact' && (
              <div className="bg-white rounded-xl p-6 space-y-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-cyan-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Datos de contacto</h2>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+54 9 11 1234-5678"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <Button
                  className="w-full gap-2 bg-cyan-500 hover:bg-cyan-600 text-white shadow-md"
                  onClick={goToNextStep}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continuar a envío
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Shipping step */}
            {currentStep === 'shipping' && (
              <div className="bg-white rounded-xl p-6 space-y-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-cyan-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Dirección de envío</h2>
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-700">Nombre *</Label>
                      <Input
                        id="name"
                        placeholder="Nombre"
                        value={shippingForm.name}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastname" className="text-gray-700">Apellido *</Label>
                      <Input
                        id="lastname"
                        placeholder="Apellido"
                        value={shippingForm.lastname}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, lastname: e.target.value }))}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-gray-700">Dirección *</Label>
                    <Input
                      id="address"
                      placeholder="Calle y número, piso, depto"
                      value={shippingForm.address}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, address: e.target.value }))}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-gray-700">Ciudad *</Label>
                      <Input
                        id="city"
                        placeholder="Ciudad"
                        value={shippingForm.city}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, city: e.target.value }))}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province" className="text-gray-700">Provincia *</Label>
                      <Input
                        id="province"
                        placeholder="Provincia"
                        value={shippingForm.province}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, province: e.target.value }))}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code" className="text-gray-700">Código Postal *</Label>
                    <Input
                      id="postal_code"
                      placeholder="CP"
                      value={shippingForm.postal_code}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:ring-cyan-500 w-32"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={goToPreviousStep}
                    className="h-10 px-4 gap-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 shadow-sm"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-cyan-500 hover:bg-cyan-600 text-white shadow-md"
                    onClick={goToNextStep}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Continuar a pago
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Payment step */}
            {currentStep === 'payment' && (
              <div className="bg-white rounded-xl p-6 space-y-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-cyan-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Datos de pago</h2>
                </div>

                {paymentError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
                    {paymentError}
                  </div>
                )}

                <div className="relative">
                  {!mpReady && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                      <span className="ml-3 text-gray-500">Cargando formulario de pago...</span>
                    </div>
                  )}

                  <form id="form-checkout" className="space-y-4 checkout-form-light">
                    <div className="space-y-2">
                      <Label>Número de tarjeta</Label>
                      <input
                        id="form-checkout__cardNumber"
                        name="cardNumber"
                        type="text"
                        inputMode="numeric"
                        placeholder="Número de tarjeta"
                        autoComplete="cc-number"
                        className="mp-input-native-light"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Vencimiento</Label>
                        <input
                          id="form-checkout__expirationDate"
                          name="expirationDate"
                          type="text"
                          inputMode="numeric"
                          placeholder="MM/YY"
                          autoComplete="cc-exp"
                          className="mp-input-native-light"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CVV</Label>
                        <input
                          id="form-checkout__securityCode"
                          name="securityCode"
                          type="text"
                          inputMode="numeric"
                          placeholder="CVV"
                          autoComplete="cc-csc"
                          className="mp-input-native-light"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Nombre en la tarjeta</Label>
                      <input
                        id="form-checkout__cardholderName"
                        name="cardholderName"
                        type="text"
                        placeholder="Nombre como aparece en la tarjeta"
                        autoComplete="cc-name"
                        className="mp-input-native-light"
                      />
                    </div>

                    {/* issuer requerido por MP aunque lo ocultes */}
                    <div className="mp-issuer-hidden">
                      <select id="form-checkout__issuer" name="issuer" aria-hidden="true" />
                    </div>

                    <div className="space-y-2">
                      <Label>Cuotas</Label>
                      <select id="form-checkout__installments" name="installments" className="mp-select-light" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de documento</Label>
                        <select id="form-checkout__identificationType" name="identificationType" className="mp-select-light" />
                      </div>
                      <div className="space-y-2">
                        <Label>Número de documento</Label>
                        <input
                          id="form-checkout__identificationNumber"
                          name="identificationNumber"
                          type="text"
                          placeholder="Número de documento"
                          inputMode="numeric"
                          className="mp-input-native-light"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <input
                        id="form-checkout__cardholderEmail"
                        name="cardholderEmail"
                        type="email"
                        placeholder="E-mail"
                        autoComplete="email"
                        className="mp-input-native-light"
                        defaultValue={contactForm.email}
                      />
                    </div>
                  </form>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={goToPreviousStep}
                    disabled={processing}
                    className="h-10 px-4 gap-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 shadow-sm"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver
                  </Button>

                  {/* ✅ IMPORTANTE: NO onClick. El submit dispara onSubmit del CardForm */}
                  <Button
                    type="submit"
                    form="form-checkout"
                    className="flex-1 gap-2 bg-cyan-500 hover:bg-cyan-600 text-white shadow-md"
                    disabled={!mpReady || processing}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Pagar {formatCurrency(order.total_amount, order.product_currency as 'ARS' | 'BRL' | 'USD', 'es')}
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="h-4 w-4" />
                  Pago seguro procesado por Mercado Pago
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900">Resumen del pedido</h3>

              {order.product_image_url && (
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={order.product_image_url}
                    alt={order.product_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">{order.product_name}</span>
                  <span className="text-gray-900">{formatCurrency(order.product_amount, order.product_currency as 'ARS' | 'BRL' | 'USD', 'es')}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Envío</span>
                  <span className="text-gray-900">
                    {order.shipping_cost > 0
                      ? formatCurrency(order.shipping_cost, order.product_currency as 'ARS' | 'BRL' | 'USD', 'es')
                      : 'Gratis'
                    }
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(order.total_amount, order.product_currency as 'ARS' | 'BRL' | 'USD', 'es')}
                  </span>
                </div>
              </div>

              {(currentStep === 'shipping' || currentStep === 'payment') && shippingForm.address && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{shippingForm.name} {shippingForm.lastname}</p>
                      <p className="text-gray-500">
                        {shippingForm.address}<br />
                        {shippingForm.city}, {shippingForm.province} {shippingForm.postal_code}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 'payment' && contactForm.email && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{contactForm.email}</span>
                  </div>
                  {contactForm.phone && (
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{contactForm.phone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EcommerceCheckout;
