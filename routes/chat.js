import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { chats, generateId } from '../utils/dataStore.js'

const chatRouter = new Hono()

// All chat routes require authentication
chatRouter.use('/*', authMiddleware)

// Get user's chat messages
chatRouter.get('/messages', async (c) => {
  try {
    const userId = c.get('userId')
    
    // Get messages where user is sender or recipient
    const userMessages = chats.filter(msg => 
      msg.senderId === userId || msg.recipientId === userId
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

    return c.json({ success: true, messages: userMessages })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get conversation with specific user/admin
chatRouter.get('/conversation/:recipientId', async (c) => {
  try {
    const userId = c.get('userId')
    const recipientId = c.req.param('recipientId')
    
    const conversation = chats.filter(msg => 
      (msg.senderId === userId && msg.recipientId === recipientId) ||
      (msg.senderId === recipientId && msg.recipientId === userId)
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

    // Mark messages as read
    conversation.forEach(msg => {
      if (msg.recipientId === userId && !msg.readAt) {
        msg.readAt = new Date().toISOString()
      }
    })

    return c.json({ success: true, messages: conversation })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Send message
chatRouter.post('/send', async (c) => {
  try {
    const userId = c.get('userId')
    const { recipientId, message, type } = await c.req.json()
    
    if (!recipientId || !message) {
      return c.json({ success: false, error: 'Recipient and message are required' }, 400)
    }

    const newMessage = {
      id: generateId(),
      senderId: userId,
      recipientId,
      message,
      type: type || 'text', // text, image, file
      createdAt: new Date().toISOString(),
      readAt: null
    }

    chats.push(newMessage)

    return c.json({ success: true, message: newMessage })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Send message to admin (special endpoint for users)
chatRouter.post('/contact-admin', async (c) => {
  try {
    const userId = c.get('userId')
    const { message, subject } = await c.req.json()
    
    if (!message) {
      return c.json({ success: false, error: 'Message is required' }, 400)
    }

    const newMessage = {
      id: generateId(),
      senderId: userId,
      recipientId: 'admin', // Special admin ID
      message,
      subject: subject || 'General Inquiry',
      type: 'support',
      createdAt: new Date().toISOString(),
      readAt: null
    }

    chats.push(newMessage)

    return c.json({ 
      success: true, 
      message: 'Message sent to admin',
      ticketId: newMessage.id
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get unread message count
chatRouter.get('/unread', async (c) => {
  try {
    const userId = c.get('userId')
    
    const unreadCount = chats.filter(msg => 
      msg.recipientId === userId && !msg.readAt
    ).length

    return c.json({ success: true, unreadCount })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Admin: Get all support messages
chatRouter.get('/admin/support', async (c) => {
  try {
    const supportMessages = chats.filter(msg => 
      msg.recipientId === 'admin' || msg.type === 'support'
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    return c.json({ success: true, messages: supportMessages })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Admin: Reply to user
chatRouter.post('/admin/reply', async (c) => {
  try {
    const adminId = c.get('userId')
    const { userId, message, originalMessageId } = await c.req.json()
    
    if (!userId || !message) {
      return c.json({ success: false, error: 'User ID and message are required' }, 400)
    }

    const replyMessage = {
      id: generateId(),
      senderId: 'admin',
      senderName: 'BabaTV24 Support',
      recipientId: userId,
      message,
      type: 'support-reply',
      replyTo: originalMessageId || null,
      createdAt: new Date().toISOString(),
      readAt: null
    }

    chats.push(replyMessage)

    return c.json({ success: true, message: replyMessage })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Delete message
chatRouter.delete('/message/:id', async (c) => {
  try {
    const userId = c.get('userId')
    const messageId = c.req.param('id')
    
    const messageIndex = chats.findIndex(msg => 
      msg.id === messageId && msg.senderId === userId
    )

    if (messageIndex === -1) {
      return c.json({ success: false, error: 'Message not found or not authorized' }, 404)
    }

    chats.splice(messageIndex, 1)

    return c.json({ success: true, message: 'Message deleted' })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default chatRouter
