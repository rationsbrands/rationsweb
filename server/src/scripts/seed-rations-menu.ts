import '../bootstrapEnv'
import mongoose from 'mongoose'
import MenuItem from '../models/MenuItem'

const MENU_ITEMS = [
  // BURGER
  { name: 'Birdzilla burger & french fries', price: 10500, category: 'Burger', description: 'Classic chicken burger served with fries' },
  { name: 'Oga burger & french fries', price: 13900, category: 'Burger', description: 'Premium burger with all the toppings served with fries' },
  { name: 'Cheesy affair burger & french fries', price: 11600, category: 'Burger', description: 'Cheese-loaded burger served with fries' },

  // WRAPS
  { name: 'Standard shawarma', price: 7200, category: 'Wraps', description: 'Classic shawarma wrap' },
  { name: 'Cheese beef shawarma', price: 9400, category: 'Wraps', description: 'Beef shawarma with extra cheese' },
  { name: 'Suya wrapped with cheese', price: 9000, category: 'Wraps', description: 'Spicy suya wrap with cheese' },
  { name: 'Beef wrapped with cheese', price: 10000, category: 'Wraps', description: 'Tender beef wrap with cheese' },

  // SANDWICH
  { name: 'Birdzilla suya sandwiches', price: 8900, category: 'Sandwich', description: 'Spicy suya sandwich' },
  { name: 'Egg plantain sandwich', price: 7200, category: 'Sandwich', description: 'Sandwich with egg and sweet plantain' },

  // PASTA
  { name: 'Prawn pasta', price: 11600, category: 'Pasta', description: 'Pasta with fresh prawns' },
  { name: 'Pasta in tomato sauce with birdzilla', price: 8300, category: 'Pasta', description: 'Tomato pasta with chicken' },
  { name: 'Stir fry pasta with birdzilla', price: 7200, category: 'Pasta', description: 'Stir-fried pasta with chicken' },
  { name: 'Stir fry pasta with beef', price: 8300, category: 'Pasta', description: 'Stir-fried pasta with beef chunks' },

  // RICE
  { name: 'Asun rice', price: 9200, category: 'Rice', description: 'Spicy goat meat rice' },
  { name: 'Malay rice', price: 7200, category: 'Rice', description: 'Malaysian style fried rice' },
  { name: 'Jollof rice', price: 3900, category: 'Rice', description: 'Classic Nigerian smoky jollof rice' },

  // FRIES
  { name: 'Loaded fries (Small)', price: 3900, category: 'Fries', description: 'Small portion of fries with toppings' },
  { name: 'Loaded fries (Large)', price: 7800, category: 'Fries', description: 'Large portion of fries with toppings' },
  { name: 'Plantain', price: 2300, category: 'Fries', description: 'Fried sweet plantain' },
  { name: 'French fries', price: 2800, category: 'Fries', description: 'Crispy potato fries' },
  { name: 'Sweet potato fries', price: 2800, category: 'Fries', description: 'Crispy sweet potato fries' },

  // SALAD
  { name: 'Slaw', price: 2800, category: 'Salad', description: 'Fresh coleslaw' },
  { name: 'Grilled chicken salad', price: 4500, category: 'Salad', description: 'Healthy salad with grilled chicken' },

  // WINGS
  { name: 'Wings 8 pieces', price: 6700, category: 'Wings', description: '8 pieces of spicy wings' },
  { name: 'Wings 12 pieces', price: 8900, category: 'Wings', description: '12 pieces of spicy wings' },
  { name: 'Wings 16 pieces', price: 11000, category: 'Wings', description: '16 pieces of spicy wings' },
]

async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is required')
  await mongoose.connect(uri)
  console.log('Connected to DB')
}

async function run() {
  try {
    await connectDB()


    console.log('Clearing existing menu items...')
    await MenuItem.deleteMany({})

    console.log(`Seeding ${MENU_ITEMS.length} menu items...`)
    const items = MENU_ITEMS.map(item => ({
      ...item,
      isAvailable: true,
      imageUrl: '' // TODO: Add images if available
    }))

    await MenuItem.insertMany(items)
    console.log('Menu updated successfully!')
    
    process.exit(0)
  } catch (err) {
    console.error('Seed failed:', err)
    process.exit(1)
  }
}

run()
