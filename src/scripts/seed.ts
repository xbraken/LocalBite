import { db } from '@/db'
import { menuItems, modifierGroups, modifierOptions, restaurants, users } from '@/db/schema'
import bcrypt from 'bcryptjs'

type TemplateType = 'chinese' | 'pizza' | 'burger' | 'indian' | 'custom'

interface TemplateOption {
  name: string
  priceDelta: number
}

interface TemplateGroup {
  name: string
  type: 'required' | 'optional'
  min: number
  max: number
  options: TemplateOption[]
}

interface TemplateItem {
  name: string
  description: string
  basePrice: number
  category: string
  groups?: TemplateGroup[]
}

const CHINESE_TEMPLATE: TemplateItem[] = [
  // Starters
  {
    name: 'Spring Rolls (4)',
    description: 'Crispy vegetable rolls with your choice of dipping sauce',
    basePrice: 5.50,
    category: 'Starters',
    groups: [
      { name: 'Dipping Sauce', type: 'required', min: 1, max: 1, options: [
        { name: 'Sweet Chilli', priceDelta: 0 },
        { name: 'Soy Sauce', priceDelta: 0 },
        { name: 'Hoisin', priceDelta: 0 },
      ]},
    ],
  },
  { name: 'Prawn Toast', description: 'Sesame-crusted prawn on golden fried bread', basePrice: 6.50, category: 'Starters' },
  { name: 'Crispy Seaweed', description: 'Lightly seasoned dried seaweed with pine nuts', basePrice: 4.50, category: 'Starters' },
  {
    name: 'Wonton Soup',
    description: 'Delicate pork wontons in a rich clear broth',
    basePrice: 6.00,
    category: 'Starters',
    groups: [
      { name: 'Portion Size', type: 'required', min: 1, max: 1, options: [
        { name: 'Regular', priceDelta: 0 },
        { name: 'Large', priceDelta: 2.00 },
      ]},
      { name: 'Extras', type: 'optional', min: 0, max: 2, options: [
        { name: 'Extra wontons', priceDelta: 1.50 },
        { name: 'Chilli oil', priceDelta: 0.50 },
        { name: 'Spring onion', priceDelta: 0 },
      ]},
    ],
  },
  {
    name: 'Dim Sum Basket',
    description: "Chef's selection — pick your three fillings",
    basePrice: 7.50,
    category: 'Starters',
    groups: [
      { name: 'Choose 3 fillings', type: 'required', min: 3, max: 3, options: [
        { name: 'Pork & Prawn', priceDelta: 0 },
        { name: 'Chicken & Mushroom', priceDelta: 0 },
        { name: 'Vegetable', priceDelta: 0 },
        { name: 'Beef & Ginger', priceDelta: 0 },
        { name: 'Prawn & Chive', priceDelta: 0 },
      ]},
    ],
  },
  // Mains
  {
    name: 'Sweet & Sour Chicken',
    description: 'Tender chicken in house tangy-sweet sauce with peppers',
    basePrice: 11.50,
    category: 'Mains',
    groups: [
      { name: 'Spice Level', type: 'required', min: 1, max: 1, options: [
        { name: 'Mild', priceDelta: 0 },
        { name: 'Medium', priceDelta: 0 },
        { name: 'Hot', priceDelta: 0 },
      ]},
      { name: 'Add a Side', type: 'optional', min: 0, max: 1, options: [
        { name: 'Egg Fried Rice', priceDelta: 3.00 },
        { name: 'Steamed Rice', priceDelta: 2.50 },
        { name: 'Noodles', priceDelta: 3.00 },
      ]},
    ],
  },
  {
    name: 'Kung Pao Beef',
    description: 'Wok-tossed beef, peanuts, dried chillies, Sichuan pepper',
    basePrice: 13.50,
    category: 'Mains',
    groups: [
      { name: 'Spice Level', type: 'required', min: 1, max: 1, options: [
        { name: 'Medium', priceDelta: 0 },
        { name: 'Hot', priceDelta: 0 },
        { name: 'Extra Hot', priceDelta: 0 },
      ]},
      { name: 'Protein Swap', type: 'optional', min: 0, max: 1, options: [
        { name: 'Swap to Chicken', priceDelta: -1.00 },
        { name: 'Swap to Tofu (V)', priceDelta: -2.00 },
      ]},
    ],
  },
  {
    name: "General Tso's Tofu",
    description: 'Crispy tofu in spicy-sweet glaze, sesame, spring onion',
    basePrice: 11.00,
    category: 'Mains',
    groups: [
      { name: 'Spice Level', type: 'required', min: 1, max: 1, options: [
        { name: 'Mild', priceDelta: 0 },
        { name: 'Medium', priceDelta: 0 },
        { name: 'Hot', priceDelta: 0 },
      ]},
    ],
  },
  { name: 'Black Bean Sea Bass', description: 'Steamed fillet in fermented black bean sauce', basePrice: 15.50, category: 'Mains' },
  {
    name: 'Peking Duck (Half)',
    description: 'Traditional slow-roasted duck with pancakes & hoisin',
    basePrice: 22.00,
    category: 'Mains',
    groups: [
      { name: 'Portion', type: 'required', min: 1, max: 1, options: [
        { name: 'Half duck', priceDelta: 0 },
        { name: 'Whole duck', priceDelta: 18.00 },
      ]},
      { name: 'Meal Deal — add sides', type: 'optional', min: 0, max: 2, options: [
        { name: 'Egg Fried Rice', priceDelta: 3.00 },
        { name: 'Duck Bone Soup', priceDelta: 4.50 },
        { name: 'Stir-fried Greens', priceDelta: 4.00 },
      ]},
    ],
  },
  {
    name: 'Mapo Tofu',
    description: 'Silken tofu, minced pork, fiery bean paste, Sichuan oil',
    basePrice: 12.00,
    category: 'Mains',
    groups: [
      { name: 'Heat Level', type: 'required', min: 1, max: 1, options: [
        { name: 'Mild (less numbing)', priceDelta: 0 },
        { name: 'Traditional', priceDelta: 0 },
        { name: 'Málatàng — very hot', priceDelta: 0 },
      ]},
    ],
  },
  // Rice & Noodles
  {
    name: 'Egg Fried Rice',
    description: 'Wok-fried jasmine rice with egg and soy',
    basePrice: 4.00,
    category: 'Rice & Noodles',
    groups: [
      { name: 'Size', type: 'required', min: 1, max: 1, options: [
        { name: 'Regular', priceDelta: 0 },
        { name: 'Large', priceDelta: 1.50 },
      ]},
    ],
  },
  {
    name: 'Singapore Chow Mein',
    description: 'Thin rice noodles, curry powder, prawn, char siu',
    basePrice: 10.50,
    category: 'Rice & Noodles',
    groups: [
      { name: 'Protein', type: 'required', min: 1, max: 1, options: [
        { name: 'Prawn & Char Siu (classic)', priceDelta: 0 },
        { name: 'Chicken only', priceDelta: -0.50 },
        { name: 'Tofu (V)', priceDelta: -1.00 },
        { name: 'Extra prawn', priceDelta: 2.00 },
      ]},
    ],
  },
  { name: 'Beef Ho Fun', description: 'Wide silky rice noodles, wok hei, beansprout', basePrice: 11.00, category: 'Rice & Noodles' },
  { name: 'Yangzhou Fried Rice', description: 'Classic fried rice with prawn, ham, egg and peas', basePrice: 9.50, category: 'Rice & Noodles' },
  // Drinks
  {
    name: 'Jasmine Tea (Pot)',
    description: 'Delicate loose-leaf jasmine in a traditional pot',
    basePrice: 3.50,
    category: 'Drinks',
    groups: [
      { name: 'Pot Size', type: 'required', min: 1, max: 1, options: [
        { name: 'Small (2 cups)', priceDelta: 0 },
        { name: 'Large (4 cups)', priceDelta: 1.50 },
      ]},
    ],
  },
  {
    name: 'Tiger Beer',
    description: '330ml bottle, crisp Asian lager',
    basePrice: 4.00,
    category: 'Drinks',
    groups: [
      { name: 'Quantity', type: 'required', min: 1, max: 1, options: [
        { name: 'Single bottle', priceDelta: 0 },
        { name: '2-pack (save £1.50)', priceDelta: 2.50 },
        { name: '4-pack (save £4)', priceDelta: 8.00 },
      ]},
    ],
  },
  { name: 'Still Water', description: '750ml bottle', basePrice: 2.00, category: 'Drinks' },
  { name: 'Lychee Lemonade', description: 'Fresh lychee, lemon juice, soda, mint', basePrice: 3.50, category: 'Drinks' },
]

const PIZZA_TEMPLATE: TemplateItem[] = [
  {
    name: 'Margherita',
    description: 'San Marzano tomato, fior di latte mozzarella, fresh basil',
    basePrice: 10.00,
    category: 'Pizzas',
    groups: [
      { name: 'Size', type: 'required', min: 1, max: 1, options: [
        { name: '9" Personal', priceDelta: 0 },
        { name: '12" Medium', priceDelta: 4.00 },
        { name: '15" Large', priceDelta: 8.00 },
      ]},
      { name: 'Extra Toppings', type: 'optional', min: 0, max: 5, options: [
        { name: 'Pepperoni', priceDelta: 1.50 },
        { name: 'Mushrooms', priceDelta: 1.00 },
        { name: 'Red Onion', priceDelta: 1.00 },
        { name: 'Jalapeños', priceDelta: 1.00 },
        { name: 'Olives', priceDelta: 1.00 },
        { name: 'Sun-dried Tomatoes', priceDelta: 1.50 },
        { name: 'Extra Mozzarella', priceDelta: 2.00 },
      ]},
    ],
  },
  {
    name: 'Pepperoni',
    description: 'Tomato sauce, mozzarella, double pepperoni',
    basePrice: 12.00,
    category: 'Pizzas',
    groups: [
      { name: 'Size', type: 'required', min: 1, max: 1, options: [
        { name: '9" Personal', priceDelta: 0 },
        { name: '12" Medium', priceDelta: 4.00 },
        { name: '15" Large', priceDelta: 8.00 },
      ]},
      { name: 'Extra Toppings', type: 'optional', min: 0, max: 5, options: [
        { name: 'Mushrooms', priceDelta: 1.00 },
        { name: 'Red Onion', priceDelta: 1.00 },
        { name: 'Jalapeños', priceDelta: 1.00 },
        { name: 'Extra Cheese', priceDelta: 2.00 },
      ]},
    ],
  },
  {
    name: 'BBQ Chicken',
    description: 'BBQ sauce, mozzarella, grilled chicken, red onion',
    basePrice: 13.00,
    category: 'Pizzas',
    groups: [
      { name: 'Size', type: 'required', min: 1, max: 1, options: [
        { name: '9" Personal', priceDelta: 0 },
        { name: '12" Medium', priceDelta: 4.00 },
        { name: '15" Large', priceDelta: 8.00 },
      ]},
    ],
  },
  { name: 'Garlic Bread', description: 'Toasted sourdough, garlic butter, herbs', basePrice: 4.50, category: 'Sides' },
  { name: 'Coleslaw', description: 'House-made creamy coleslaw', basePrice: 2.50, category: 'Sides' },
  { name: 'Soft Drink', description: 'Coke, Diet Coke, Fanta, Sprite', basePrice: 2.00, category: 'Drinks' },
  { name: 'San Pellegrino', description: '330ml sparkling water', basePrice: 2.50, category: 'Drinks' },
]

const BURGER_TEMPLATE: TemplateItem[] = [
  {
    name: 'Classic Smash Burger',
    description: 'Double smash patty, American cheese, pickles, onion, house sauce',
    basePrice: 11.00,
    category: 'Burgers',
    groups: [
      { name: 'Bun', type: 'required', min: 1, max: 1, options: [
        { name: 'Brioche (classic)', priceDelta: 0 },
        { name: 'Sesame', priceDelta: 0 },
        { name: 'Lettuce wrap (GF)', priceDelta: 0 },
      ]},
      { name: 'Patty', type: 'required', min: 1, max: 1, options: [
        { name: 'Beef (classic)', priceDelta: 0 },
        { name: 'Chicken', priceDelta: 0 },
        { name: 'Plant-based', priceDelta: 1.00 },
      ]},
      { name: 'Extras', type: 'optional', min: 0, max: 3, options: [
        { name: 'Bacon', priceDelta: 1.50 },
        { name: 'Extra patty', priceDelta: 3.00 },
        { name: 'Avocado', priceDelta: 1.50 },
        { name: 'Jalapeños', priceDelta: 0.50 },
      ]},
    ],
  },
  {
    name: 'BBQ Bacon Burger',
    description: 'Smash patty, crispy bacon, BBQ sauce, cheddar, onion rings',
    basePrice: 13.00,
    category: 'Burgers',
    groups: [
      { name: 'Patty', type: 'required', min: 1, max: 1, options: [
        { name: 'Beef', priceDelta: 0 },
        { name: 'Plant-based', priceDelta: 1.00 },
      ]},
      { name: 'Extras', type: 'optional', min: 0, max: 3, options: [
        { name: 'Extra bacon', priceDelta: 1.50 },
        { name: 'Extra cheese', priceDelta: 1.00 },
        { name: 'Jalapeños', priceDelta: 0.50 },
      ]},
    ],
  },
  {
    name: 'Fries',
    description: 'Crispy skin-on fries with sea salt',
    basePrice: 3.50,
    category: 'Sides',
    groups: [
      { name: 'Style', type: 'required', min: 1, max: 1, options: [
        { name: 'Regular', priceDelta: 0 },
        { name: 'Loaded (cheese & bacon)', priceDelta: 2.50 },
        { name: 'Truffle & parmesan', priceDelta: 2.00 },
      ]},
    ],
  },
  { name: 'Onion Rings', description: 'Beer-battered onion rings, sriracha mayo', basePrice: 4.00, category: 'Sides' },
  { name: 'Milkshake', description: 'Chocolate, Vanilla, or Strawberry', basePrice: 4.50, category: 'Drinks' },
  { name: 'Soft Drink', description: 'Coke, Diet Coke, Fanta, Sprite', basePrice: 2.00, category: 'Drinks' },
]

const INDIAN_TEMPLATE: TemplateItem[] = [
  {
    name: 'Thali Set',
    description: 'Complete thali with starter, main, rice, bread, and drink',
    basePrice: 18.95,
    category: 'Meal Deals',
    groups: [
      { name: 'Starter', type: 'required', min: 1, max: 1, options: [
        { name: 'Samosa (2)', priceDelta: 0 },
        { name: 'Onion Bhaji (3)', priceDelta: 0 },
        { name: 'Seekh Kebab', priceDelta: 0 },
      ]},
      { name: 'Main', type: 'required', min: 1, max: 1, options: [
        { name: 'Chicken Tikka Masala', priceDelta: 0 },
        { name: 'Lamb Rogan Josh', priceDelta: 0 },
        { name: 'Paneer Butter Masala', priceDelta: 0 },
        { name: 'Dal Makhani', priceDelta: 0 },
      ]},
      { name: 'Rice', type: 'required', min: 1, max: 1, options: [
        { name: 'Basmati Rice', priceDelta: 0 },
        { name: 'Pilau Rice', priceDelta: 0 },
        { name: 'Egg Fried Rice', priceDelta: 0 },
      ]},
      { name: 'Bread', type: 'required', min: 1, max: 1, options: [
        { name: 'Plain Naan', priceDelta: 0 },
        { name: 'Garlic Naan', priceDelta: 0 },
        { name: 'Chapati', priceDelta: 0 },
      ]},
      { name: 'Drink', type: 'required', min: 1, max: 1, options: [
        { name: 'Mango Lassi', priceDelta: 0 },
        { name: 'Masala Chai', priceDelta: 0 },
        { name: 'Still Water', priceDelta: 0 },
        { name: 'Soft Drink', priceDelta: 0 },
      ]},
    ],
  },
  { name: 'Chicken Tikka Masala', description: 'Classic creamy tomato sauce with tender chicken', basePrice: 13.50, category: 'Mains' },
  { name: 'Lamb Rogan Josh', description: 'Aromatic Kashmiri lamb curry, slow-cooked', basePrice: 14.50, category: 'Mains' },
  { name: 'Paneer Butter Masala', description: 'Paneer in rich tomato-cream sauce', basePrice: 12.00, category: 'Mains' },
  { name: 'Garlic Naan', description: 'Soft leavened bread with garlic butter', basePrice: 3.00, category: 'Breads' },
  { name: 'Pilau Rice', description: 'Fragrant spiced basmati', basePrice: 3.50, category: 'Rice' },
  { name: 'Mango Lassi', description: 'Chilled yoghurt drink with Alphonso mango', basePrice: 3.50, category: 'Drinks' },
]

export async function seedMenuTemplate(restaurantId: number, template: TemplateType) {
  if (template === 'custom') return

  const templateMap: Record<string, TemplateItem[]> = {
    chinese: CHINESE_TEMPLATE,
    pizza: PIZZA_TEMPLATE,
    burger: BURGER_TEMPLATE,
    indian: INDIAN_TEMPLATE,
  }

  const items = templateMap[template]
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const [insertedItem] = await db
      .insert(menuItems)
      .values({
        restaurantId,
        name: item.name,
        description: item.description,
        basePrice: item.basePrice,
        category: item.category,
        isAvailable: 1,
        sortOrder: i,
      })
      .returning({ id: menuItems.id })

    if (item.groups) {
      for (let gi = 0; gi < item.groups.length; gi++) {
        const group = item.groups[gi]
        const [insertedGroup] = await db
          .insert(modifierGroups)
          .values({
            menuItemId: insertedItem.id,
            name: group.name,
            type: group.type,
            minChoices: group.min,
            maxChoices: group.max,
            sortOrder: gi,
          })
          .returning({ id: modifierGroups.id })

        for (let oi = 0; oi < group.options.length; oi++) {
          const opt = group.options[oi]
          await db.insert(modifierOptions).values({
            modifierGroupId: insertedGroup.id,
            name: opt.name,
            priceDelta: opt.priceDelta,
            isAvailable: 1,
            sortOrder: oi,
          })
        }
      }
    }
  }
}

// Standalone seed for initial dev setup
async function seedDevData() {
  console.log('Seeding dev data...')

  // Create Golden Panda restaurant
  const [gpRestaurant] = await db
    .insert(restaurants)
    .values({
      name: 'Golden Panda',
      subdomain: 'goldenpanda',
      planType: 'pro',
      commissionRate: 8.5,
      monthlyFee: 49,
      menuTemplate: 'chinese',
      isActive: 1,
    })
    .returning()

  console.log('Created restaurant:', gpRestaurant.id, gpRestaurant.name)

  // Create admin user
  const adminHash = await bcrypt.hash('admin123', 10)
  await db.insert(users).values({
    restaurantId: gpRestaurant.id,
    email: 'admin@goldenpanda.co.uk',
    passwordHash: adminHash,
    role: 'restaurant_admin',
  })

  // Create kitchen user
  const kitchenHash = await bcrypt.hash('kitchen123', 10)
  await db.insert(users).values({
    restaurantId: gpRestaurant.id,
    email: 'kitchen@goldenpanda.co.uk',
    passwordHash: kitchenHash,
    role: 'kitchen_staff',
  })

  // Create super admin
  const superHash = await bcrypt.hash('super123', 10)
  await db.insert(users).values({
    restaurantId: null,
    email: 'super@localbite.com',
    passwordHash: superHash,
    role: 'super_admin',
  })

  // Seed Chinese menu
  await seedMenuTemplate(gpRestaurant.id, 'chinese')
  console.log('Seeded Chinese menu for Golden Panda')

  // Create a second restaurant (Pizza)
  const [pizzaRestaurant] = await db
    .insert(restaurants)
    .values({
      name: 'Pizza Napoli',
      subdomain: 'pizzanapoli',
      planType: 'starter',
      commissionRate: 12.0,
      monthlyFee: 29,
      menuTemplate: 'pizza',
      isActive: 1,
    })
    .returning()

  await db.insert(users).values({
    restaurantId: pizzaRestaurant.id,
    email: 'admin@pizzanapoli.co.uk',
    passwordHash: adminHash,
    role: 'restaurant_admin',
  })

  await seedMenuTemplate(pizzaRestaurant.id, 'pizza')
  console.log('Seeded Pizza menu for Pizza Napoli')

  console.log('\n✓ Seed complete!')
  console.log('\nTest credentials:')
  console.log('  Super admin: super@localbite.com / super123')
  console.log('  Golden Panda admin: admin@goldenpanda.co.uk / admin123')
  console.log('  Kitchen staff: kitchen@goldenpanda.co.uk / kitchen123')
  console.log('\nTest URLs (add to /etc/hosts: 127.0.0.1 goldenpanda.localhost)')
  console.log('  Customer: http://goldenpanda.localhost:3000/')
  console.log('  Kitchen: http://goldenpanda.localhost:3000/kitchen')
  console.log('  Admin: http://goldenpanda.localhost:3000/admin')
  console.log('  Super: http://localhost:3000/superadmin')
}

// Only run when invoked directly (not when imported as a module)
if (require.main === module) {
  seedDevData().catch(console.error).finally(() => process.exit(0))
}
