import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const restaurants = sqliteTable('restaurants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  subdomain: text('subdomain').notNull().unique(),
  logo: text('logo'),
  brandColours: text('brand_colours'), // JSON: { primary, accent }
  commissionRate: real('commission_rate').notNull().default(8.5), // percent e.g. 8.5
  monthlyFee: real('monthly_fee').notNull().default(49.0),
  planType: text('plan_type').notNull().default('starter'), // starter|pro|enterprise
  stripeAccountId: text('stripe_account_id'),
  isActive: integer('is_active').notNull().default(1),
  menuTemplate: text('menu_template').notNull().default('custom'), // chinese|pizza|burger|indian|custom
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const menuItems = sqliteTable('menu_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  restaurantId: integer('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  basePrice: real('base_price').notNull(),
  category: text('category').notNull(),
  imageUrl: text('image_url'),
  isAvailable: integer('is_available').notNull().default(1),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const modifierGroups = sqliteTable('modifier_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  menuItemId: integer('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull().default('required'), // required|optional
  minChoices: integer('min_choices').notNull().default(1),
  maxChoices: integer('max_choices').notNull().default(1),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const modifierOptions = sqliteTable('modifier_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  modifierGroupId: integer('modifier_group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  priceDelta: real('price_delta').notNull().default(0),
  isAvailable: integer('is_available').notNull().default(1),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  restaurantId: integer('restaurant_id').notNull().references(() => restaurants.id),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  customerPhone: text('customer_phone'),
  customerAddress: text('customer_address'),
  fulfillmentType: text('fulfillment_type').notNull().default('collection'), // collection|delivery
  itemsSnapshot: text('items_snapshot').notNull(), // JSON blob — full item config at time of order
  subtotal: real('subtotal').notNull(),
  discountAmount: real('discount_amount').notNull().default(0),
  total: real('total').notNull(),
  status: text('status').notNull().default('new'), // new|preparing|complete|cancelled
  paymentMethod: text('payment_method').notNull().default('card'), // card|cash
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  restaurantId: integer('restaurant_id').references(() => restaurants.id), // null = super_admin
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('restaurant_admin'), // super_admin|restaurant_admin|kitchen_staff
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const deals = sqliteTable('deals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  restaurantId: integer('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  discountType: text('discount_type').notNull().default('percent'), // percent|fixed
  discountValue: real('discount_value').notNull(),
  minOrder: real('min_order').notNull().default(0),
  expiresAt: text('expires_at'), // null = never expires
  isActive: integer('is_active').notNull().default(1),
})

// Relations for relational queries
export const relations = {
  restaurants: {
    menuItems: () => menuItems,
    orders: () => orders,
    users: () => users,
    deals: () => deals,
  },
  menuItems: {
    restaurant: () => restaurants,
    modifierGroups: () => modifierGroups,
  },
  modifierGroups: {
    menuItem: () => menuItems,
    options: () => modifierOptions,
  },
  modifierOptions: {
    group: () => modifierGroups,
  },
  orders: {
    restaurant: () => restaurants,
  },
  users: {
    restaurant: () => restaurants,
  },
}
