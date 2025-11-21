import { Hono } from 'hono'
import { createClient } from '../utils/supabase.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const payments = new Hono()

payments.use('/*', authMiddleware)

payments.get('/', async (c) => {
  try {
    const userId = c.get('userId')
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return c.json({ success: true, payments: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

payments.post('/', async (c) => {
  try {
    const userId = c.get('userId')
    const paymentData = await c.req.json()
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('payments')
      .insert({ ...paymentData, user_id: userId })
      .select()
      .single()

    if (error) throw error

    return c.json({ success: true, payment: data }, 201)
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

payments.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId')
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) throw error

    return c.json({ success: true, payment: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default payments
