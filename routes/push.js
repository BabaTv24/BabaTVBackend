import { Hono } from 'hono'
import { createClient } from '../utils/supabase.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { ads, pushQueue, generateId } from '../utils/dataStore.js'

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

push.post('/send-ad', async (c) => {
  try {
    const { adId, userIds, allUsers } = await c.req.json()
    
    const ad = ads.find(a => a.id === adId)
    if (!ad) {
      return c.json({ success: false, error: 'Ad not found' }, 404)
    }

    const pushNotification = {
      id: generateId(),
      title: ad.title || 'New from BabaTV24',
      body: ad.htmlContent ? ad.htmlContent.substring(0, 100) : 'Check out this new content!',
      data: {
        type: 'ad',
        adId: ad.id,
        link: `/ad/${ad.id}`,
        targetUrl: ad.targetUrl
      },
      createdAt: new Date().toISOString(),
      sentBy: c.get('userId')
    }

    pushQueue.push(pushNotification)

    ad.pushSent = (ad.pushSent || 0) + 1

    return c.json({ 
      success: true, 
      message: 'Ad push notification queued',
      notification: pushNotification,
      deepLink: `/ad/${ad.id}`
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

push.post('/send-broadcast', async (c) => {
  try {
    const { title, body, link, data } = await c.req.json()
    
    if (!title || !body) {
      return c.json({ success: false, error: 'Title and body are required' }, 400)
    }

    const pushNotification = {
      id: generateId(),
      type: 'broadcast',
      title,
      body,
      data: {
        ...data,
        link: link || '/'
      },
      createdAt: new Date().toISOString(),
      sentBy: c.get('userId')
    }

    pushQueue.push(pushNotification)

    return c.json({ 
      success: true, 
      message: 'Broadcast push notification queued',
      notification: pushNotification
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

push.get('/queue', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50')
    const recentPush = pushQueue.slice(-limit).reverse()
    
    return c.json({ 
      success: true, 
      notifications: recentPush,
      total: pushQueue.length 
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

push.post('/send-with-deeplink', async (c) => {
  try {
    const { title, body, targetType, targetId, userIds } = await c.req.json()
    
    if (!title || !body) {
      return c.json({ success: false, error: 'Title and body are required' }, 400)
    }

    let deepLink = '/'
    if (targetType === 'ad' && targetId) {
      deepLink = `/ad/${targetId}`
    } else if (targetType === 'video' && targetId) {
      deepLink = `/video/${targetId}`
    } else if (targetType === 'custom' && targetId) {
      deepLink = targetId
    }

    const pushNotification = {
      id: generateId(),
      type: 'deeplink',
      title,
      body,
      data: {
        targetType,
        targetId,
        link: deepLink
      },
      createdAt: new Date().toISOString(),
      sentBy: c.get('userId')
    }

    pushQueue.push(pushNotification)

    return c.json({ 
      success: true, 
      message: 'Deep-link push notification queued',
      notification: pushNotification,
      deepLink
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default push
