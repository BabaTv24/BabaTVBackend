import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { videoLoop, generateId } from '../utils/dataStore.js'

const videoRouter = new Hono()

// In-memory video playlist
const videoPlaylist = []

// Get current video loop (public)
videoRouter.get('/current', async (c) => {
  try {
    return c.json({ 
      success: true, 
      video: {
        url: videoLoop.url,
        title: videoLoop.title,
        isActive: videoLoop.isActive
      }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get video playlist (public)
videoRouter.get('/playlist', async (c) => {
  try {
    const activeVideos = videoPlaylist.filter(v => v.isActive)
    return c.json({ success: true, videos: activeVideos })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Admin routes
videoRouter.use('/admin/*', authMiddleware)

// Set main video loop URL (admin)
videoRouter.post('/admin/set-loop', async (c) => {
  try {
    const { url, title, isActive } = await c.req.json()
    
    if (!url) {
      return c.json({ success: false, error: 'Video URL is required' }, 400)
    }

    videoLoop.url = url
    videoLoop.title = title || 'BabaTV24 Live'
    videoLoop.isActive = isActive !== false
    videoLoop.updatedAt = new Date().toISOString()
    videoLoop.updatedBy = c.get('userId')

    return c.json({ success: true, videoLoop })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Toggle video loop active status (admin)
videoRouter.post('/admin/toggle', async (c) => {
  try {
    videoLoop.isActive = !videoLoop.isActive
    videoLoop.updatedAt = new Date().toISOString()

    return c.json({ 
      success: true, 
      isActive: videoLoop.isActive,
      message: videoLoop.isActive ? 'Video loop activated' : 'Video loop deactivated'
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Add video to playlist (admin)
videoRouter.post('/admin/playlist/add', async (c) => {
  try {
    const { url, title, description, thumbnail, duration } = await c.req.json()
    
    if (!url || !title) {
      return c.json({ success: false, error: 'URL and title are required' }, 400)
    }

    const newVideo = {
      id: generateId(),
      url,
      title,
      description: description || '',
      thumbnail: thumbnail || null,
      duration: duration || null,
      isActive: true,
      order: videoPlaylist.length,
      createdAt: new Date().toISOString(),
      createdBy: c.get('userId')
    }

    videoPlaylist.push(newVideo)

    return c.json({ success: true, video: newVideo })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Update video in playlist (admin)
videoRouter.put('/admin/playlist/:id', async (c) => {
  try {
    const videoId = c.req.param('id')
    const updates = await c.req.json()
    
    const videoIndex = videoPlaylist.findIndex(v => v.id === videoId)
    if (videoIndex === -1) {
      return c.json({ success: false, error: 'Video not found' }, 404)
    }

    videoPlaylist[videoIndex] = { 
      ...videoPlaylist[videoIndex], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    }

    return c.json({ success: true, video: videoPlaylist[videoIndex] })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Remove video from playlist (admin)
videoRouter.delete('/admin/playlist/:id', async (c) => {
  try {
    const videoId = c.req.param('id')
    
    const videoIndex = videoPlaylist.findIndex(v => v.id === videoId)
    if (videoIndex === -1) {
      return c.json({ success: false, error: 'Video not found' }, 404)
    }

    videoPlaylist.splice(videoIndex, 1)

    return c.json({ success: true, message: 'Video removed from playlist' })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Reorder playlist (admin)
videoRouter.post('/admin/playlist/reorder', async (c) => {
  try {
    const { videoIds } = await c.req.json()
    
    if (!videoIds || !Array.isArray(videoIds)) {
      return c.json({ success: false, error: 'Video IDs array required' }, 400)
    }

    // Update order based on array position
    videoIds.forEach((id, index) => {
      const video = videoPlaylist.find(v => v.id === id)
      if (video) {
        video.order = index
      }
    })

    // Sort by new order
    videoPlaylist.sort((a, b) => a.order - b.order)

    return c.json({ success: true, message: 'Playlist reordered' })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

// Get full playlist with inactive videos (admin)
videoRouter.get('/admin/playlist/all', async (c) => {
  try {
    return c.json({ success: true, videos: videoPlaylist, currentLoop: videoLoop })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400)
  }
})

export default videoRouter
