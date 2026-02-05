import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/i18n';
import { 
  Loader2, ArrowRight, Building2, Package, ShieldCheck, 
  Truck, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  merchant_name: string;
  image_url: string | null;
}

export const ProductLanding: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form for initial customer data
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Load product data
  const loadProduct = useCallback(async (slug: string) => {
    try {
      const { data, error: queryError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          currency,
          image_url,
          merchant:merchants!products_merchant_id_fkey(business_name)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (queryError) throw queryError;

      if (!data) {
        setError('Producto no encontrado');
        return;
      }

      setProduct({
        id: data.id,
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency,
        image_url: (data as any).image_url || null,
        merchant_name: (data.merchant as any)?.business_name || 'DeltaPay',
      });
    } catch (err) {
      console.error('Error loading product:', err);
      setError('Producto no encontrado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (productSlug) {
      loadProduct(productSlug);
    } else {
      setError('Producto no válido');
      setLoading(false);
    }
  }, [productSlug, loadProduct]);

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

      // Navigate to checkout
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Producto no encontrado</h1>
          <p className="text-muted-foreground">{error || 'Este producto no existe o no está disponible'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{product.merchant_name}</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product info */}
          <div className="space-y-6">
            <div className="glass rounded-xl p-6 space-y-4">
              {product.image_url ? (
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              
              <div>
                <h2 className="text-2xl font-bold">{product.name}</h2>
                {product.description && (
                  <p className="text-muted-foreground mt-2">{product.description}</p>
                )}
              </div>

              <div className="stat-value text-3xl">
                {formatCurrency(product.price, product.currency as 'ARS' | 'BRL' | 'USD', 'es')}
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass rounded-lg p-3 text-center">
                <ShieldCheck className="h-6 w-6 text-primary mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Pago seguro</span>
              </div>
              <div className="glass rounded-lg p-3 text-center">
                <Truck className="h-6 w-6 text-primary mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Envío a domicilio</span>
              </div>
              <div className="glass rounded-lg p-3 text-center">
                <CreditCard className="h-6 w-6 text-primary mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Todas las tarjetas</span>
              </div>
            </div>
          </div>

          {/* Checkout form */}
          <div className="glass rounded-xl p-6 space-y-6">
            <h3 className="text-lg font-semibold">Comenzar compra</h3>

            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Completá tus datos de contacto y envío en el siguiente paso.
              </p>

              <Button 
                className="w-full btn-primary-glow gap-2 h-12 text-base"
                disabled={creating}
                onClick={handleStartCheckout}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creando pedido...
                  </>
                ) : (
                  <>
                    Continuar al checkout
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total a pagar</span>
                <span className="font-semibold">
                  {formatCurrency(product.price, product.currency as 'ARS' | 'BRL' | 'USD', 'es')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductLanding;
