import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/i18n';
import {
  Loader2, ArrowRight, Package, ShieldCheck,
  Truck, CreditCard, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProductLandingConfig } from '@/hooks/useProductLandingConfig';
import { themeToCSS } from '@/hooks/useCheckoutConfig';
import { ThemedButton } from '@/components/checkout/ThemedButton';
import { ThemeDebugBadge } from '@/components/checkout/ThemeDebugBadge';

export const ProductLanding: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { config, theme, logoUrl, heroImageUrl, debugMeta, loading, error } = useProductLandingConfig(productSlug);
  const [creating, setCreating] = useState(false);

  const handleStartCheckout = async () => {
    setCreating(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_order_from_product', {
        _product_slug: productSlug!,
        _customer_email: '',
        _customer_phone: '',
        _shipping_name: '',
        _shipping_lastname: '',
        _shipping_address: '',
        _shipping_city: '',
        _shipping_province: '',
        _shipping_postal_code: '',
        _shipping_cost: 0,
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as { success: boolean; order_id?: string; error?: string };

      if (!result.success) {
        toast({ title: result.error || 'Error al crear el pedido', variant: 'destructive' });
        return;
      }

      navigate(`/checkout/${result.order_id}`);
    } catch (err: any) {
      console.error('Error creating order:', err);
      toast({ title: 'Error al crear el pedido', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="text-center space-y-4">
          <Loader2
            className="h-12 w-12 animate-spin mx-auto"
            style={{ color: '#6b7280' }}
          />
          <p style={{ color: '#6b7280' }}>Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (error || !config || !theme) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="rounded-2xl p-8 text-center max-w-md bg-white shadow-sm border border-gray-200">
          <Package className="h-16 w-16 mx-auto mb-4" style={{ color: '#9ca3af' }} />
          <h1 className="text-xl font-semibold mb-2">Producto no encontrado</h1>
          <p style={{ color: '#6b7280' }}>{error || 'Este producto no existe o no está disponible'}</p>
        </div>
      </div>
    );
  }

  const product = config.product;
  const cssVars = themeToCSS(theme);
  const currencyTyped = product.currency as 'ARS' | 'BRL' | 'USD';
  const benefits = theme.benefits || [];
  const trustBadges = theme.trust_badges || [];

  return (
    <div className="min-h-screen" style={cssVars}>
      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Header — same pattern as CheckoutSplitLayout */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={theme.brand_name}
              className="h-10 mx-auto mb-3 object-contain"
            />
          ) : (
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
              style={{ backgroundColor: `${theme.primary_color}15` }}
            >
              <Package className="h-6 w-6" style={{ color: theme.primary_color }} />
            </div>
          )}
          <h1 className="text-xl font-bold">{theme.brand_name}</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product info */}
          <div className="space-y-6">
            <div className="rounded-xl p-6 space-y-4 bg-white shadow-sm border" style={{ borderColor: '#e5e7eb' }}>
              {heroImageUrl ? (
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={heroImageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package className="h-16 w-16" style={{ color: '#9ca3af' }} />
                </div>
              )}

              <div>
                <h2 className="text-2xl font-bold">{product.name}</h2>
                {product.description && (
                  <p className="mt-2" style={{ color: '#6b7280' }}>{product.description}</p>
                )}
              </div>

              <div className="text-3xl font-bold" style={{ color: theme.primary_color }}>
                {formatCurrency(product.price, currencyTyped, 'es')}
              </div>
            </div>

            {/* Benefits */}
            {benefits.length > 0 && (
              <div className="rounded-xl p-5 space-y-3 bg-white border" style={{ borderColor: '#e5e7eb' }}>
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.primary_color }} />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {trustBadges.length > 0 ? (
                trustBadges.slice(0, 3).map((badge, i) => (
                  <div key={i} className="rounded-lg p-3 text-center bg-white border" style={{ borderColor: '#e5e7eb' }}>
                    {i === 0 && <ShieldCheck className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />}
                    {i === 1 && <Truck className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />}
                    {i === 2 && <CreditCard className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />}
                    <span className="text-xs" style={{ color: '#6b7280' }}>{badge}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="rounded-lg p-3 text-center bg-white border" style={{ borderColor: '#e5e7eb' }}>
                    <ShieldCheck className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />
                    <span className="text-xs" style={{ color: '#6b7280' }}>Pago seguro</span>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-white border" style={{ borderColor: '#e5e7eb' }}>
                    <Truck className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />
                    <span className="text-xs" style={{ color: '#6b7280' }}>Envío a domicilio</span>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-white border" style={{ borderColor: '#e5e7eb' }}>
                    <CreditCard className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />
                    <span className="text-xs" style={{ color: '#6b7280' }}>Todas las tarjetas</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Checkout CTA */}
          <div className="rounded-xl p-6 space-y-6 bg-white shadow-sm border h-fit" style={{ borderColor: '#e5e7eb' }}>
            <h3 className="text-lg font-semibold">Comenzar compra</h3>

            <div className="space-y-4">
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Completá tus datos de contacto y envío en el siguiente paso.
              </p>

              <ThemedButton
                primaryColor={theme.primary_color}
                buttonRadius={theme.button_radius}
                className="w-full h-12 text-base"
                disabled={creating}
                loading={creating}
                onClick={handleStartCheckout}
              >
                {creating ? 'Creando pedido...' : 'Continuar al checkout'}
                {!creating && <ArrowRight className="h-5 w-5" />}
              </ThemedButton>
            </div>

            <div className="border-t pt-4" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6b7280' }}>Total a pagar</span>
                <span className="font-semibold" style={{ color: theme.primary_color }}>
                  {formatCurrency(product.price, currencyTyped, 'es')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ThemeDebugBadge info={{
        view: 'landing',
        productId: debugMeta.productId || undefined,
        merchantId: debugMeta.merchantId || undefined,
        templateId: debugMeta.templateId,
        resolutionSource: debugMeta.resolutionSource,
        primaryColor: theme.primary_color,
        brandName: theme.brand_name,
        layoutStyle: theme.layout_style,
        logoPath: theme.logo_path,
      }} />
    </div>
  );
};

export default ProductLanding;
