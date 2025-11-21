import { verifyToken } from '../utils/jwt.js'

export const authMiddleware = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    c.set('userId', decoded.userId)
    c.set('email', decoded.email)
    
    await next()
  } catch (error) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401)
  }
}
