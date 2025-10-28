// TypeScript model definitions for database entities and API responses

// Base interfaces for common fields
export interface BaseEntity {
  id?: number;
  created_at?: string;
  updated_at?: string;
}

// Product interface - matches products table schema
export interface Product extends BaseEntity {
  name: string;
  category: string;
  color?: string;
  stock_quantity?: number;
  unit?: string;
  description?: string;
  type?: 'product' | 'material';
}

// Customer interface - matches customers table schema
export interface Customer extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  balance?: number;
  type?: 'customer' | 'supplier';
}

// Employee interface - matches employees table schema
export interface Employee extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  salary?: number;
  salary_currency?: string;
  balance?: number;
  hire_date?: string;
  status: 'active' | 'inactive';
}

// Category interface - matches categories table schema
export interface Category extends BaseEntity {
  name: string;
  description?: string;
}

// Color interface - matches colors table schema
export interface Color extends BaseEntity {
  name: string;
  hex_code?: string;
}

// Category interface for API responses
export interface CategoryResponse {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

// Color interface for API responses
export interface ColorResponse {
  id: number;
  name: string;
  hex_code?: string;
  created_at?: string;
}

// Sale interface - matches sales table schema
export interface Sale extends BaseEntity {
  customer_id?: number;
  total_amount: number;
  payment_status?: string;
  sale_date?: string;
  notes?: string;
}

// Sale item interface - matches sale_items table schema
export interface SaleItem extends BaseEntity {
  sale_id: number;
  product_id: number;
  quantity_pieces: number;
  quantity_desi: number;
  unit_price_per_desi: number;
  total_price: number;
}

// Stock movement interface - matches stock_movements table schema
export interface StockMovement extends BaseEntity {
  product_id: number;
  movement_type: string;
  quantity: number;
  previous_stock?: number;
  new_stock?: number;
  reference_type?: string;
  reference_id?: number;
  customer_id?: number;
  unit_price?: number;
  total_amount?: number;
  notes?: string;
  user?: string;
}

// Customer payment interface - matches customer_payments table schema
export interface CustomerPayment extends BaseEntity {
  customer_id: number;
  amount: number;
  payment_type?: string;
  payment_date?: string;
  notes?: string;
}

// Employee payment interface - matches employee_payments table schema
export interface EmployeePayment extends BaseEntity {
  employee_id: number;
  amount: number;
  currency?: string;
  payment_type?: string;
  payment_date?: string;
  notes?: string;
}

// Cash transaction interface - matches cash_transactions table schema
export interface CashTransaction extends BaseEntity {
  type: 'in' | 'out';
  amount: number;
  currency?: string;
  category: string;
  description: string;
  reference_type?: string;
  reference_id?: number;
  customer_id?: number;
  user: string;
}

// Return interface - matches returns table schema
export interface Return extends BaseEntity {
  sale_id?: number;
  customer_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  return_date?: string;
  notes?: string;
}

// Generic API response interface
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Paginated API response interface
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  error?: string;
}

// Employee paginated response with salary totals
export interface EmployeePaginatedResponse extends PaginatedResponse<Employee> {
  totalSalary: number;
}
