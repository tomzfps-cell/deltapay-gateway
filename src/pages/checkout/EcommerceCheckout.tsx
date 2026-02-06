import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/i18n';
import { 
  Loader2, ArrowRight, ArrowLeft, Building2, Mail, Phone, 
  MapPin, CreditCard, CheckCircle2, Package, User, Truck,
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

      const result = data as unknown as { success: boolean; order?: OrderData & { product_image_url?: string }; payment?: PaymentData; error?: string };

      if (!result.success || !result.order) {
        setError(result.error || 'Pedido no encontrado');
        return;
      }

      setOrder(result.order);
      setPayment(result.payment || null);

      // Pre-fill forms with existing data
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

      // If order is already paid, go to confirmation
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

  // Initial load
  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    } else {
      setError('ID de pedido no válido');
      setLoading(false);
    }
  }, [orderId, loadOrder]);

  // Load MP SDK
  useEffect(() => {
    if (currentStep !== 'payment' || mpReady) return;

    let mounted = true;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const loadMPScript = async () => {
      // Check if SDK already loaded
      if (window.MercadoPago) {
        await initMPCardForm();
        return;
      }

      // Load SDK script
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.onload = () => initMPCardForm();
      document.body.appendChild(script);
    };

    const initMPCardForm = async () => {
      try {
        // Get public key
        const response = await supabase.functions.invoke('get-mp-public-key');
        if (response.error) throw response.error;
        
        const data = response.data as { success: boolean; public_key?: string };
        if (!data.success || !data.public_key) {
          console.error('MP_PUBLIC_KEY not available');
          // Enable form anyway so user can see the issue
          if (mounted) setMpReady(true);
          return;
        }

        // Initialize MP
        const mp = new window.MercadoPago(data.public_key, { locale: 'es-AR' });
        mpInstanceRef.current = mp;

        // Create CardForm
        const cardForm = mp.cardForm({
          amount: String(order?.total_amount || 0),
          iframe: true,
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número de tarjeta' },
            expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/YY' },
            securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
            cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Nombre como aparece en la tarjeta' },
            issuer: { id: 'form-checkout__issuer', placeholder: 'Banco emisor' },
            installments: { id: 'form-checkout__installments', placeholder: 'Cuotas' },
            identificationType: { id: 'form-checkout__identificationType', placeholder: 'Tipo de documento' },
            identificationNumber: { id: 'form-checkout__identificationNumber', placeholder: 'Número de documento' },
            cardholderEmail: { id: 'form-checkout__cardholderEmail', placeholder: 'E-mail' },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (fallbackTimer) clearTimeout(fallbackTimer);
              if (error) {
                console.error('CardForm mount error:', error);
              } else {
                console.log('CardForm mounted successfully');
              }
              // Always enable form after mount callback (with or without error)
              if (mounted) setMpReady(true);
            },
            onSubmit: async (event: any) => {
              event.preventDefault();
              await handlePaymentSubmit();
            },
            onFetching: (resource: string) => {
              console.log('Fetching resource:', resource);
            },
          },
        });

        cardFormRef.current = cardForm;

        // Fallback timer - if onFormMounted doesn't fire within 8 seconds, enable anyway
        fallbackTimer = setTimeout(() => {
          if (mounted && !mpReady) {
            console.warn('MP CardForm mount timeout - enabling form via fallback');
            setMpReady(true);
          }
        }, 8000);

      } catch (err) {
        console.error('Error initializing MP CardForm:', err);
        if (mounted) setMpReady(true); // Enable form so user sees error state
      }
    };

    loadMPScript();

    return () => {
      mounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (cardFormRef.current) {
        try {
          cardFormRef.current.unmount();
        } catch (e) {
          // Ignore unmount errors
        }
      }
    };
  }, [currentStep, order?.total_amount]);

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

  // Handle step navigation
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

  // Handle payment submission
  const handlePaymentSubmit = async () => {
    if (!cardFormRef.current || processing) return;

    setProcessing(true);
    setPaymentError(null);

    try {
      const cardFormData = cardFormRef.current.getCardFormData();
      
      if (!cardFormData.token) {
        setPaymentError('Error al generar el token de tarjeta');
        setProcessing(false);
        return;
      }

      console.log('Card token generated:', cardFormData.token.substring(0, 10) + '...');

      // Call our backend
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

      console.log('Payment result:', result);

      if (result.success && result.status === 'approved') {
        // Payment approved!
        setOrder(prev => prev ? { ...prev, status: 'paid' } : null);
        setCurrentStep('confirmation');
        toast({ title: '¡Pago aprobado!', description: 'Tu pedido fue confirmado' });
      } else if (result.success && (result.status === 'in_process' || result.status === 'pending')) {
        // Payment pending
        toast({ 
          title: 'Pago en proceso', 
          description: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.' 
        });
      } else {
        // Payment failed
        setPaymentError(getPaymentErrorMessage(result.status_detail || result.error || 'Error desconocido'));
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setPaymentError(err.message || 'Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <Package className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground">{error || 'Pedido no encontrado'}</p>
        </div>
      </div>
    );
  }

  // Confirmation step
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
                <div className={cn(
                  "flex flex-col items-center",
                  isActive && "scale-110"
                )}>
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
                    variant="outline"
                    className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={goToPreviousStep}
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
                    <div id="form-checkout__cardNumber" className="mp-input-wrapper-light" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vencimiento</Label>
                      <div id="form-checkout__expirationDate" className="mp-input-wrapper-light" />
                    </div>
                    <div className="space-y-2">
                      <Label>CVV</Label>
                      <div id="form-checkout__securityCode" className="mp-input-wrapper-light" />
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

                  <div className="mp-issuer-hidden">
                    <select id="form-checkout__issuer" aria-hidden="true" />
                  </div>

                  <div className="space-y-2">
                    <Label>Cuotas</Label>
                    <select id="form-checkout__installments" className="mp-select-light" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de documento</Label>
                      <select id="form-checkout__identificationType" className="mp-select-light" />
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
                    />
                  </div>
                </form>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={goToPreviousStep}
                    disabled={processing}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver
                  </Button>
                  <Button 
                    type="submit"
                    form="form-checkout"
                    className="flex-1 gap-2 bg-cyan-500 hover:bg-cyan-600 text-white shadow-md"
                    disabled={!mpReady || processing}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePaymentSubmit();
                    }}
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

          {/* Order summary sidebar */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900">Resumen del pedido</h3>
              
              {/* Product image */}
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

              {/* Shipping preview */}
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

              {/* Contact preview */}
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
