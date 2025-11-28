import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { coupons, generateId } from '../utils/dataStore.js'

const couponsRouter = new Hono()

// Validate coupon (public)
couponsRouter.post('/validate', async (c) => {
  try {
    const { code } = await c.req.json()
    
    const coupon = coupons.find(cp => 
      cp.code.toUpperCase() === code.toUpperCase() && cp.isActive
    )

    if (!coupon) {
      return c.json({ success: false, error: 'Invalid or expired coupon' }, 404)
    }

    // Check if coupon is expired
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return c.json({ success: false, error: 'Coupon has expired' }, 400)
    }

    // Check usage limit
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return c.json({ success: false, error: 'Coupon usage limit reached' }, 400)
    }

    return c.json({ 
      success: true, 
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description
      }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Apply coupon (protected)
couponsRouter.use('/apply', authMiddleware)
couponsRouter.post('/apply', async (c) => {
  try {
    const { code, originalPrice } = await c.req.json()
    const userId = c.get('userId')
    
    const coupon = coupons.find(cp => 
      cp.code.toUpperCase() === code.toUpperCase() && cp.isActive
    )

    if (!coupon) {
      return c.json({ success: false, error: 'Invalid coupon' }, 404)
    }

    // Calculate discount
    let finalPrice = originalPrice
    if (coupon.discountType === 'percentage') {
      finalPrice = originalPrice * (1 - coupon.discountValue / 100)
    } else if (coupon.discountType === 'fixed') {
      finalPrice = Math.max(0, originalPrice - coupon.discountValue)
    }

    // Increment usage count
    coupon.usedCount = (coupon.usedCount || 0) + 1
    coupon.usedBy = coupon.usedBy || []
    coupon.usedBy.push({ userId, usedAt: new Date().toISOString() })

    return c.json({ 
      success: true, 
      originalPrice,
      discountAmount: originalPrice - finalPrice,
      finalPrice: Math.round(finalPrice * 100) / 100
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Admin routes
couponsRouter.use('/admin/*', authMiddleware)

// Create coupon (admin)
couponsRouter.post('/admin/create', async (c) => {
  try {
    const { code, discountType, discountValue, description, expiresAt, maxUses } = await c.req.json()
    
    // Check if code already exists
    if (coupons.find(cp => cp.code.toUpperCase() === code.toUpperCase())) {
      return c.json({ success: false, error: 'Coupon code already exists' }, 400)
    }

    const newCoupon = {
      id: generateId(),
      code: code.toUpperCase(),
      discountType: discountType || 'percentage', // percentage or fixed
      discountValue: discountValue || 10,
      description: description || '',
      expiresAt: expiresAt || null,
      maxUses: maxUses || null,
      usedCount: 0,
      usedBy: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: c.get('userId')
    }

    coupons.push(newCoupon)

    return c.json({ success: true, coupon: newCoupon })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get all coupons (admin)
couponsRouter.get('/admin/all', async (c) => {
  try {
    return c.json({ success: true, coupons })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Update coupon (admin)
couponsRouter.put('/admin/:id', async (c) => {
  try {
    const couponId = c.req.param('id')
    const updates = await c.req.json()
    
    const couponIndex = coupons.findIndex(cp => cp.id === couponId)
    if (couponIndex === -1) {
      return c.json({ success: false, error: 'Coupon not found' }, 404)
    }

    coupons[couponIndex] = { ...coupons[couponIndex], ...updates, updatedAt: new Date().toISOString() }

    return c.json({ success: true, coupon: coupons[couponIndex] })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Delete coupon (admin)
couponsRouter.delete('/admin/:id', async (c) => {
  try {
    const couponId = c.req.param('id')
    
    const couponIndex = coupons.findIndex(cp => cp.id === couponId)
    if (couponIndex === -1) {
      return c.json({ success: false, error: 'Coupon not found' }, 404)
    }

    coupons.splice(couponIndex, 1)

    return c.json({ success: true, message: 'Coupon deleted successfully' })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default couponsRouter
