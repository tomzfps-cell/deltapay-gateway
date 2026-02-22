import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMerchantProducts } from '@/hooks/useMerchantData';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/i18n';
import { Plus, MoreVertical, Copy, ExternalLink, Check, Loader2, Pencil, Power, PowerOff, Upload, ImageIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
});

type ProductFormData = z.infer<typeof productSchema> & { image_url: string; checkout_template_id: string };

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Collapsible states
  const [openSections, setOpenSections] = useState({
    basic: true,
    pricing: true,
    image: false,
    checkout: false,
    redirect: false,
  });

  const [checkoutTemplates, setCheckoutTemplates] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    currency: 'ARS',
    slug: '',
    redirect_url: '',
    image_url: '',
    checkout_template_id: '',
  });

  useEffect(() => {
    if (!merchant?.id) return;
    supabase
      .from('checkout_templates')
      .select('id, name')
      .eq('merchant_id', merchant.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        if (data) setCheckoutTemplates(data as any);
      });
  }, [merchant?.id]);

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: 0, currency: 'ARS', slug: '', redirect_url: '', image_url: '', checkout_template_id: '' });
    setImagePreview(null);
    setErrors({});
    setOpenSections({ basic: true, pricing: true, image: false, checkout: false, redirect: false });
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
      checkout_template_id: (product as any).checkout_template_id || '',
    });
    setImagePreview(product.image_url || null);
    setErrors({});
    setOpenSections({ basic: true, pricing: true, image: false, checkout: false, redirect: false });
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !merchant?.id) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Solo se permiten imágenes', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'La imagen no debe superar 5MB', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${merchant.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, image_url: publicUrl }));
      setImagePreview(publicUrl);
    } catch (err: any) {
      console.error('Error uploading image:', err);
      toast({ title: 'Error al subir la imagen', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      const productData: any = {
        merchant_id: merchant.id,
        name: formData.name,
        description: formData.description || null,
        price: formData.price,
        currency: formData.currency,
        slug: formData.slug,
        redirect_url: formData.redirect_url || null,
        image_url: formData.image_url || null,
        checkout_template_id: formData.checkout_template_id || null,
      };
      if (editingProduct) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: t('productUpdated') });
      } else {
        const { error } = await supabase.from('products').insert(productData);
        if (error) {
          if (error.code === '23505') {
            setErrors({ slug: t('slugInUse') });
            setIsSaving(false);
            return;
          }
          throw error;
        }
        toast({ title: t('productCreated') });
      }
      queryClient.invalidateQueries({ queryKey: ['merchant-products'] });
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error('Error saving product:', err);
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id);
      if (error) throw error;
      toast({ title: product.is_active ? t('productDeactivated') : t('productActivated') });
      queryClient.invalidateQueries({ queryKey: ['merchant-products'] });
    } catch (err: any) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  };

  const copyLink = (product: Product) => {
    const url = `${window.location.origin}/p/${product.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(product.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: t('linkCopied') });
  };

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const SectionHeader = ({ sectionKey, title }: { sectionKey: keyof typeof openSections; title: string }) => (
    <CollapsibleTrigger asChild>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        onClick={() => toggleSection(sectionKey)}
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections[sectionKey] ? 'rotate-180' : ''}`} />
      </button>
    </CollapsibleTrigger>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('products')}</h1>
          <p className="text-muted-foreground">{t('manageProducts')}</p>
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
          <p className="text-muted-foreground mb-4">{t('noProducts')}</p>
          <Button onClick={openCreateDialog}>{t('createFirstProduct')}</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(products as Product[])?.map((product) => (
            <div key={product.id} className="glass rounded-xl overflow-hidden transition-all hover:border-primary/30">
              {product.image_url ? (
                <div className="aspect-video bg-muted">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-muted/30 flex items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      {!product.is_active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t('inactive')}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.description || t('noDescription')}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-strong">
                      <DropdownMenuItem className="gap-2" onClick={() => copyLink(product)} disabled={!product.slug}>
                        {copiedId === product.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {t('copyLink')}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" asChild disabled={!product.slug || !product.is_active}>
                        <a href={`/p/${product.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />{t('openCheckout')}
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(product)}>
                        <Pencil className="h-4 w-4" />{t('edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2" onClick={() => toggleActive(product)}>
                        {product.is_active ? (<><PowerOff className="h-4 w-4" />{t('deactivate')}</>) : (<><Power className="h-4 w-4" />{t('activate')}</>)}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="stat-value text-2xl">{formatCurrency(product.price, product.currency, locale)}</span>
                </div>
                {product.slug && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground font-mono truncate">/p/{product.slug}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-strong sm:max-w-lg flex flex-col max-h-[85vh] p-0 gap-0 overflow-hidden">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur px-6 py-4">
            <DialogHeader>
              <DialogTitle>{editingProduct ? t('editProduct') : t('newProduct')}</DialogTitle>
              <DialogDescription>
                {editingProduct ? t('modifyProductData') : t('createProductWithLink')}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {/* Section: Datos básicos */}
            <Collapsible open={openSections.basic}>
              <SectionHeader sectionKey="basic" title={t('nameRequired')} />
              <CollapsibleContent className="space-y-4 pt-3 pb-1">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('nameRequired')} *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Mi Producto" className="input-field" maxLength={100} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t('descriptionOptional')}</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} placeholder="Descripción del producto..." className="input-field" maxLength={500} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">{t('slugLabel')} *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/p/</span>
                    <Input id="slug" value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="mi-producto" className="input-field" maxLength={50} />
                  </div>
                  {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Section: Precio */}
            <Collapsible open={openSections.pricing}>
              <SectionHeader sectionKey="pricing" title={t('priceLabel')} />
              <CollapsibleContent className="space-y-4 pt-3 pb-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">{t('priceLabel')} *</Label>
                    <Input id="price" type="number" step="0.01" min="0" value={formData.price || ''} onChange={(e) => setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))} placeholder="1000" className="input-field" />
                    {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">{t('currencyLabel')} *</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData((prev) => ({ ...prev, currency: v as 'ARS' | 'BRL' | 'USD' }))}>
                      <SelectTrigger className="input-field"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                        <SelectItem value="BRL">BRL (Reais)</SelectItem>
                        <SelectItem value="USD">USD (Dólares)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Section: Imagen */}
            <Collapsible open={openSections.image}>
              <SectionHeader sectionKey="image" title={t('imageLabel')} />
              <CollapsibleContent className="space-y-2 pt-3 pb-1">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                {imagePreview ? (
                  <div className="space-y-2">
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted border border-border">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <Button type="button" variant="outline" size="sm" className="gap-2" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {isUploading ? t('uploading') : t('changeImage')}
                    </Button>
                  </div>
                ) : (
                  <button type="button" className="w-full aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
                    {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : (<><Upload className="h-8 w-8" /><span className="text-sm">{t('selectImage')}</span></>)}
                  </button>
                )}
                <p className="text-xs text-muted-foreground">{t('imageHint')}</p>
              </CollapsibleContent>
            </Collapsible>

            {/* Section: Checkout template */}
            <Collapsible open={openSections.checkout}>
              <SectionHeader sectionKey="checkout" title="Checkout Template" />
              <CollapsibleContent className="space-y-2 pt-3 pb-1">
                <Select value={formData.checkout_template_id || '_default'} onValueChange={(v) => setFormData(prev => ({ ...prev, checkout_template_id: v === '_default' ? '' : v }))}>
                  <SelectTrigger className="input-field"><SelectValue placeholder="Default del merchant" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_default">Default del merchant</SelectItem>
                    {checkoutTemplates.map(tmpl => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Plantilla de checkout que se usará para este producto</p>
              </CollapsibleContent>
            </Collapsible>

            {/* Section: Redirect */}
            <Collapsible open={openSections.redirect}>
              <SectionHeader sectionKey="redirect" title={t('redirectUrlLabel')} />
              <CollapsibleContent className="space-y-2 pt-3 pb-1">
                <Input id="redirect_url" value={formData.redirect_url} onChange={(e) => setFormData((prev) => ({ ...prev, redirect_url: e.target.value }))} placeholder="https://tudominio.com/gracias" className="input-field" />
                <p className="text-xs text-muted-foreground">{t('redirectUrlHint')}</p>
                {errors.redirect_url && <p className="text-sm text-destructive">{errors.redirect_url}</p>}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 z-10 border-t border-border/50 bg-background/95 backdrop-blur px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="btn-primary-glow">
              {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('saving')}</>) : t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
