import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMerchantProducts } from '@/hooks/useMerchantData';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/i18n';
import { Plus, MoreVertical, Copy, ExternalLink, Check, Loader2, Pencil, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0.01, 'Precio debe ser mayor a 0'),
  currency: z.enum(['ARS', 'BRL', 'USD']),
  slug: z.string().min(1, 'Slug requerido').max(50).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  redirect_url: z.string().url('URL inválida').startsWith('https://', 'Debe usar HTTPS').optional().or(z.literal('')),
  image_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: 'ARS' | 'BRL' | 'USD';
  slug: string | null;
  redirect_url: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export const Products: React.FC = () => {
  const { t, locale } = useApp();
  const { merchant } = useAuth();
  const { data: products, isLoading } = useMerchantProducts();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    currency: 'ARS',
    slug: '',
    redirect_url: '',
    image_url: '',
  });

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      currency: 'ARS',
      slug: '',
      redirect_url: '',
      image_url: '',
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      currency: product.currency,
      slug: product.slug || '',
      redirect_url: product.redirect_url || '',
      image_url: product.image_url || '',
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === generateSlug(prev.name) ? generateSlug(name) : prev.slug,
    }));
  };

  const handleSave = async () => {
    setErrors({});

    const result = productSchema.safeParse({
      ...formData,
      redirect_url: formData.redirect_url || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!merchant?.id) return;

    setIsSaving(true);

    try {
      const productData = {
        merchant_id: merchant.id,
        name: formData.name,
        description: formData.description || null,
        price: formData.price,
        currency: formData.currency,
        slug: formData.slug,
        redirect_url: formData.redirect_url || null,
        image_url: formData.image_url || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({ title: 'Producto actualizado' });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) {
          if (error.code === '23505') {
            setErrors({ slug: 'Este slug ya está en uso' });
            setIsSaving(false);
            return;
          }
          throw error;
        }

        toast({ title: 'Producto creado' });
      }

      queryClient.invalidateQueries({ queryKey: ['merchant-products'] });
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error('Error saving product:', err);
      toast({
        title: 'Error',
        description: err.message || 'No se pudo guardar el producto',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: product.is_active ? 'Producto desactivado' : 'Producto activado',
      });

      queryClient.invalidateQueries({ queryKey: ['merchant-products'] });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const copyLink = (product: Product) => {
    const url = `${window.location.origin}/p/${product.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(product.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Link copiado' });
  };

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
        <Button className="gap-2 btn-primary-glow" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          {t('createProduct')}
        </Button>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : products?.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-muted-foreground mb-4">No tienes productos aún</p>
          <Button onClick={openCreateDialog}>Crear tu primer producto</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(products as Product[])?.map((product) => (
            <div
              key={product.id}
              className="glass rounded-xl p-6 transition-all hover:border-primary/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{product.name}</h3>
                    {!product.is_active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {product.description || 'Sin descripción'}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-strong">
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => copyLink(product)}
                      disabled={!product.slug}
                    >
                      {copiedId === product.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copiar link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      asChild
                      disabled={!product.slug || !product.is_active}
                    >
                      <a
                        href={`/p/${product.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir checkout
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => openEditDialog(product)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => toggleActive(product)}
                    >
                      {product.is_active ? (
                        <>
                          <PowerOff className="h-4 w-4" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4" />
                          Activar
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="stat-value text-2xl">
                  {formatCurrency(product.price, product.currency, locale)}
                </span>
              </div>

              {product.slug && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    /p/{product.slug}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-strong sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Modifica los datos del producto'
                : 'Crea un nuevo producto con link de pago'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Mi Producto"
                className="input-field"
                maxLength={100}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del producto..."
                className="input-field"
                maxLength={500}
                rows={3}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="1000"
                  className="input-field"
                />
                {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moneda *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, currency: v as 'ARS' | 'BRL' | 'USD' }))}
                >
                  <SelectTrigger className="input-field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                    <SelectItem value="BRL">BRL (Reais)</SelectItem>
                    <SelectItem value="USD">USD (Dólares)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/p/</span>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="mi-producto"
                  className="input-field"
                  maxLength={50}
                />
              </div>
              {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">URL de imagen (opcional)</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="input-field"
              />
              <p className="text-xs text-muted-foreground">
                Imagen del producto que se mostrará en la landing y checkout
              </p>
              {errors.image_url && <p className="text-sm text-destructive">{errors.image_url}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirect_url">URL de redirección (opcional)</Label>
              <Input
                id="redirect_url"
                value={formData.redirect_url}
                onChange={(e) => setFormData((prev) => ({ ...prev, redirect_url: e.target.value }))}
                placeholder="https://tudominio.com/gracias"
                className="input-field"
              />
              <p className="text-xs text-muted-foreground">
                Después del pago, el cliente será redirigido aquí
              </p>
              {errors.redirect_url && <p className="text-sm text-destructive">{errors.redirect_url}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-primary-glow">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
