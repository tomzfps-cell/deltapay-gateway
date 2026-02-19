import React from 'react';
import { CheckoutTheme, themeToCSS } from '@/hooks/useCheckoutConfig';
import { formatCurrency } from '@/lib/i18n';
import { Package, ShieldCheck, Truck, CreditCard, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckoutSplitLayoutProps {
  theme: CheckoutTheme;
  logoUrl: string | null;
  heroImageUrl: string | null;
  checkoutTitle: string;
  productName: string;
  productDescription: string | null;
  productAmount: number;
  shippingCost: number;
  totalAmount: number;
  currency: string;
  benefits: string[];
  trustBadges: string[];
  // Sidebar info
  shippingName?: string;
  shippingLastname?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingProvince?: string;
  shippingPostalCode?: string;
  customerEmail?: string;
  customerPhone?: string;
  showShippingInfo?: boolean;
  showContactInfo?: boolean;
  children: React.ReactNode;
}

export const CheckoutSplitLayout: React.FC<CheckoutSplitLayoutProps> = ({
  theme,
  logoUrl,
  heroImageUrl,
  checkoutTitle,
  productName,
  productDescription,
  productAmount,
  shippingCost,
  totalAmount,
  currency,
  benefits,
  trustBadges,
  shippingName,
  shippingLastname,
  shippingAddress,
  shippingCity,
  shippingProvince,
  shippingPostalCode,
  customerEmail,
  customerPhone,
  showShippingInfo,
  showContactInfo,
  children,
}) => {
  const cssVars = themeToCSS(theme);
  const currencyTyped = currency as 'ARS' | 'BRL' | 'USD';

  return (
    <div className="min-h-screen" style={cssVars}>
      <div className="max-w-6xl mx-auto p-4 py-8">
        {/* Header with logo */}
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

        <div className="grid lg:grid-cols-[1fr,400px] gap-8">
          {/* Right side: Form (children) - appears first on mobile */}
          <div className="order-2 lg:order-1">
            {children}
          </div>

          {/* Left side: Order summary - sticky sidebar */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-8 h-fit space-y-4">
            <div
              className="rounded-xl p-6 space-y-4 shadow-sm border"
              style={{
                backgroundColor: 'white',
                borderColor: '#e5e7eb',
              }}
            >
              <h3 className="font-semibold text-lg">{checkoutTitle || 'Resumen del pedido'}</h3>

              {/* Hero image */}
              {heroImageUrl && (
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={heroImageUrl}
                    alt={productName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Product details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div>
                    <span className="font-medium">{productName}</span>
                    {productDescription && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{productDescription}</p>
                    )}
                  </div>
                  <span>{formatCurrency(productAmount, currencyTyped, 'es')}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Envío</span>
                  <span>
                    {shippingCost > 0
                      ? formatCurrency(shippingCost, currencyTyped, 'es')
                      : 'Gratis'}
                  </span>
                </div>

                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold" style={{ color: theme.primary_color }}>
                    {formatCurrency(totalAmount, currencyTyped, 'es')}
                  </span>
                </div>
              </div>

              {/* Shipping info */}
              {showShippingInfo && shippingAddress && (
                <div className="border-t pt-4">
                  <div className="flex items-start gap-2 text-sm">
                    <Truck className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{shippingName} {shippingLastname}</p>
                      <p className="text-gray-500">
                        {shippingAddress}<br />
                        {shippingCity}, {shippingProvince} {shippingPostalCode}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact info */}
              {showContactInfo && customerEmail && (
                <div className="border-t pt-4 space-y-1">
                  <p className="text-sm text-gray-600">📧 {customerEmail}</p>
                  {customerPhone && <p className="text-sm text-gray-600">📞 {customerPhone}</p>}
                </div>
              )}
            </div>

            {/* Benefits */}
            {benefits.length > 0 && (
              <div
                className="rounded-xl p-5 space-y-3 border"
                style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}
              >
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.primary_color }} />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Trust badges */}
            {trustBadges.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {trustBadges.slice(0, 3).map((badge, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3 text-center border"
                    style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}
                  >
                    {i === 0 && <ShieldCheck className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />}
                    {i === 1 && <Truck className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />}
                    {i === 2 && <CreditCard className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />}
                    <span className="text-xs text-gray-500">{badge}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Default trust badges if none configured */}
            {trustBadges.length === 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 text-center border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
                  <ShieldCheck className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />
                  <span className="text-xs text-gray-500">Pago seguro</span>
                </div>
                <div className="rounded-lg p-3 text-center border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
                  <Truck className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />
                  <span className="text-xs text-gray-500">Envío a domicilio</span>
                </div>
                <div className="rounded-lg p-3 text-center border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
                  <CreditCard className="h-5 w-5 mx-auto mb-1" style={{ color: theme.primary_color }} />
                  <span className="text-xs text-gray-500">Todas las tarjetas</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSplitLayout;
