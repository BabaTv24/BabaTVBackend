import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { userMeta, ads, coupons, testimonials, chats, videoLoop, generateId } from '../utils/dataStore.js'
import { createClient } from '../utils/supabase.js'

const adminRouter = new Hono()

// All admin routes require authentication
adminRouter.use('/*', authMiddleware)

// Dashboard stats
adminRouter.get('/dashboard', async (c) => {
  try {
    const stats = {
      totalAds: ads.length,
      activeAds: ads.filter(a => a.isActive).length,
      totalCoupons: coupons.length,
      activeCoupons: coupons.filter(cp => cp.isActive).length,
      totalTestimonials: testimonials.length,
      pendingTestimonials: testimonials.filter(t => !t.isApproved).length,
      unreadMessages: chats.filter(m => m.recipientId === 'admin' && !m.readAt).length,
      videoLoopActive: videoLoop.isActive,
      premiumUsers: Array.from(userMeta.values()).filter(u => u.isPremium).length
    }

    return c.json({ success: true, stats })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// User management - Get all users with metadata
adminRouter.get('/users', async (c) => {
  try {
    const supabase = createClient()
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')

    if (error) throw error

    // Enrich with in-memory metadata
    const enrichedUsers = (users || []).map(user => ({
      ...user,
      meta: userMeta.get(user.id) || { tags: [], isPremium: false }
    }))

    return c.json({ success: true, users: enrichedUsers })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Toggle premium status for user
adminRouter.post('/users/:userId/toggle-premium', async (c) => {
  try {
    const userId = c.req.param('userId')
    
    let meta = userMeta.get(userId)
    if (!meta) {
      meta = { tags: [], isPremium: false }
    }

    meta.isPremium = !meta.isPremium
    meta.premiumToggledAt = new Date().toISOString()
    meta.premiumToggledBy = c.get('userId')
    
    userMeta.set(userId, meta)

    return c.json({ 
      success: true, 
      userId,
      isPremium: meta.isPremium,
      message: meta.isPremium ? 'User is now premium' : 'Premium removed from user'
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Set premium status explicitly
adminRouter.post('/users/:userId/set-premium', async (c) => {
  try {
    const userId = c.req.param('userId')
    const { isPremium, expiresAt } = await c.req.json()
    
    let meta = userMeta.get(userId) || { tags: [], isPremium: false }

    meta.isPremium = isPremium
    meta.premiumExpiresAt = expiresAt || null
    meta.premiumSetAt = new Date().toISOString()
    meta.premiumSetBy = c.get('userId')
    
    userMeta.set(userId, meta)

    return c.json({ 
      success: true, 
      userId,
      isPremium: meta.isPremium,
      expiresAt: meta.premiumExpiresAt
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Add tag to user
adminRouter.post('/users/:userId/tags', async (c) => {
  try {
    const userId = c.req.param('userId')
    const { tag } = await c.req.json()
    
    if (!tag) {
      return c.json({ success: false, error: 'Tag is required' }, 400)
    }

    let meta = userMeta.get(userId)
    if (!meta) {
      meta = { tags: [], isPremium: false }
    }

    if (!meta.tags.includes(tag)) {
      meta.tags.push(tag)
    }
    
    userMeta.set(userId, meta)

    return c.json({ success: true, userId, tags: meta.tags })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Remove tag from user
adminRouter.delete('/users/:userId/tags/:tag', async (c) => {
  try {
    const userId = c.req.param('userId')
    const tag = c.req.param('tag')
    
    let meta = userMeta.get(userId)
    if (!meta) {
      return c.json({ success: false, error: 'User metadata not found' }, 404)
    }

    meta.tags = meta.tags.filter(t => t !== tag)
    userMeta.set(userId, meta)

    return c.json({ success: true, userId, tags: meta.tags })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get users by tag
adminRouter.get('/users/by-tag/:tag', async (c) => {
  try {
    const tag = c.req.param('tag')
    
    const usersWithTag = []
    userMeta.forEach((meta, odId) => {
      if (meta.tags && meta.tags.includes(tag)) {
        usersWithTag.push({ userId, ...meta })
      }
    })

    return c.json({ success: true, users: usersWithTag })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get all premium users
adminRouter.get('/users/premium', async (c) => {
  try {
    const premiumUsers = []
    userMeta.forEach((meta, userId) => {
      if (meta.isPremium) {
        premiumUsers.push({ userId, ...meta })
      }
    })

    return c.json({ success: true, users: premiumUsers })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get all available tags
adminRouter.get('/tags', async (c) => {
  try {
    const allTags = new Set()
    userMeta.forEach((meta) => {
      if (meta.tags) {
        meta.tags.forEach(tag => allTags.add(tag))
      }
    })

    return c.json({ success: true, tags: Array.from(allTags) })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Bulk action - Add tag to multiple users
adminRouter.post('/users/bulk/add-tag', async (c) => {
  try {
    const { userIds, tag } = await c.req.json()
    
    if (!userIds || !tag) {
      return c.json({ success: false, error: 'User IDs and tag are required' }, 400)
    }

    userIds.forEach(userId => {
      let meta = userMeta.get(userId) || { tags: [], isPremium: false }
      if (!meta.tags.includes(tag)) {
        meta.tags.push(tag)
      }
      userMeta.set(userId, meta)
    })

    return c.json({ success: true, message: `Tag "${tag}" added to ${userIds.length} users` })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Bulk action - Set premium for multiple users
adminRouter.post('/users/bulk/set-premium', async (c) => {
  try {
    const { userIds, isPremium, expiresAt } = await c.req.json()
    
    if (!userIds) {
      return c.json({ success: false, error: 'User IDs are required' }, 400)
    }

    userIds.forEach(userId => {
      let meta = userMeta.get(userId) || { tags: [], isPremium: false }
      meta.isPremium = isPremium
      meta.premiumExpiresAt = expiresAt || null
      meta.premiumSetAt = new Date().toISOString()
      userMeta.set(userId, meta)
    })

    return c.json({ 
      success: true, 
      message: `Premium status ${isPremium ? 'enabled' : 'disabled'} for ${userIds.length} users` 
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Activity log (placeholder)
const activityLog = []

adminRouter.get('/activity', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50')
    return c.json({ success: true, activities: activityLog.slice(-limit).reverse() })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default adminRouter
