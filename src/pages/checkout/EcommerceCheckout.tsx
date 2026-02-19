import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/i18n';
import {
  Loader2, ArrowRight, ArrowLeft, Mail, Phone,
  MapPin, CreditCard, CheckCircle2, Package, Truck,
  ShieldCheck, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useCheckoutConfig, CheckoutTheme } from '@/hooks/useCheckoutConfig';
import { CheckoutSplitLayout } from '@/components/checkout/CheckoutSplitLayout';
import { StepIndicator, Step } from '@/components/checkout/StepIndicator';
import { ThemedButton } from '@/components/checkout/ThemedButton';

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

  const {
    config,
    mergedTheme,
    logoUrl,
    heroImageUrl,
    checkoutTitle,
    hiddenFields,
    loading,
    error,
  } = useCheckoutConfig(orderId);

  const [currentStep, setCurrentStep] = useState<Step>('contact');
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // MP SDK state
  const [mpReady, setMpReady] = useState(false);
  const cardFormRef = useRef<any>(null);
  const mpInstanceRef = useRef<any>(null);

  // Forms
  const [contactForm, setContactForm] = useState<ContactForm>({ email: '', phone: '' });
  const [shippingForm, setShippingForm] = useState<ShippingForm>({
    name: '', lastname: '', address: '', city: '', province: '', postal_code: '',
  });

  // Pre-fill forms when config loads
  useEffect(() => {
    if (!config) return;
    const o = config.order;
    if (o.customer_email || o.customer_phone) {
      setContactForm({ email: o.customer_email || '', phone: o.customer_phone || '' });
    }
    if (o.shipping_name) {
      setShippingForm({
        name: o.shipping_name || '', lastname: o.shipping_lastname || '',
        address: o.shipping_address || '', city: o.shipping_city || '',
        province: o.shipping_province || '', postal_code: o.shipping_postal_code || '',
      });
    }
    if (o.status === 'paid') setCurrentStep('confirmation');
  }, [config]);

  const currentStepIndex = ['contact', 'shipping', 'payment', 'confirmation'].indexOf(currentStep);

  // ✅ MP: init CardForm only in payment step
  useEffect(() => {
    if (currentStep !== 'payment' || !config) return;

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
        'form-checkout', 'form-checkout__cardNumber', 'form-checkout__expirationDate',
        'form-checkout__securityCode', 'form-checkout__cardholderName', 'form-checkout__issuer',
        'form-checkout__installments', 'form-checkout__identificationType',
        'form-checkout__identificationNumber', 'form-checkout__cardholderEmail',
      ];
      for (let i = 0; i < 80; i++) {
        if (requiredIds.every(id => document.getElementById(id))) return;
        await new Promise(res => setTimeout(res, 50));
      }
      throw new Error('DOM no listo para CardForm');
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

        try { cardFormRef.current?.unmount?.(); } catch {}
        cardFormRef.current = null;

        const cardForm = mp.cardForm({
          amount: String(config.order.total_amount || 0),
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
              if (err) { setPaymentError('Error inicializando Mercado Pago.'); return; }
              setMpReady(true);
            },
            onSubmit: async (event: any) => {
              event.preventDefault();
              if (!cardFormRef.current) return;
              const data = cardFormRef.current?.getCardFormData?.();
              const token = data?.token;
              if (!token) { setPaymentError('MP no pudo generar el token.'); return; }
              await handlePaymentWithToken(data);
            },
            onError: (err: any) => {
              const msg = err?.cause?.[0]?.message || err?.message || 'Error de Mercado Pago';
              setPaymentError(msg);
            },
            onFetching: () => {},
          },
        });
        cardFormRef.current = cardForm;
      } catch (e) {
        if (mounted) setPaymentError('Error inicializando Mercado Pago.');
        setMpReady(true);
      }
    };

    initMPCardForm();
    return () => { mounted = false; try { cardFormRef.current?.unmount?.(); } catch {} cardFormRef.current = null; mpInstanceRef.current = null; setMpReady(false); };
  }, [currentStep, config?.order.total_amount]);

  // Save contact/shipping data
  const saveContactData = async () => {
    if (!contactForm.email || (!hiddenFields.includes('phone') && !contactForm.phone)) {
      toast({ title: 'Completá todos los campos', variant: 'destructive' }); return false;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_order_checkout_data', {
        _order_id: orderId, _customer_email: contactForm.email, _customer_phone: contactForm.phone,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) { toast({ title: result.error || 'Error', variant: 'destructive' }); return false; }
      return true;
    } catch { toast({ title: 'Error al guardar', variant: 'destructive' }); return false; }
    finally { setSaving(false); }
  };

  const saveShippingData = async () => {
    const { name, lastname, address, city, province, postal_code } = shippingForm;
    if (!name || !lastname || !address || !city || !province || !postal_code) {
      toast({ title: 'Completá todos los campos', variant: 'destructive' }); return false;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_order_checkout_data', {
        _order_id: orderId, _shipping_name: name, _shipping_lastname: lastname,
        _shipping_address: address, _shipping_city: city, _shipping_province: province,
        _shipping_postal_code: postal_code,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) { toast({ title: result.error || 'Error', variant: 'destructive' }); return false; }
      return true;
    } catch { toast({ title: 'Error al guardar', variant: 'destructive' }); return false; }
    finally { setSaving(false); }
  };

  const goToNextStep = async () => {
    if (currentStep === 'contact') { if (await saveContactData()) setCurrentStep('shipping'); }
    else if (currentStep === 'shipping') { if (await saveShippingData()) setCurrentStep('payment'); }
  };

  const goToPreviousStep = () => {
    if (currentStep === 'shipping') setCurrentStep('contact');
    else if (currentStep === 'payment') setCurrentStep('shipping');
  };

  const getPaymentErrorMessage = (detail: string): string => {
    const messages: Record<string, string> = {
      'cc_rejected_bad_filled_card_number': 'Número de tarjeta incorrecto',
      'cc_rejected_bad_filled_date': 'Fecha de vencimiento incorrecta',
      'cc_rejected_bad_filled_security_code': 'Código de seguridad incorrecto',
      'cc_rejected_insufficient_amount': 'Fondos insuficientes',
      'cc_rejected_high_risk': 'Pago rechazado por prevención de fraude',
      'cc_rejected_call_for_authorize': 'Debés autorizar el pago con tu banco',
      'cc_rejected_card_disabled': 'Tarjeta deshabilitada',
      'cc_rejected_duplicated_payment': 'Pago duplicado',
      'cc_rejected_max_attempts': 'Límite de intentos alcanzado',
    };
    return messages[detail] || detail;
  };

  const handlePaymentWithToken = async (cardFormData: any) => {
    if (processing) return;
    setProcessing(true); setPaymentError(null);
    try {
      const response = await supabase.functions.invoke('mp-pay', {
        body: {
          order_id: orderId, token: cardFormData.token,
          payment_method_id: cardFormData.paymentMethodId,
          issuer_id: cardFormData.issuerId,
          installments: parseInt(cardFormData.installments) || 1,
          payer: {
            email: contactForm.email,
            identification: cardFormData.identificationType && cardFormData.identificationNumber
              ? { type: cardFormData.identificationType, number: cardFormData.identificationNumber }
              : undefined,
          },
        },
      });
      if (response.error) throw response.error;
      const result = response.data as { success: boolean; status?: string; status_detail?: string; error?: string };
      if (result.success && result.status === 'approved') {
        setCurrentStep('confirmation');
        toast({ title: '¡Pago aprobado!' });
      } else if (result.success && (result.status === 'in_process' || result.status === 'pending')) {
        toast({ title: 'Pago en proceso' });
      } else {
        setPaymentError(getPaymentErrorMessage(result.status_detail || result.error || 'Error'));
      }
    } catch (err: any) {
      setPaymentError(err?.message || 'Error al procesar el pago');
    } finally { setProcessing(false); }
  };

  const theme = mergedTheme;

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen checkout-light flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-gray-500">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !config || !theme) {
    return (
      <div className="checkout-light min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-sm border border-gray-200">
          <Package className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-gray-500">{error || 'Pedido no encontrado'}</p>
        </div>
      </div>
    );
  }

  const order = config.order;

  // Confirmation
  if (currentStep === 'confirmation' || order.status === 'paid') {
    return (
      <div className="min-h-screen checkout-light flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-lg border border-gray-200">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <CheckCircle2 className="h-20 w-20 text-emerald-500 mx-auto relative" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-emerald-500">¡Pedido confirmado!</h1>
          <p className="text-gray-600 mb-6">Tu pedido de {order.product_name} fue procesado correctamente.</p>

          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3 mb-6 border border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-500">Producto</span>
              <span className="font-medium text-gray-900">{order.product_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total pagado</span>
              <span className="font-semibold" style={{ color: theme.primary_color }}>
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

          <ThemedButton
            primaryColor={theme.primary_color}
            buttonRadius={theme.button_radius}
            className="w-full"
            onClick={() => navigate(`/order/${orderId}/thanks`)}
          >
            Ver detalles del pedido
            <ArrowRight className="h-4 w-4" />
          </ThemedButton>
        </div>
      </div>
    );
  }

  // Main checkout with split layout
  return (
    <CheckoutSplitLayout
      theme={theme}
      logoUrl={logoUrl}
      heroImageUrl={heroImageUrl}
      checkoutTitle={checkoutTitle}
      productName={order.product_name}
      productDescription={config.product.description}
      productAmount={order.product_amount}
      shippingCost={order.shipping_cost}
      totalAmount={order.total_amount}
      currency={order.product_currency}
      benefits={theme.benefits}
      trustBadges={theme.trust_badges}
      shippingName={shippingForm.name}
      shippingLastname={shippingForm.lastname}
      shippingAddress={shippingForm.address}
      shippingCity={shippingForm.city}
      shippingProvince={shippingForm.province}
      shippingPostalCode={shippingForm.postal_code}
      customerEmail={contactForm.email}
      customerPhone={contactForm.phone}
      showShippingInfo={currentStepIndex >= 2}
      showContactInfo={currentStepIndex >= 1}
    >
      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} primaryColor={theme.primary_color} />

      {/* Contact step */}
      {currentStep === 'contact' && (
        <div className="bg-white rounded-xl p-6 space-y-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5" style={{ color: theme.primary_color }} />
            <h2 className="text-lg font-semibold">Datos de contacto</h2>
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="tu@email.com" value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            {!hiddenFields.includes('phone') && (
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input id="phone" type="tel" placeholder="+54 9 11 1234-5678" value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
            )}
          </div>
          <ThemedButton primaryColor={theme.primary_color} buttonRadius={theme.button_radius}
            className="w-full" onClick={goToNextStep} loading={saving}>
            Continuar a envío <ArrowRight className="h-4 w-4" />
          </ThemedButton>
        </div>
      )}

      {/* Shipping step */}
      {currentStep === 'shipping' && (
        <div className="bg-white rounded-xl p-6 space-y-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5" style={{ color: theme.primary_color }} />
            <h2 className="text-lg font-semibold">Dirección de envío</h2>
          </div>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" placeholder="Nombre" value={shippingForm.name}
                  onChange={(e) => setShippingForm(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">Apellido *</Label>
                <Input id="lastname" placeholder="Apellido" value={shippingForm.lastname}
                  onChange={(e) => setShippingForm(prev => ({ ...prev, lastname: e.target.value }))}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input id="address" placeholder="Calle y número, piso, depto" value={shippingForm.address}
                onChange={(e) => setShippingForm(prev => ({ ...prev, address: e.target.value }))}
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad *</Label>
                <Input id="city" placeholder="Ciudad" value={shippingForm.city}
                  onChange={(e) => setShippingForm(prev => ({ ...prev, city: e.target.value }))}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Provincia *</Label>
                <Input id="province" placeholder="Provincia" value={shippingForm.province}
                  onChange={(e) => setShippingForm(prev => ({ ...prev, province: e.target.value }))}
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Código Postal *</Label>
              <Input id="postal_code" placeholder="CP" value={shippingForm.postal_code}
                onChange={(e) => setShippingForm(prev => ({ ...prev, postal_code: e.target.value }))}
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 w-32"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" onClick={goToPreviousStep}
              className="h-10 px-4 gap-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 shadow-sm">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
            <ThemedButton primaryColor={theme.primary_color} buttonRadius={theme.button_radius}
              className="flex-1" onClick={goToNextStep} loading={saving}>
              Continuar a pago <ArrowRight className="h-4 w-4" />
            </ThemedButton>
          </div>
        </div>
      )}

      {/* Payment step */}
      {currentStep === 'payment' && (
        <div className="bg-white rounded-xl p-6 space-y-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5" style={{ color: theme.primary_color }} />
            <h2 className="text-lg font-semibold">Datos de pago</h2>
          </div>

          {paymentError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">{paymentError}</div>
          )}

          <div className="relative">
            {!mpReady && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.primary_color }} />
                <span className="ml-3 text-gray-500">Cargando formulario de pago...</span>
              </div>
            )}

            <form id="form-checkout" className="space-y-4 checkout-form-light">
              <div className="space-y-2">
                <Label>Número de tarjeta</Label>
                <input id="form-checkout__cardNumber" name="cardNumber" type="text" inputMode="numeric"
                  placeholder="Número de tarjeta" autoComplete="cc-number" className="mp-input-native-light" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vencimiento</Label>
                  <input id="form-checkout__expirationDate" name="expirationDate" type="text" inputMode="numeric"
                    placeholder="MM/YY" autoComplete="cc-exp" className="mp-input-native-light" />
                </div>
                <div className="space-y-2">
                  <Label>CVV</Label>
                  <input id="form-checkout__securityCode" name="securityCode" type="text" inputMode="numeric"
                    placeholder="CVV" autoComplete="cc-csc" className="mp-input-native-light" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nombre en la tarjeta</Label>
                <input id="form-checkout__cardholderName" name="cardholderName" type="text"
                  placeholder="Nombre como aparece en la tarjeta" autoComplete="cc-name" className="mp-input-native-light" />
              </div>
              <div className="mp-issuer-hidden">
                <select id="form-checkout__issuer" name="issuer" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <Label>Cuotas</Label>
                <select id="form-checkout__installments" name="installments" className="mp-select-light" />
              </div>
              {!hiddenFields.includes('document') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de documento</Label>
                    <select id="form-checkout__identificationType" name="identificationType" className="mp-select-light" />
                  </div>
                  <div className="space-y-2">
                    <Label>Número de documento</Label>
                    <input id="form-checkout__identificationNumber" name="identificationNumber" type="text"
                      placeholder="Número de documento" inputMode="numeric" className="mp-input-native-light" />
                  </div>
                </div>
              )}
              {hiddenFields.includes('document') && (
                <>
                  <select id="form-checkout__identificationType" name="identificationType" className="sr-only" />
                  <input id="form-checkout__identificationNumber" name="identificationNumber" type="hidden" />
                </>
              )}
              <div className="space-y-2">
                <Label>Email</Label>
                <input id="form-checkout__cardholderEmail" name="cardholderEmail" type="email"
                  placeholder="E-mail" autoComplete="email" className="mp-input-native-light"
                  defaultValue={contactForm.email} />
              </div>
            </form>
          </div>

          <div className="flex gap-3">
            <Button type="button" onClick={goToPreviousStep} disabled={processing}
              className="h-10 px-4 gap-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 shadow-sm">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
            <ThemedButton primaryColor={theme.primary_color} buttonRadius={theme.button_radius}
              type="submit" form="form-checkout" className="flex-1" loading={processing} disabled={!mpReady}>
              {processing ? 'Procesando...' : (
                <>
                  <Lock className="h-4 w-4" />
                  Pagar {formatCurrency(order.total_amount, order.product_currency as 'ARS' | 'BRL' | 'USD', 'es')}
                </>
              )}
            </ThemedButton>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="h-4 w-4" />
            Pago seguro procesado por Mercado Pago
          </div>
        </div>
      )}
    </CheckoutSplitLayout>
  );
};

export default EcommerceCheckout;
