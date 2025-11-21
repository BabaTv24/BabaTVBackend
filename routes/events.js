import { Hono } from 'hono'
import { createClient } from '../utils/supabase.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const events = new Hono()

events.use('/*', authMiddleware)

events.get('/', async (c) => {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return c.json({ success: true, events: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

events.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return c.json({ success: true, event: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

events.post('/', async (c) => {
  try {
    const eventData = await c.req.json()
    const userId = c.get('userId')
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('events')
      .insert({ ...eventData, created_by: userId })
      .select()
      .single()

    if (error) throw error

    return c.json({ success: true, event: data }, 201)
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

events.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const updates = await c.req.json()
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return c.json({ success: true, event: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

events.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const supabase = createClient()
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) throw error

    return c.json({ success: true, message: 'Event deleted' })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default events
