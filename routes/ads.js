import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { ads, generateId } from '../utils/dataStore.js'

const adsRouter = new Hono()

// Get all ads (public)
adsRouter.get('/', async (c) => {
  try {
    const activeAds = ads.filter(ad => ad.isActive)
    return c.json({ success: true, ads: activeAds })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get single ad by ID (public - for deep-link)
adsRouter.get('/:id', async (c) => {
  try {
    const adId = c.req.param('id')
    const ad = ads.find(a => a.id === adId)
    
    if (!ad) {
      return c.json({ success: false, error: 'Ad not found' }, 404)
    }

    // Track click
    ad.clicks = (ad.clicks || 0) + 1

    return c.json({ success: true, ad })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Protected routes - require auth
adsRouter.use('/admin/*', authMiddleware)

// Create new ad (admin)
adsRouter.post('/admin/create', async (c) => {
  try {
    const { title, htmlContent, targetUrl, type } = await c.req.json()
    
    const newAd = {
      id: generateId(),
      title,
      htmlContent,
      targetUrl,
      type: type || 'banner', // banner, popup, push
      isActive: true,
      clicks: 0,
      impressions: 0,
      createdAt: new Date().toISOString(),
      createdBy: c.get('userId')
    }

    ads.push(newAd)

    return c.json({ 
      success: true, 
      ad: newAd,
      deepLink: `/ad/${newAd.id}`
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Update ad (admin)
adsRouter.put('/admin/:id', async (c) => {
  try {
    const adId = c.req.param('id')
    const updates = await c.req.json()
    
    const adIndex = ads.findIndex(a => a.id === adId)
    if (adIndex === -1) {
      return c.json({ success: false, error: 'Ad not found' }, 404)
    }

    ads[adIndex] = { ...ads[adIndex], ...updates, updatedAt: new Date().toISOString() }

    return c.json({ success: true, ad: ads[adIndex] })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Delete ad (admin)
adsRouter.delete('/admin/:id', async (c) => {
  try {
    const adId = c.req.param('id')
    
    const adIndex = ads.findIndex(a => a.id === adId)
    if (adIndex === -1) {
      return c.json({ success: false, error: 'Ad not found' }, 404)
    }

    ads.splice(adIndex, 1)

    return c.json({ success: true, message: 'Ad deleted successfully' })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get all ads with stats (admin)
adsRouter.get('/admin/all', async (c) => {
  try {
    return c.json({ success: true, ads })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default adsRouter
