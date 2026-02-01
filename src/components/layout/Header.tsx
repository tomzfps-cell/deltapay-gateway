import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Globe, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Locale, Currency } from '@/lib/i18n';

const languages: { value: Locale; label: string; flag: string }[] = [
  { value: 'es', label: 'Español', flag: '🇦🇷' },
  { value: 'pt', label: 'Português', flag: '🇧🇷' },
];

const currencies: { value: Currency; label: string }[] = [
  { value: 'ARS', label: 'ARS $' },
  { value: 'BRL', label: 'BRL R$' },
  { value: 'USD', label: 'USD US$' },
];

export const Header: React.FC = () => {
  const { locale, currency, setLocale, setCurrency, setSidebarOpen, sidebarOpen } = useApp();
  const { merchant, signOut } = useAuth();
  const navigate = useNavigate();

  const currentLang = languages.find((l) => l.value === locale);
  const currentCurrency = currencies.find((c) => c.value === currency);

  const initials = merchant?.business_name
    ? merchant.business_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'DP';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Language selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{currentLang?.flag}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong">
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.value}
                onClick={() => setLocale(lang.value)}
                className={cn(locale === lang.value && 'bg-primary/10 text-primary')}
              >
                <span className="mr-2">{lang.flag}</span>
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Currency selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 font-mono">
              <span>{currentCurrency?.label}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong">
            {currencies.map((curr) => (
              <DropdownMenuItem
                key={curr.value}
                onClick={() => setCurrency(curr.value)}
                className={cn(
                  'font-mono',
                  currency === curr.value && 'bg-primary/10 text-primary'
                )}
              >
                {curr.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 pl-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start sm:flex">
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {merchant?.business_name || 'Mi Negocio'}
                </span>
                <span className="text-xs text-muted-foreground">Merchant</span>
              </div>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-strong w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
