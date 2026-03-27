import '../bootstrapEnv'
import mongoose from 'mongoose'
import MenuItem from '../models/MenuItem'

// Existing descriptions from seed file
const EXISTING_DESCRIPTIONS: Record<string, string> = {
  'Birdzilla burger & french fries': 'Classic chicken burger served with fries',
  'Oga burger & french fries': 'Premium burger with all the toppings served with fries',
  'Cheesy affair burger & french fries': 'Cheese-loaded burger served with fries',
  'Standard shawarma': 'Classic shawarma wrap',
  'Cheese beef shawarma': 'Beef shawarma with extra cheese',
  'Suya wrapped with cheese': 'Spicy suya wrap with cheese',
  'Beef wrapped with cheese': 'Tender beef wrap with cheese',
  'Birdzilla suya sandwiches': 'Spicy suya sandwich',
  'Egg plantain sandwich': 'Sandwich with egg and sweet plantain',
  'Prawn pasta': 'Pasta with fresh prawns',
  'Pasta in tomato sauce with birdzilla': 'Tomato pasta with chicken',
  'Stir fry pasta with birdzilla': 'Stir-fried pasta with chicken',
  'Stir fry pasta with beef': 'Stir-fried pasta with beef chunks',
  'Asun rice': 'Spicy goat meat rice',
  'Malay rice': 'Malaysian style fried rice',
  'Jollof rice': 'Classic Nigerian smoky jollof rice',
  'Loaded fries (Small)': 'Small portion of fries with toppings',
  'Loaded fries (Large)': 'Large portion of fries with toppings',
  'Plantain': 'Fried sweet plantain',
  'French fries': 'Crispy potato fries',
  'Sweet potato fries': 'Crispy sweet potato fries',
  'Slaw': 'Fresh coleslaw',
  'Grilled chicken salad': 'Healthy salad with grilled chicken',
  'Wings 8 pieces': '8 pieces of spicy wings',
  'Wings 12 pieces': '12 pieces of spicy wings',
  'Wings 16 pieces': '16 pieces of spicy wings',
}

const RAW_MENU = [{category:"BURGER",items:[{id:1,name:"Birdzilla burger & french fries",price:10500,image:"",popularity:95,addedAt:"2025-08-25"},{id:2,name:"Oga burger & french fries",price:13900,image:"",popularity:88,addedAt:"2025-07-10"},{id:3,name:"Cheesy affair burger & french fries",price:11600,image:"",popularity:91,addedAt:"2025-09-05"}]},{category:"WRAPS",items:[{id:4,name:"Standard shawarma",price:7200,image:"",popularity:86,addedAt:"2025-09-10"},{id:5,name:"Cheese beef shawarma",price:9400,image:"",popularity:89,addedAt:"2025-08-30"},{id:6,name:"Suya wrapped with cheese",price:9e3,image:"",popularity:83,addedAt:"2025-09-16"},{id:7,name:"Beef wrapped with cheese",price:1e4,image:"",popularity:84,addedAt:"2025-06-20"}]},{category:"SANDWICH",items:[{id:8,name:"Birdzilla suya sandwiches",price:8900,image:"",popularity:80,addedAt:"2025-08-15"},{id:9,name:"Egg plantain sandwich",price:7200,image:"",popularity:77,addedAt:"2025-09-12"}]},{category:"PASTA",items:[{id:10,name:"Prawn pasta",price:11600,image:"",popularity:92,addedAt:"2025-07-28"},{id:11,name:"Pasta in tomato sauce with birdzilla",price:8300,image:"",popularity:79,addedAt:"2025-06-05"},{id:12,name:"Stir fry pasta with birdzilla",price:7200,image:"",popularity:82,addedAt:"2025-09-18"},{id:13,name:"Stir fry pasta with beef",price:8300,image:"",popularity:81,addedAt:"2025-09-20"}]},{category:"RICE",items:[{id:14,name:"Asun rice",price:9200,image:"",popularity:87,addedAt:"2025-09-01"},{id:15,name:"Malay rice",price:7200,image:"",popularity:75,addedAt:"2025-05-12"},{id:16,name:"Jollof rice",price:3900,image:"",popularity:98,addedAt:"2025-01-08"}]},{category:"FRIES",items:[{id:17,name:"Loaded fries (Small)",price:3900,image:"",popularity:78,addedAt:"2025-07-01"},{id:18,name:"Loaded fries (Large)",price:7800,image:"",popularity:85,addedAt:"2025-08-02"},{id:19,name:"Plantain",price:2300,image:"",popularity:90,addedAt:"2025-09-14"},{id:20,name:"French fries",price:2800,image:"",popularity:76,addedAt:"2025-03-22"},{id:21,name:"Sweet potato fries",price:2800,image:"",popularity:74,addedAt:"2025-04-10"}]},{category:"SALAD",items:[{id:22,name:"Slaw",price:2800,image:"",popularity:65,addedAt:"2025-08-08"},{id:23,name:"Grilled chicken salad",price:4500,image:"",popularity:82,addedAt:"2025-09-08"}]},{category:"WINGS",items:[{id:24,name:"Wings 8 pieces",price:6700,image:"",popularity:83,addedAt:"2025-07-18"},{id:25,name:"Wings 12 pieces",price:8900,image:"",popularity:88,addedAt:"2025-09-11"},{id:26,name:"Wings 16 pieces",price:11e3,image:"",popularity:90,addedAt:"2025-09-19"}]}]

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

    const items = RAW_MENU.flatMap(cat => cat.items.map(item => ({
      name: item.name,
      price: item.price,
      category: cat.category,
      description: EXISTING_DESCRIPTIONS[item.name] || '',
      popularity: item.popularity,
      imageUrl: '',
      isAvailable: true
    })))

    console.log(`Seeding ${items.length} menu items from web data...`)
    await MenuItem.insertMany(items)
    console.log('Menu updated successfully from web data!')
    
    process.exit(0)
  } catch (err) {
    console.error('Update failed:', err)
    process.exit(1)
  }
}

run()
