import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Email inválido'),
});

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = schema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (authError) {
        // Por seguridad, no revelar si el email existe o no
        console.error('Reset password error:', authError.message);
      }

      // Siempre mostrar éxito para no revelar si el email existe
      setSent(true);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: 'Error inesperado',
        description: 'Intentá de nuevo más tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-2xl font-bold text-primary-foreground">Δ</span>
            </div>
            <span className="text-3xl font-bold text-foreground">DeltaPay</span>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Recuperar contraseña</h2>
          <p className="mt-2 text-muted-foreground">
            Te enviaremos un link para restablecer tu contraseña
          </p>
        </div>

        <div className="glass rounded-xl p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-4 text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <div>
                <p className="font-semibold text-foreground text-lg">¡Email enviado!</p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Si existe una cuenta con ese email, recibirás un link para restablecer tu contraseña. Revisá también tu carpeta de spam.
                </p>
              </div>
              <Link to="/login">
                <Button variant="outline" className="gap-2 mt-2">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  autoComplete="email"
                  autoFocus
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <Button
                type="submit"
                className="w-full btn-primary-glow"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar link de recuperación'
                )}
              </Button>

              <div className="text-center">
                <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" />
                  Volver al login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
