// src/renderer/services/api.ts
import {
  Customer,
  Product,
  CustomerPayment,
  Employee,
  EmployeePayment,
  Category,
  Color,
  StockMovement,
  MaterialMovement,
  Sale,
  CashTransaction,
  Return,
  ApiResponse,
  PaginatedResponse,
  EmployeePaginatedResponse
} from '../../main/database/models';

// IPC API wrapper
class DatabaseAPI {
  // Database operations
  async testConnection(): Promise<boolean> {
    return window.require("electron").ipcRenderer.invoke('db:test-connection');
  }

  async createTables(): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('db:create-tables');
  }

  // YENİ EKLENECEK FONKSİYON:
  async getSaleById(saleId: number): Promise<ApiResponse<Sale>> { // 'Sale' tipi SalesManagement.tsx'ten gelen tip olmalı
    return window.require("electron").ipcRenderer.invoke('sales:getById', saleId);
  }


  // Customer operations
  async getCustomers(page = 1, limit = 50): Promise<PaginatedResponse<Customer>> {
    return window.require("electron").ipcRenderer.invoke('customers:get-all', page, limit);
  }

  async getCustomerById(id: number): Promise<ApiResponse<Customer>> {
    return window.require("electron").ipcRenderer.invoke('customers:get-by-id', id);
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Customer>> {
    return window.require("electron").ipcRenderer.invoke('customers:create', customer);
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return window.require("electron").ipcRenderer.invoke('customers:update', id, customer);
  }

  async deleteCustomer(id: number): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('customers:delete', id);
  }

  async updateCustomerBalance(id: number, amount: number): Promise<ApiResponse<Customer>> {
    return window.require("electron").ipcRenderer.invoke('customers:update-balance', id, amount);
  }

  // Product operations
  async getProducts(page = 1, limit = 50): Promise<PaginatedResponse<Product>> {
    return window.require("electron").ipcRenderer.invoke('products:get-all', page, limit);
  }

  async getProductById(id: number): Promise<ApiResponse<Product>> {
    return window.require("electron").ipcRenderer.invoke('products:get-by-id', id);
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Product>> {
    return window.require("electron").ipcRenderer.invoke('products:create', product);
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<ApiResponse<Product>> {
    return window.require("electron").ipcRenderer.invoke('products:update', id, product);
  }

  async deleteProduct(id: number): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('products:delete', id);
  }

  async updateProductStock(id: number, newStock: number): Promise<ApiResponse<Product>> {
    return window.require("electron").ipcRenderer.invoke('products:update-stock', id, newStock);
  }

  // Materials operations
  async getMaterials(): Promise<ApiResponse<Product[]>> {
    return window.require("electron").ipcRenderer.invoke('materials:get-all');
  }

  async createMaterial(material: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Product>> {
    return window.require("electron").ipcRenderer.invoke('materials:create', material);
  }

  async updateMaterial(id: number, material: Partial<Product>): Promise<ApiResponse<Product>> {
    return window.require("electron").ipcRenderer.invoke('materials:update', id, material);
  }

  async deleteMaterial(id: number): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('materials:delete', id);
  }

  // Payment operations
  async getAllCustomerPayments(): Promise<ApiResponse<CustomerPayment[]>> {
    return window.require("electron").ipcRenderer.invoke('customer-payments:get-all');
  }

  async getCustomerPayments(customerId: number): Promise<ApiResponse<CustomerPayment[]>> {
    return window.require("electron").ipcRenderer.invoke('customer-payments:get-by-customer', customerId);
  }

  async createPayment(payment: Omit<CustomerPayment, 'id' | 'created_at'>): Promise<ApiResponse<CustomerPayment>> {
    return window.require("electron").ipcRenderer.invoke('customer-payments:create', payment);
  }

  async deletePayment(id: number): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('customer-payments:delete', id);
  }

  // Stock movement operations (for products only)
  async getStockMovements(page = 1, limit = 50): Promise<PaginatedResponse<StockMovement>> {
    return window.require("electron").ipcRenderer.invoke('stock-movements:get-all', page, limit);
  }

  async getStockMovementsByProduct(productId: number): Promise<ApiResponse<StockMovement[]>> {
    return window.require("electron").ipcRenderer.invoke('stock-movements:get-by-product', productId);
  }

  async createStockMovement(movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<StockMovement>> {
    return window.require("electron").ipcRenderer.invoke('stock-movements:create', movement);
  }

  // Material movement operations (for materials only)
  async getMaterialMovements(): Promise<ApiResponse<MaterialMovement[]>> {
    return window.require("electron").ipcRenderer.invoke('material-movements:get-all');
  }

  async getMaterialMovementsByMaterial(materialId: number): Promise<ApiResponse<MaterialMovement[]>> {
    return window.require("electron").ipcRenderer.invoke('material-movements:get-by-material', materialId);
  }

  async createMaterialMovement(movement: Omit<MaterialMovement, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<MaterialMovement>> {
    return window.require("electron").ipcRenderer.invoke('material-movements:create', movement);
  }

  // Sales operations
  async getSales(startDate?: string, endDate?: string): Promise<ApiResponse<Sale[]> & { totals?: Record<string, number>; dayCount?: number }> {
    return window.require("electron").ipcRenderer.invoke('sales:get-all', startDate, endDate);
  }

  async createSale(sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Sale>> {
    return window.require("electron").ipcRenderer.invoke('sales:create', sale);
  }

  async deleteSale(saleId: number): Promise<ApiResponse<void>> {
    return window.require("electron").ipcRenderer.invoke('sales:delete', saleId);
  }

  // Cash operations
  async getCashTransactions(): Promise<ApiResponse<CashTransaction[]>> {
    return window.require("electron").ipcRenderer.invoke('cash:get-all');
  }

  async createCashTransaction(transaction: Omit<CashTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<CashTransaction>> {
    return window.require("electron").ipcRenderer.invoke('cash:create', transaction);
  }

  async updateCashTransaction(id: number, transaction: Partial<CashTransaction>): Promise<ApiResponse<CashTransaction>> {
    return window.require("electron").ipcRenderer.invoke('cash:update', id, transaction);
  }

  async deleteCashTransaction(id: number): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('cash:delete', id);
  }

  // Employee operations
  async getEmployeesCount(): Promise<ApiResponse<{
    countEmployees: number;
    countActiveEmployees: number;
    countInactiveEmployees: number;
  }>> {
    return window.require("electron").ipcRenderer.invoke('employees:getCounts');
  }

  async getEmployees(page = 1, limit = 50): Promise<PaginatedResponse<Employee>> {
    return window.require("electron").ipcRenderer.invoke('employees:get-all', page, limit);
  }

  async getEmployeeById(id: number): Promise<ApiResponse<Employee>> {
    return window.require("electron").ipcRenderer.invoke('employees:get-by-id', id);
  }

  async createEmployee(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Employee>> {
    return window.require("electron").ipcRenderer.invoke('employees:create', employee);
  }

  async updateEmployee(id: number, employee: Partial<Employee>): Promise<ApiResponse<Employee>> {
    return window.require("electron").ipcRenderer.invoke('employees:update', id, employee);
  }

  async deleteEmployee(id: number): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('employees:delete', id);
  }

  async updateEmployeeBalance(id: number, amount: number): Promise<ApiResponse<Employee>> {
    return window.require("electron").ipcRenderer.invoke('employees:update-balance', id, amount);
  }

  async getEmployeePayments(employeeId: number, page = 1, limit = 10): Promise<{
    success: boolean;
    data: EmployeePayment[];
    total: number;
    page: number;
    limit: number;
    currencyTotals: { currency: string; total_amount: number }[];
    error?: string;
  }> {
    return window.require("electron").ipcRenderer.invoke('employee-payments:get-by-employee', employeeId, page, limit);
  }

  async createEmployeePayment(payment: Omit<EmployeePayment, 'id' | 'created_at'>): Promise<ApiResponse<EmployeePayment>> {
    return window.require("electron").ipcRenderer.invoke('employee-payments:create', payment);
  }

  async deleteEmployeePayment(id: number): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('employee-payments:delete', id);
  }

  async updateEmployeeStatus(id: number, status: 'active' | 'inactive'): Promise<ApiResponse<Employee>> {
    return window.require("electron").ipcRenderer.invoke('employees:update-status', id, status);
  }

  async getEmployeesByStatus(status: 'active' | 'inactive', page = 1, limit = 50, searchTerm = ''): Promise<EmployeePaginatedResponse> {
    return window.require("electron").ipcRenderer.invoke('employees:get-by-status', status, page, limit, searchTerm);
  }

  // Categories ve Colors artık koddan geliyor, API metodları kaldırıldı

  // Returns operations
  async createReturn(returnData: Omit<Return, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Return>> {
    return window.require("electron").ipcRenderer.invoke('returns:create', returnData);
  }

  // Purchase operations
  async getPurchases(page = 1, limit = 50): Promise<PaginatedResponse<any>> {
    return window.require("electron").ipcRenderer.invoke('purchases:get-all', page, limit);
  }

  async getPurchaseById(id: number): Promise<ApiResponse<any>> {
    return window.require("electron").ipcRenderer.invoke('purchases:getById', id);
  }

  async createPurchase(purchase: any): Promise<ApiResponse<any>> {
    return window.require("electron").ipcRenderer.invoke('purchases:create', purchase);
  }

  async deletePurchase(id: number): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('purchases:delete', id);
  }

  // Settings operations
  async getSetting(key: string): Promise<ApiResponse<any>> {
    return window.require("electron").ipcRenderer.invoke('settings:get', key);
  }

  async setSetting(key: string, value: string): Promise<ApiResponse<any>> {
    return window.require("electron").ipcRenderer.invoke('settings:set', key, value);
  }

  async getPassword(): Promise<ApiResponse<string>> {
    return window.require("electron").ipcRenderer.invoke('settings:getPassword');
  }

  async setPassword(password: string): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('settings:setPassword', password);
  }
}

export const dbAPI = new DatabaseAPI();