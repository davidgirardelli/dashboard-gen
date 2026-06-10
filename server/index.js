import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'

const app = express()
app.use(cors())
app.use(express.json())

// Reuse connections across requests (keyed by URI)
const clients = new Map()

async function getClient(uri) {
  if (clients.has(uri)) return clients.get(uri)
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
  await client.connect()
  clients.set(uri, client)
  return client
}

app.post('/api/mongo', async (req, res) => {
  const { uri, db, collection, filter = {}, limit = 1000, projection } = req.body

  if (!uri)        return res.status(400).json({ error: 'uri é obrigatório' })
  if (!db)         return res.status(400).json({ error: 'db é obrigatório' })
  if (!collection) return res.status(400).json({ error: 'collection é obrigatória' })

  try {
    const client = await getClient(uri)
    let cursor = client.db(db).collection(collection).find(filter)
    if (projection && Object.keys(projection).length > 0) cursor = cursor.project(projection)
    cursor = cursor.limit(Math.min(Number(limit) || 1000, 10000))

    const docs = await cursor.toArray()
    const clean = docs.map(({ _id, ...rest }) => ({
      _id: _id?.toString(),
      ...rest,
    }))
    res.json(clean)
  } catch (err) {
    // Discard cached client if connection failed so next request retries
    clients.delete(uri)
    res.status(500).json({ error: err.message })
  }
})

// Health check
app.get('/api/mongo/ping', (_req, res) => res.json({ ok: true }))

const PORT = process.env.MONGO_PROXY_PORT || 3001
app.listen(PORT, () => console.log(`[dash-gen] MongoDB proxy em http://localhost:${PORT}`))
