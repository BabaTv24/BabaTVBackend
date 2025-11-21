import { Hono } from 'hono'
import { createClient } from '../utils/supabase.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const users = new Hono()

users.use('/*', authMiddleware)

users.get('/profile', async (c) => {
  try {
    const userId = c.get('userId')
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error

    return c.json({ success: true, user: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

users.put('/profile', async (c) => {
  try {
    const userId = c.get('userId')
    const updates = await c.req.json()
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return c.json({ success: true, user: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

users.get('/', async (c) => {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('*')

    if (error) throw error

    return c.json({ success: true, users: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default users
