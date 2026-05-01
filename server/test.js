const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  name: String,
  promoType: { type: String, enum: ['percentage', 'fixed_price'], default: null }
});

const MenuItem = mongoose.model('MenuItemTest', MenuItemSchema);

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/rations_test');
  try {
    const item = new MenuItem({ name: 'Test' });
    await item.save();
    console.log('Saved successfully');
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
run();
