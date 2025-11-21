import { Hono } from 'hono'
import { createClient } from '../utils/supabase.js'
import { signToken } from '../utils/jwt.js'

const auth = new Hono()

auth.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json()
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })

    if (error) throw error

    return c.json({ 
      success: true, 
      user: data.user,
      message: 'Registration successful' 
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    const token = signToken({ userId: data.user.id, email: data.user.email })

    return c.json({ 
      success: true, 
      token,
      user: data.user
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 401)
  }
})

auth.post('/logout', async (c) => {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    
    if (error) throw error

    return c.json({ success: true, message: 'Logged out successfully' })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default auth
