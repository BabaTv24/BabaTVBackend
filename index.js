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

dotenv.config()

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
  return c.json({ 
    message: 'API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      operators: '/api/operators',
      payments: '/api/payments',
      events: '/api/events',
      push: '/api/push'
    }
  })
})

app.route('/api/auth', auth)
app.route('/api/users', users)
app.route('/api/operators', operators)
app.route('/api/payments', payments)
app.route('/api/events', events)
app.route('/api/push', push)

const port = 5000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
