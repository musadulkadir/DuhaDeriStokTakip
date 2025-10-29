// Preload components for better performance
export const preloadComponents = () => {
  // Dashboard açıldıktan 2 saniye sonra diğer component'leri yükle
  setTimeout(() => {
    import('../components/ProductManagement');
    import('../components/CustomerManagement');
    import('../components/SalesManagement');
  }, 2000);

  // 5 saniye sonra geri kalanları yükle
  setTimeout(() => {
    import('../components/CashManagement');
    import('../components/Reports');
    import('../components/StockMovements');
    import('../components/SupplierManagement');
    import('../components/EmployeeManagement');
  }, 5000);
};
