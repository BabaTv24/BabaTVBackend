import { Hono } from 'hono'
import { createClient } from '../utils/supabase.js'
import { signToken } from '../utils/jwt.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const auth = new Hono()

const JWT_SECRET = process.env.JWT_SECRET || 'babatv24-secret-key-change-in-production'
const USERS_TABLE = process.env.USERS_TABLE || 'users'

const getSupabaseClient = () => {
  try {
    return createClient()
  } catch {
    return null
  }
}

auth.post('/register', async (c) => {
  try {
    const { email, password, name, firstName, lastName, refCode } = await c.req.json()
    const supabase = getSupabaseClient()
    
    if (!supabase) {
      return c.json({ success: false, error: 'Database not configured' }, 500)
    }

    if (!email || !password) {
      return c.json({ success: false, error: 'Email and password are required' }, 400)
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { data: existing } = await supabase
      .from(USERS_TABLE)
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      return c.json({ success: false, error: 'Email already registered' }, 409)
    }

    const password_hash = await bcrypt.hash(password, 10)

    let referrer = null
    let sponsorId = 369
    let ebene = 1
    let referredByPublicId = null

    if (refCode) {
      const { data: referrerUser } = await supabase
        .from(USERS_TABLE)
        .select('id, public_id, sponsor_id')
        .eq('ref_code', refCode)
        .maybeSingle()

      if (referrerUser) {
        referrer = referrerUser
        referredByPublicId = referrerUser.public_id
        ebene = 2
      }
    }

    const now = new Date().toISOString()
    const newRefCode = `BABA-${Date.now().toString(36).toUpperCase()}`

    const userData = {
      email: normalizedEmail,
      password_hash,
      first_name: firstName || name?.split(' ')[0] || '',
      last_name: lastName || name?.split(' ').slice(1).join(' ') || '',
      role: 'user',
      plan: 'VIP',
      access_status: 'active',
      must_change_password: false,
      ref_code: newRefCode,
      external_id: newRefCode,
      sponsor_id: sponsorId,
      ebene: ebene,
      referred_by_public_id: referredByPublicId,
      source: refCode ? 'referral' : 'signup',
      created_at: now,
      updated_at: now
    }

    const { data: newUser, error: insertError } = await supabase
      .from(USERS_TABLE)
      .insert(userData)
      .select('id, public_id, email, role, ref_code')
      .single()

    if (insertError) {
      console.error('[AUTH] Register error:', insertError.message)
      return c.json({ success: false, error: 'Registration failed', details: insertError.message }, 500)
    }

    const token = jwt.sign(
      {
        sub: newUser.id,
        role: newUser.role,
        email: newUser.email,
        public_id: newUser.public_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    console.info(`[AUTH] User registered: ${normalizedEmail}, public_id=${newUser.public_id}`)

    return c.json({ 
      success: true, 
      token,
      user: {
        id: newUser.id,
        publicId: newUser.public_id,
        email: newUser.email,
        role: newUser.role,
        refCode: newUser.ref_code
      },
      message: 'Registration successful' 
    })
  } catch (error) {
    console.error('[AUTH] Register error:', error.message)
    return c.json({ success: false, error: error.message }, 400)
  }
})

auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    const supabase = getSupabaseClient()

    if (!email || !password) {
      return c.json({ success: false, error: 'Missing email or password' }, 400)
    }

    if (!supabase) {
      return c.json({ success: false, error: 'Database not configured' }, 500)
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.info(`[AUTH] Login attempt for: ${normalizedEmail}`)

    const { data: user, error } = await supabase
      .from(USERS_TABLE)
      .select('id, public_id, email, password_hash, must_change_password, access_status, role, sponsor_id, sponsor_public_id, ebene, ref_code, first_name, last_name')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (error) {
      console.error('[AUTH] Login DB error:', error.message)
      return c.json({ success: false, error: 'Login failed' }, 500)
    }

    if (!user) {
      console.warn(`[AUTH] Login failed: user not found for ${normalizedEmail}`)
      return c.json({ success: false, error: 'Invalid credentials' }, 401)
    }

    const accessStatus = user.access_status || 'active'
    if (accessStatus !== 'active') {
      console.warn(`[AUTH] Login failed: account inactive for ${normalizedEmail}`)
      return c.json({ success: false, error: 'Account inactive' }, 403)
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash || '')
    if (!passwordValid) {
      console.warn(`[AUTH] Login failed: invalid password for ${normalizedEmail}`)
      return c.json({ success: false, error: 'Invalid credentials' }, 401)
    }

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role || 'user',
        email: user.email,
        public_id: user.public_id,
        sponsor_public_id: user.sponsor_public_id,
        sponsor_id: user.sponsor_id,
        ebene: user.ebene
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    console.info(`[AUTH] Login SUCCESS for: ${normalizedEmail}, public_id=${user.public_id}`)

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        publicId: user.public_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role || 'user',
        mustChangePassword: !!user.must_change_password,
        sponsorPublicId: user.sponsor_public_id,
        sponsorId: user.sponsor_id,
        ebene: user.ebene,
        refCode: user.ref_code
      }
    })
  } catch (error) {
    console.error('[AUTH] Login error:', error.message)
    return c.json({ success: false, error: error.message }, 500)
  }
})

auth.post('/logout', async (c) => {
  try {
    c.header('Set-Cookie', 'admin_token=; Path=/; HttpOnly; Max-Age=0')
    c.header('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0')
    c.header('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Max-Age=0')
    
    console.info('[AUTH] Logout - cleared cookies')

    return c.json({ 
      success: true, 
      message: 'Logged out successfully',
      frontendAction: 'clearLocalStorage'
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

auth.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'No token provided' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return c.json({ success: false, error: 'Database not configured' }, 500)
    }

    const { data: user, error } = await supabase
      .from(USERS_TABLE)
      .select('id, public_id, email, first_name, last_name, role, access_status, ref_code, sponsor_id, sponsor_public_id, ebene, must_change_password')
      .eq('id', decoded.sub)
      .maybeSingle()

    if (error || !user) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        publicId: user.public_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role || 'user',
        accessStatus: user.access_status,
        mustChangePassword: !!user.must_change_password,
        refCode: user.ref_code,
        sponsorId: user.sponsor_id,
        sponsorPublicId: user.sponsor_public_id,
        ebene: user.ebene
      }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default auth
