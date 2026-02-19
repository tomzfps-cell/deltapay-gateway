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
    adminOrders: 'Pedidos',
    adminDashboard: 'Admin',
    adminWithdrawals: 'Retiros Admin',
    
    // Dashboard
    welcomeBack: 'Bienvenido de nuevo',
    totalBalance: 'Balance Total',
    todaySales: 'Ventas Hoy',
    pendingPayouts: 'Retiros Pendientes',
    conversionRate: 'Tasa de Conversión',
    recentTransactions: 'Transacciones Recientes',
    viewAll: 'Ver Todo',
    availableForWithdrawal: 'Disponible para retiro',
    requestWithdrawalAction: 'Solicitar Retiro',
    sales30d: 'Ventas (30d)',
    balanceUSDT: 'Balance USDT',
    pendingBalance: 'Pendiente',
    totalBalanceLabel: 'Total',
    noRecentTransactions: 'No hay transacciones recientes',
    summaryActivity: 'Resumen de tu actividad en DeltaPay',
    
    // Payments
    amount: 'Monto',
    status: 'Estado',
    date: 'Fecha',
    customer: 'Cliente',
    confirmed: 'Confirmado',
    pending: 'Pendiente',
    failed: 'Fallido',
    expired: 'Expirado',
    created: 'Creado',
    
    // Products
    createProduct: 'Crear Producto',
    productName: 'Nombre del Producto',
    description: 'Descripción',
    price: 'Precio',
    manageProducts: 'Crea y gestiona tus productos y links de pago',
    noProducts: 'No tienes productos aún',
    createFirstProduct: 'Crear tu primer producto',
    editProduct: 'Editar Producto',
    newProduct: 'Nuevo Producto',
    modifyProductData: 'Modifica los datos del producto',
    createProductWithLink: 'Crea un nuevo producto con link de pago',
    nameRequired: 'Nombre',
    descriptionOptional: 'Descripción',
    priceLabel: 'Precio',
    currencyLabel: 'Moneda',
    slugLabel: 'Slug (URL)',
    imageLabel: 'Imagen del producto',
    selectImage: 'Seleccionar imagen',
    changeImage: 'Cambiar imagen',
    uploading: 'Subiendo...',
    imageHint: 'Imagen del producto que se mostrará en la landing y checkout',
    redirectUrlLabel: 'URL de redirección (opcional)',
    redirectUrlHint: 'Después del pago, el cliente será redirigido aquí',
    saving: 'Guardando...',
    save: 'Guardar',
    cancel: 'Cancelar',
    productUpdated: 'Producto actualizado',
    productCreated: 'Producto creado',
    slugInUse: 'Este slug ya está en uso',
    copyLink: 'Copiar link',
    linkCopied: 'Link copiado',
    openCheckout: 'Abrir checkout',
    edit: 'Editar',
    deactivate: 'Desactivar',
    activate: 'Activar',
    productDeactivated: 'Producto desactivado',
    productActivated: 'Producto activado',
    inactive: 'Inactivo',
    noDescription: 'Sin descripción',
    
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
    confirm: 'Confirmar',
    search: 'Buscar',
    filter: 'Filtrar',
    export: 'Exportar',
    noData: 'Sin datos',
    loading: 'Cargando...',
    error: 'Error',
    collapse: 'Colapsar',
    
    // Checkout / Orders
    orderSummary: 'Resumen del pedido',
    orderPending: 'Pedido pendiente',
    orderPendingPayment: 'Tu pedido está pendiente de pago.',
    thankYou: '¡Gracias por tu compra!',
    orderConfirmed: 'Tu pedido fue confirmado y está siendo procesado.',
    redirectingIn: 'Serás redirigido en',
    seconds: 'segundos',
    continueButton: 'Continuar',
    viewOrderDetail: 'Ver detalle del pedido',
    completePay: 'Completar pago',
    orderDate: 'Pedido realizado el',
    orderNotFound: 'Pedido no encontrado',
    loadingOrder: 'Cargando pedido...',
    invalidOrderId: 'ID de pedido no válido',
    loadingProduct: 'Cargando producto...',
    productNotFound: 'Producto no encontrado',
    productNotAvailable: 'Este producto no existe o no está disponible',
    startPurchase: 'Comenzar compra',
    fillDetailsNextStep: 'Completá tus datos de contacto y envío en el siguiente paso.',
    continueToCheckout: 'Continuar al checkout',
    creatingOrder: 'Creando pedido...',
    totalToPay: 'Total a pagar',
    securePay: 'Pago seguro',
    homeDelivery: 'Envío a domicilio',
    allCards: 'Todas las tarjetas',
    errorCreatingOrder: 'Error al crear el pedido',
    
    // Admin
    adminPanel: 'Panel de administración',
    orders: 'Pedidos',
    merchants: 'Merchants',
    searchByIdOrEmail: 'Buscar por ID de orden o email...',
    noOrdersFound: 'No se encontraron pedidos',
    page: 'Página',
    previous: 'Anterior',
    next: 'Siguiente',
    active: 'Activo',
    business: 'Negocio',
    email: 'Email',
    country: 'País',
    fee: 'Fee',
    registeredAt: 'Registro',
    globalSummary: 'Resumen global de DeltaPay',
    viewOrders: 'Ver pedidos',
    payoutsPending: 'Payouts pendientes',
    administration: 'Administración',
    
    // Auth
    closeSession: 'Cerrar Sesión',
    profileLabel: 'Perfil',
    configLabel: 'Configuración',
    merchantRole: 'Merchant',
    adminRole: 'Admin',
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
    adminOrders: 'Pedidos',
    adminDashboard: 'Admin',
    adminWithdrawals: 'Saques Admin',
    
    // Dashboard
    welcomeBack: 'Bem-vindo de volta',
    totalBalance: 'Saldo Total',
    todaySales: 'Vendas Hoje',
    pendingPayouts: 'Saques Pendentes',
    conversionRate: 'Taxa de Conversão',
    recentTransactions: 'Transações Recentes',
    viewAll: 'Ver Tudo',
    availableForWithdrawal: 'Disponível para saque',
    requestWithdrawalAction: 'Solicitar Saque',
    sales30d: 'Vendas (30d)',
    balanceUSDT: 'Saldo USDT',
    pendingBalance: 'Pendente',
    totalBalanceLabel: 'Total',
    noRecentTransactions: 'Sem transações recentes',
    summaryActivity: 'Resumo da sua atividade no DeltaPay',
    
    // Payments
    amount: 'Valor',
    status: 'Status',
    date: 'Data',
    customer: 'Cliente',
    confirmed: 'Confirmado',
    pending: 'Pendente',
    failed: 'Falhou',
    expired: 'Expirado',
    created: 'Criado',
    
    // Products
    createProduct: 'Criar Produto',
    productName: 'Nome do Produto',
    description: 'Descrição',
    price: 'Preço',
    manageProducts: 'Crie e gerencie seus produtos e links de pagamento',
    noProducts: 'Você ainda não tem produtos',
    createFirstProduct: 'Criar seu primeiro produto',
    editProduct: 'Editar Produto',
    newProduct: 'Novo Produto',
    modifyProductData: 'Modifique os dados do produto',
    createProductWithLink: 'Crie um novo produto com link de pagamento',
    nameRequired: 'Nome',
    descriptionOptional: 'Descrição',
    priceLabel: 'Preço',
    currencyLabel: 'Moeda',
    slugLabel: 'Slug (URL)',
    imageLabel: 'Imagem do produto',
    selectImage: 'Selecionar imagem',
    changeImage: 'Trocar imagem',
    uploading: 'Enviando...',
    imageHint: 'Imagem do produto exibida na landing e checkout',
    redirectUrlLabel: 'URL de redirecionamento (opcional)',
    redirectUrlHint: 'Após o pagamento, o cliente será redirecionado aqui',
    saving: 'Salvando...',
    save: 'Salvar',
    cancel: 'Cancelar',
    productUpdated: 'Produto atualizado',
    productCreated: 'Produto criado',
    slugInUse: 'Este slug já está em uso',
    copyLink: 'Copiar link',
    linkCopied: 'Link copiado',
    openCheckout: 'Abrir checkout',
    edit: 'Editar',
    deactivate: 'Desativar',
    activate: 'Ativar',
    productDeactivated: 'Produto desativado',
    productActivated: 'Produto ativado',
    inactive: 'Inativo',
    noDescription: 'Sem descrição',
    
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
    confirm: 'Confirmar',
    search: 'Buscar',
    filter: 'Filtrar',
    export: 'Exportar',
    noData: 'Sem dados',
    loading: 'Carregando...',
    error: 'Erro',
    collapse: 'Recolher',
    
    // Checkout / Orders
    orderSummary: 'Resumo do pedido',
    orderPending: 'Pedido pendente',
    orderPendingPayment: 'Seu pedido está pendente de pagamento.',
    thankYou: 'Obrigado pela sua compra!',
    orderConfirmed: 'Seu pedido foi confirmado e está sendo processado.',
    redirectingIn: 'Você será redirecionado em',
    seconds: 'segundos',
    continueButton: 'Continuar',
    viewOrderDetail: 'Ver detalhe do pedido',
    completePay: 'Completar pagamento',
    orderDate: 'Pedido realizado em',
    orderNotFound: 'Pedido não encontrado',
    loadingOrder: 'Carregando pedido...',
    invalidOrderId: 'ID do pedido inválido',
    loadingProduct: 'Carregando produto...',
    productNotFound: 'Produto não encontrado',
    productNotAvailable: 'Este produto não existe ou não está disponível',
    startPurchase: 'Começar compra',
    fillDetailsNextStep: 'Complete seus dados de contato e envio no próximo passo.',
    continueToCheckout: 'Continuar ao checkout',
    creatingOrder: 'Criando pedido...',
    totalToPay: 'Total a pagar',
    securePay: 'Pagamento seguro',
    homeDelivery: 'Entrega em domicílio',
    allCards: 'Todos os cartões',
    errorCreatingOrder: 'Erro ao criar o pedido',
    
    // Admin
    adminPanel: 'Painel de administração',
    orders: 'Pedidos',
    merchants: 'Merchants',
    searchByIdOrEmail: 'Buscar por ID do pedido ou email...',
    noOrdersFound: 'Nenhum pedido encontrado',
    page: 'Página',
    previous: 'Anterior',
    next: 'Próximo',
    active: 'Ativo',
    business: 'Negócio',
    email: 'Email',
    country: 'País',
    fee: 'Fee',
    registeredAt: 'Registro',
    globalSummary: 'Resumo global do DeltaPay',
    viewOrders: 'Ver pedidos',
    payoutsPending: 'Payouts pendentes',
    administration: 'Administração',
    
    // Auth
    closeSession: 'Encerrar Sessão',
    profileLabel: 'Perfil',
    configLabel: 'Configurações',
    merchantRole: 'Merchant',
    adminRole: 'Admin',
  },
} as const;

export type TranslationKey = keyof typeof translations.es;

export const formatCurrency = (amount: number, currency: Currency, locale: Locale = 'es'): string => {
  const localeMap = {
    es: 'es-AR',
    pt: 'pt-BR',
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
