// Minimal Hono worker to verify routing under Trex
import { Hono } from "hono"

const app = new Hono()

app.get('/', (c) => c.text('supabase-storage alive'))
app.get('/buckets', (c) => c.json({ buckets: [] }))

export default { fetch: app.fetch }


