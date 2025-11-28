import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import dotenv from 'dotenv'

import auth from './routes/auth.js'
import users from './routes/users.js'
import operators from './routes/operators.js'
import payments from './routes/payments.js'
import events from './routes/events.js'
import push from './routes/push.js'
import adsRoutes from './routes/ads.js'
import couponsRoutes from './routes/coupons.js'
import testimonialsRoutes from './routes/testimonials.js'
import smsRoutes from './routes/sms.js'
import chatRoutes from './routes/chat.js'
import videoRoutes from './routes/video.js'
import adminRoutes from './routes/admin.js'

dotenv.config()

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
  return c.json({ 
    message: 'BabaTV24 API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      operators: '/api/operators',
      payments: '/api/payments',
      events: '/api/events',
      push: '/api/push',
      ads: '/api/ads',
      coupons: '/api/coupons',
      testimonials: '/api/testimonials',
      sms: '/api/sms',
      chat: '/api/chat',
      video: '/api/video',
      admin: '/api/admin'
    }
  })
})

app.route('/api/auth', auth)
app.route('/api/users', users)
app.route('/api/operators', operators)
app.route('/api/payments', payments)
app.route('/api/events', events)
app.route('/api/push', push)
app.route('/api/ads', adsRoutes)
app.route('/api/coupons', couponsRoutes)
app.route('/api/testimonials', testimonialsRoutes)
app.route('/api/sms', smsRoutes)
app.route('/api/chat', chatRoutes)
app.route('/api/video', videoRoutes)
app.route('/api/admin', adminRoutes)

app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({ 
    success: false, 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  }, 500)
})

app.notFound((c) => {
  return c.json({ 
    success: false, 
    error: 'Not found',
    message: `Route ${c.req.path} not found`
  }, 404)
})

const port = process.env.PORT || 5000
console.log(`BabaTV24 Backend running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
