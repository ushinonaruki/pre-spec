import express from 'express'
import { createRouter } from './routes'

const PORT = parseInt(process.env.BACKEND_PORT_CONTAINER ?? '3001', 10)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000'

const app = express()

app.use(express.json({ limit: '10mb' }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.use(createRouter())

app.listen(PORT, () => {
  console.log(`backend listening on port ${PORT}`)
})
