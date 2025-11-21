import { Hono } from 'hono'
import { createClient } from '../utils/supabase.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const push = new Hono()

push.use('/*', authMiddleware)

push.post('/subscribe', async (c) => {
  try {
    const userId = c.get('userId')
    const { subscription } = await c.req.json()
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: userId,
        subscription: subscription
      })
      .select()
      .single()

    if (error) throw error

    return c.json({ success: true, subscription: data })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

push.post('/unsubscribe', async (c) => {
  try {
    const userId = c.get('userId')
    const { endpoint } = await c.req.json()
    const supabase = createClient()
    
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('subscription->endpoint', endpoint)

    if (error) throw error

    return c.json({ success: true, message: 'Unsubscribed successfully' })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

push.post('/send', async (c) => {
  try {
    const { userId, title, body, data } = await c.req.json()
    const supabase = createClient()
    
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (error) throw error

    return c.json({ 
      success: true, 
      message: 'Push notifications queued',
      count: subscriptions.length 
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default push
