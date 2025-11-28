// In-memory data storage for BabaTV Backend
// Compatible with Render FREE tier (no database required)

// Generate unique IDs
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// HTML Banner Ads storage
export const ads = []

// Coupons storage
export const coupons = []

// Testimonials storage
export const testimonials = []

// Chat messages storage
export const chats = []

// Video loop configuration
export const videoLoop = {
  url: null,
  title: 'BabaTV24 Live',
  isActive: false
}

// User tags and premium status (in-memory cache)
export const userMeta = new Map()

// Push notification queue
export const pushQueue = []
