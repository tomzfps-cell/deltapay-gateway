export type Locale = 'es' | 'pt';

export type Currency = 'ARS' | 'BRL' | 'USD';

export const translations = {
  es: {
    // Navigation
    dashboard: 'Dashboard',
    payments: 'Pagos',
    products: 'Productos',
    withdrawals: 'Retiros',
    webhooks: 'Webhooks',
    apiKeys: 'API Keys',
    settings: 'Configuración',
    
    // Dashboard
    welcomeBack: 'Bienvenido de nuevo',
    totalBalance: 'Balance Total',
    todaySales: 'Ventas Hoy',
    pendingPayouts: 'Retiros Pendientes',
    conversionRate: 'Tasa de Conversión',
    recentTransactions: 'Transacciones Recientes',
    viewAll: 'Ver Todo',
    
    // Payments
    amount: 'Monto',
    status: 'Estado',
    date: 'Fecha',
    customer: 'Cliente',
    confirmed: 'Confirmado',
    pending: 'Pendiente',
    failed: 'Fallido',
    expired: 'Expirado',
    
    // Products
    createProduct: 'Crear Producto',
    productName: 'Nombre del Producto',
    description: 'Descripción',
    price: 'Precio',
    
    // Withdrawals
    requestWithdrawal: 'Solicitar Retiro',
    walletAddress: 'Dirección de Wallet',
    availableBalance: 'Balance Disponible',
    
    // Settings
    profile: 'Perfil',
    preferences: 'Preferencias',
    security: 'Seguridad',
    language: 'Idioma',
    currency: 'Moneda',
    
    // Common
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    search: 'Buscar',
    filter: 'Filtrar',
    export: 'Exportar',
    noData: 'Sin datos',
    loading: 'Cargando...',
  },
  pt: {
    // Navigation
    dashboard: 'Painel',
    payments: 'Pagamentos',
    products: 'Produtos',
    withdrawals: 'Saques',
    webhooks: 'Webhooks',
    apiKeys: 'Chaves API',
    settings: 'Configurações',
    
    // Dashboard
    welcomeBack: 'Bem-vindo de volta',
    totalBalance: 'Saldo Total',
    todaySales: 'Vendas Hoje',
    pendingPayouts: 'Saques Pendentes',
    conversionRate: 'Taxa de Conversão',
    recentTransactions: 'Transações Recentes',
    viewAll: 'Ver Tudo',
    
    // Payments
    amount: 'Valor',
    status: 'Status',
    date: 'Data',
    customer: 'Cliente',
    confirmed: 'Confirmado',
    pending: 'Pendente',
    failed: 'Falhou',
    expired: 'Expirado',
    
    // Products
    createProduct: 'Criar Produto',
    productName: 'Nome do Produto',
    description: 'Descrição',
    price: 'Preço',
    
    // Withdrawals
    requestWithdrawal: 'Solicitar Saque',
    walletAddress: 'Endereço da Carteira',
    availableBalance: 'Saldo Disponível',
    
    // Settings
    profile: 'Perfil',
    preferences: 'Preferências',
    security: 'Segurança',
    language: 'Idioma',
    currency: 'Moeda',
    
    // Common
    save: 'Salvar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    search: 'Buscar',
    filter: 'Filtrar',
    export: 'Exportar',
    noData: 'Sem dados',
    loading: 'Carregando...',
  },
} as const;

export type TranslationKey = keyof typeof translations.es;

export const formatCurrency = (amount: number, currency: Currency, locale: Locale = 'es'): string => {
  const localeMap = {
    es: 'es-AR',
    pt: 'pt-BR',
  };

  const currencyConfig = {
    ARS: { locale: 'es-AR', symbol: '$' },
    BRL: { locale: 'pt-BR', symbol: 'R$' },
    USD: { locale: 'en-US', symbol: 'US$' },
  };

  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatUSDT = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount) + ' USDT';
};

export const formatDate = (date: Date, locale: Locale = 'es'): string => {
  const localeMap = {
    es: 'es-AR',
    pt: 'pt-BR',
  };

  return new Intl.DateTimeFormat(localeMap[locale], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatRelativeTime = (date: Date, locale: Locale = 'es'): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  const labels = {
    es: {
      now: 'ahora',
      minute: 'hace 1 min',
      minutes: `hace ${minutes} min`,
      hour: 'hace 1 hora',
      hours: `hace ${hours} horas`,
      day: 'ayer',
      days: `hace ${days} días`,
    },
    pt: {
      now: 'agora',
      minute: 'há 1 min',
      minutes: `há ${minutes} min`,
      hour: 'há 1 hora',
      hours: `há ${hours} horas`,
      day: 'ontem',
      days: `há ${days} dias`,
    },
  };

  const t = labels[locale];

  if (minutes < 1) return t.now;
  if (minutes === 1) return t.minute;
  if (minutes < 60) return t.minutes;
  if (hours === 1) return t.hour;
  if (hours < 24) return t.hours;
  if (days === 1) return t.day;
  return t.days;
};
