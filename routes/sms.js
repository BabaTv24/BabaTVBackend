import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { generateId } from '../utils/dataStore.js'

const smsRouter = new Hono()

// In-memory SMS log
const smsLog = []

// All SMS routes require authentication
smsRouter.use('/*', authMiddleware)

// Send SMS (placeholder for Twilio/Vonage)
smsRouter.post('/send', async (c) => {
  try {
    const { to, message, template } = await c.req.json()
    
    if (!to || !message) {
      return c.json({ success: false, error: 'Phone number and message are required' }, 400)
    }

    // Placeholder for Twilio/Vonage integration
    // In production, replace with actual SMS API call
    const smsId = generateId()
    
    const smsRecord = {
      id: smsId,
      to,
      message,
      template: template || null,
      status: 'queued', // queued, sent, delivered, failed
      sentBy: c.get('userId'),
      createdAt: new Date().toISOString()
    }

    smsLog.push(smsRecord)

    // Simulate SMS sending (placeholder)
    // In production: 
    // const client = require('twilio')(accountSid, authToken)
    // await client.messages.create({ body: message, to: to, from: '+1234567890' })

    // Update status to 'sent' (simulated)
    smsRecord.status = 'sent'
    smsRecord.sentAt = new Date().toISOString()

    return c.json({ 
      success: true, 
      message: 'SMS queued for delivery',
      smsId,
      note: 'This is a placeholder. Configure Twilio/Vonage for production.'
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Send bulk SMS
smsRouter.post('/send-bulk', async (c) => {
  try {
    const { recipients, message, template } = await c.req.json()
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return c.json({ success: false, error: 'Recipients array is required' }, 400)
    }

    if (!message) {
      return c.json({ success: false, error: 'Message is required' }, 400)
    }

    const results = []

    for (const recipient of recipients) {
      const smsId = generateId()
      
      const smsRecord = {
        id: smsId,
        to: recipient,
        message,
        template: template || null,
        status: 'sent', // Simulated
        sentBy: c.get('userId'),
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString()
      }

      smsLog.push(smsRecord)
      results.push({ to: recipient, smsId, status: 'sent' })
    }

    return c.json({ 
      success: true, 
      message: `${results.length} SMS messages queued`,
      results,
      note: 'This is a placeholder. Configure Twilio/Vonage for production.'
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get SMS history
smsRouter.get('/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50')
    const recentSms = smsLog.slice(-limit).reverse()
    
    return c.json({ success: true, messages: recentSms, total: smsLog.length })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get SMS status by ID
smsRouter.get('/status/:id', async (c) => {
  try {
    const smsId = c.req.param('id')
    const sms = smsLog.find(s => s.id === smsId)
    
    if (!sms) {
      return c.json({ success: false, error: 'SMS not found' }, 404)
    }

    return c.json({ success: true, sms })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// SMS templates (placeholder)
const smsTemplates = [
  { id: 'welcome', name: 'Welcome', message: 'Welcome to BabaTV24! Your account is now active.' },
  { id: 'activation', name: 'Activation', message: 'Your BabaTV24 activation code is: {code}' },
  { id: 'reminder', name: 'Reminder', message: 'Don\'t forget to check out the latest content on BabaTV24!' },
  { id: 'promo', name: 'Promotion', message: 'Special offer! Get premium access at a discount. Visit BabaTV24 now!' }
]

// Get SMS templates
smsRouter.get('/templates', async (c) => {
  try {
    return c.json({ success: true, templates: smsTemplates })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default smsRouter
