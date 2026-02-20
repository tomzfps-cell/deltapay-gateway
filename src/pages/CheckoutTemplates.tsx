import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, MoreVertical, Loader2, Copy, Star, StarOff, Pencil, Trash2, LayoutTemplate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface CheckoutTemplate {
  id: string;
  merchant_id: string;
  name: string;
  locale: string;
  layout_style: string;
  theme_tokens: {
    primary_color?: string;
    brand_name?: string;
    [key: string]: any;
  };
  content_blocks: {
    benefits?: string[];
    trust_badges?: string[];
    checkout_title?: string | null;
  };
  assets: {
    logo_path?: string | null;
    hero_image_path?: string | null;
  };
  fields_config: {
    hide_fields?: string[];
  };
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const CheckoutTemplates: React.FC = () => {
  const { merchant } = useAuth();
  const { t } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<CheckoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    if (!merchant?.id) return;
    const { data, error } = await supabase
      .from('checkout_templates')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) setTemplates(data as unknown as CheckoutTemplate[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, [merchant?.id]);

  const handleCreate = async () => {
    if (!merchant?.id) return;
    const { data, error } = await supabase
      .from('checkout_templates')
      .insert({
        merchant_id: merchant.id,
        name: `Template ${templates.length + 1}`,
        is_default: templates.length === 0,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error al crear template', variant: 'destructive' });
      return;
    }
    navigate(`/checkout-templates/${(data as any).id}`);
  };

  const handleDuplicate = async (template: CheckoutTemplate) => {
    if (!merchant?.id) return;
    const { data, error } = await supabase
      .from('checkout_templates')
      .insert({
        merchant_id: merchant.id,
        name: `${template.name} (copia)`,
        locale: template.locale,
        layout_style: template.layout_style,
        theme_tokens: template.theme_tokens,
        fields_config: template.fields_config,
        content_blocks: template.content_blocks,
        assets: template.assets,
        is_default: false,
      })
      .select()
      .single();

    if (!error) {
      toast({ title: 'Template duplicado' });
      loadTemplates();
    }
  };

  const handleSetDefault = async (template: CheckoutTemplate) => {
    if (!merchant?.id) return;
    // Remove current default
    await supabase
      .from('checkout_templates')
      .update({ is_default: false })
      .eq('merchant_id', merchant.id)
      .eq('is_default', true);

    // Set new default
    await supabase
      .from('checkout_templates')
      .update({ is_default: true })
      .eq('id', template.id);

    toast({ title: 'Template por defecto actualizado' });
    loadTemplates();
  };

  const handleDelete = async (template: CheckoutTemplate) => {
    if (template.is_default) {
      toast({ title: 'No se puede eliminar el template por defecto', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('checkout_templates')
      .delete()
      .eq('id', template.id);

    if (!error) {
      toast({ title: 'Template eliminado' });
      loadTemplates();
    }
  };

  const getLogoUrl = (template: CheckoutTemplate) => {
    const path = template.assets?.logo_path;
    if (!path) return null;
    return supabase.storage.from('merchant-assets').getPublicUrl(path).data.publicUrl;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6 text-primary" />
            Checkout Templates
          </h1>
          <p className="text-muted-foreground">Creá y personalizá las plantillas de checkout para tus productos</p>
        </div>
        <Button className="gap-2 btn-primary-glow" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Nuevo Template
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No tenés templates de checkout aún</p>
          <Button onClick={handleCreate}>Crear tu primer template</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => {
            const logoUrl = getLogoUrl(tmpl);
            const primaryColor = tmpl.theme_tokens?.primary_color || '#06B6D4';

            return (
              <div key={tmpl.id} className="glass rounded-xl overflow-hidden transition-all hover:border-primary/30">
                {/* Color bar preview */}
                <div className="h-2" style={{ backgroundColor: primaryColor }} />

                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {logoUrl ? (
                        <img src={logoUrl} alt="" className="h-8 w-8 object-contain rounded" />
                      ) : (
                        <div
                          className="h-8 w-8 rounded flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {tmpl.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold">{tmpl.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {tmpl.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                          <span className="text-xs text-muted-foreground capitalize">{tmpl.layout_style}</span>
                          <span className="text-xs text-muted-foreground uppercase">{tmpl.locale}</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-strong">
                        <DropdownMenuItem className="gap-2" onClick={() => navigate(`/checkout-templates/${tmpl.id}`)}>
                          <Pencil className="h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onClick={() => handleDuplicate(tmpl)}>
                          <Copy className="h-4 w-4" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {!tmpl.is_default && (
                          <DropdownMenuItem className="gap-2" onClick={() => handleSetDefault(tmpl)}>
                            <Star className="h-4 w-4" /> Setear como default
                          </DropdownMenuItem>
                        )}
                        {!tmpl.is_default && (
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(tmpl)}>
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Mini color palette */}
                  <div className="flex gap-1.5">
                    {['primary_color', 'secondary_color', 'background_color', 'text_color'].map((key) => (
                      <div
                        key={key}
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: (tmpl.theme_tokens as any)?.[key] || '#ccc' }}
                        title={key}
                      />
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => navigate(`/checkout-templates/${tmpl.id}`)}
                  >
                    <Pencil className="h-3 w-3" /> Editar template
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CheckoutTemplates;
