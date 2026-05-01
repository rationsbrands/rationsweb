import { Schema, model } from 'mongoose'

const settingsSchema = new Schema(
  {
    // Site Identity
    siteName: { type: String, default: 'Rations' },
    tagline: { type: String },
    description: { type: String },
    
    // Theme
    primaryColor: { type: String, default: '#FDCD2F' }, // Rations yellow

    // Contacts
    contacts: {
      email: String,
      phone: String,
      whatsapp: String,
      location: String,
    },

    // Socials (Array of { name, url })
    socials: [{
      name: String,
      url: String
    }],

    // Bank Info (Legacy - kept for backward compatibility)
    bank: {
      name: String,
      accountName: String,
      accountNumber: String,
    },

    // Bank Accounts (New - support multiple)
    bankAccounts: [{
      bankName: String,
      accountName: String,
      accountNumber: String,
    }],

    // Additional Contacts (New - support multiple extra contacts)
    additionalContacts: [{
      label: String, // e.g. "Support Line", "Branch Office"
      value: String, // e.g. "+234...", "Plot 456..."
      type: { type: String, enum: ['phone', 'email', 'address', 'other'], default: 'other' }
    }],

    // Promos & Events
    promoMessage: String,
    promoStart: Date,
    promoEnd: Date,
    
    eventMessage: String,
    eventDate: Date,
    eventStart: String, // Time string e.g. "14:00"
    eventEnd: String,   // Time string e.g. "18:00"

    visitorAlertEnabled: { type: Boolean, default: false },

    // Legacy/Other
    features: {
      menuEnabled: { type: Boolean, default: true },
      communityEnabled: { type: Boolean, default: true },
      orderingEnabled: { type: Boolean, default: true },
      promoPricingEnabled: { type: Boolean, default: false },
    },

    // Platform Integration Toggles
    platform: {
      syncMenu: { type: Boolean, default: false },
      checkAvailability: { type: Boolean, default: false },
      syncOrders: { type: Boolean, default: false },
    },

    // Third-Party Services
    payments: {
      provider: { type: String, default: 'none' },
      config: { type: Object }
    },
    messaging: {
      provider: { type: String, default: 'none' },
      config: { type: Object }
    },
    logistics: {
      provider: { type: String, default: 'none' },
      config: { type: Object }
    },

    // Instagram Automation Settings
    instagram: {
      enabled: { type: Boolean, default: false },
      autoImport: { type: Boolean, default: true },
      autoPublish: { type: Boolean, default: false },
      autoPublishHashtag: { type: String, default: '#rationsapproved' },
      filterHashtag: { type: String },
      filterKeyword: { type: String },
      maxPerRun: { type: Number, default: 10 },
      syncIntervalMinutes: { type: Number, default: 30 }
    }
  },
  { timestamps: true }
)

export default model('Settings', settingsSchema)
