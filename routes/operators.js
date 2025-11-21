import { Hono } from 'hono'
import { createClient } from '../utils/supabase.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const operators = new Hono()

operators.use('/*', authMiddleware)

operators.get('/', async (c) => {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('operators')
      .select('*')

    if (error) throw error

    return c.json({ success: true, operators: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

operators.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('operators')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return c.json({ success: true, operator: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

operators.post('/', async (c) => {
  try {
    const operatorData = await c.req.json()
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('operators')
      .insert(operatorData)
      .select()
      .single()

    if (error) throw error

    return c.json({ success: true, operator: data }, 201)
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

operators.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const updates = await c.req.json()
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('operators')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return c.json({ success: true, operator: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

operators.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const supabase = createClient()
    
    const { error } = await supabase
      .from('operators')
      .delete()
      .eq('id', id)

    if (error) throw error

    return c.json({ success: true, message: 'Operator deleted' })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default operators
