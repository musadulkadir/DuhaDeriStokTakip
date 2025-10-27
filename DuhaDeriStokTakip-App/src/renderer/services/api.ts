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
  Sale,
  CashTransaction,
  Return,
  ApiResponse,
  PaginatedResponse
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
  async getCustomerPayments(customerId: number): Promise<ApiResponse<CustomerPayment[]>> {
    return window.require("electron").ipcRenderer.invoke('customer-payments:get-by-customer', customerId);
  }

  async createPayment(payment: Omit<CustomerPayment, 'id' | 'created_at'>): Promise<ApiResponse<CustomerPayment>> {
    return window.require("electron").ipcRenderer.invoke('customer-payments:create', payment);
  }

  async deletePayment(id: number): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('customer-payments:delete', id);
  }

  // Stock movement operations
  async getStockMovements(page = 1, limit = 50): Promise<PaginatedResponse<StockMovement>> {
    return window.require("electron").ipcRenderer.invoke('stock-movements:get-all', page, limit);
  }

  async getStockMovementsByProduct(productId: number): Promise<ApiResponse<StockMovement[]>> {
    return window.require("electron").ipcRenderer.invoke('stock-movements:get-by-product', productId);
  }

  async createStockMovement(movement: Omit<StockMovement, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<StockMovement>> {
    return window.require("electron").ipcRenderer.invoke('stock-movements:create', movement);
  }

  // Sales operations
  async getSales(startDate?: string, endDate?: string): Promise<ApiResponse<Sale[]>> {
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

  async getEmployeePayments(employeeId: number): Promise<ApiResponse<EmployeePayment[]>> {
    return window.require("electron").ipcRenderer.invoke('employee-payments:get-by-employee', employeeId);
  }

  async createEmployeePayment(payment: Omit<EmployeePayment, 'id' | 'created_at'>): Promise<ApiResponse<EmployeePayment>> {
    return window.require("electron").ipcRenderer.invoke('employee-payments:create', payment);
  }

  async deleteEmployeePayment(id: number): Promise<ApiResponse<boolean>> {
    return window.require("electron").ipcRenderer.invoke('employee-payments:delete', id);
  }

  // Categories operations
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return window.require("electron").ipcRenderer.invoke('categories:get-all');
  }

  async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Category>> {
    return window.require("electron").ipcRenderer.invoke('categories:create', category);
  }

  // Colors operations
  async getColors(): Promise<ApiResponse<Color[]>> {
    return window.require("electron").ipcRenderer.invoke('colors:get-all');
  }

  async createColor(color: Omit<Color, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Color>> {
    return window.require("electron").ipcRenderer.invoke('colors:create', color);
  }

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
}

export const dbAPI = new DatabaseAPI();