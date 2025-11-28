import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { testimonials, generateId } from '../utils/dataStore.js'

const testimonialsRouter = new Hono()

// Get all approved testimonials (public)
testimonialsRouter.get('/', async (c) => {
  try {
    const approvedTestimonials = testimonials.filter(t => t.isApproved)
    return c.json({ success: true, testimonials: approvedTestimonials })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Submit new testimonial (public or authenticated)
testimonialsRouter.post('/submit', async (c) => {
  try {
    const { name, email, rating, message, avatarUrl } = await c.req.json()
    
    if (!name || !message || !rating) {
      return c.json({ success: false, error: 'Name, message and rating are required' }, 400)
    }

    if (rating < 1 || rating > 5) {
      return c.json({ success: false, error: 'Rating must be between 1 and 5' }, 400)
    }

    const newTestimonial = {
      id: generateId(),
      name,
      email: email || null,
      rating,
      message,
      avatarUrl: avatarUrl || null,
      isApproved: false, // Requires admin approval
      createdAt: new Date().toISOString()
    }

    testimonials.push(newTestimonial)

    return c.json({ 
      success: true, 
      message: 'Testimonial submitted for review',
      testimonial: { id: newTestimonial.id }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Admin routes
testimonialsRouter.use('/admin/*', authMiddleware)

// Get all testimonials including pending (admin)
testimonialsRouter.get('/admin/all', async (c) => {
  try {
    return c.json({ success: true, testimonials })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get pending testimonials (admin)
testimonialsRouter.get('/admin/pending', async (c) => {
  try {
    const pendingTestimonials = testimonials.filter(t => !t.isApproved)
    return c.json({ success: true, testimonials: pendingTestimonials })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Approve testimonial (admin)
testimonialsRouter.post('/admin/approve/:id', async (c) => {
  try {
    const testimonialId = c.req.param('id')
    
    const testimonialIndex = testimonials.findIndex(t => t.id === testimonialId)
    if (testimonialIndex === -1) {
      return c.json({ success: false, error: 'Testimonial not found' }, 404)
    }

    testimonials[testimonialIndex].isApproved = true
    testimonials[testimonialIndex].approvedAt = new Date().toISOString()
    testimonials[testimonialIndex].approvedBy = c.get('userId')

    return c.json({ success: true, testimonial: testimonials[testimonialIndex] })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Reject/Delete testimonial (admin)
testimonialsRouter.delete('/admin/:id', async (c) => {
  try {
    const testimonialId = c.req.param('id')
    
    const testimonialIndex = testimonials.findIndex(t => t.id === testimonialId)
    if (testimonialIndex === -1) {
      return c.json({ success: false, error: 'Testimonial not found' }, 404)
    }

    testimonials.splice(testimonialIndex, 1)

    return c.json({ success: true, message: 'Testimonial deleted successfully' })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Create testimonial directly (admin)
testimonialsRouter.post('/admin/create', async (c) => {
  try {
    const { name, email, rating, message, avatarUrl } = await c.req.json()
    
    const newTestimonial = {
      id: generateId(),
      name,
      email: email || null,
      rating: rating || 5,
      message,
      avatarUrl: avatarUrl || null,
      isApproved: true,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: c.get('userId')
    }

    testimonials.push(newTestimonial)

    return c.json({ success: true, testimonial: newTestimonial })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default testimonialsRouter
