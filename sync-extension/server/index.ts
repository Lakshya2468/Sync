import cors from 'cors'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'

const app = express()
app.use(cors())

// Simple route to test server
app.get('/', (req, res) => {
  res.json({ message: 'Socket.IO server is runnidng', status: 'ok' })
})

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`)

  socket.on('joinRoom', room => {
    socket.join(room)
    console.log(`User ${socket.id} joined room ${room}`)
  })

  socket.on('play', data => {
    io.to(data.room).emit('play', data)
    console.log(`Play in room ${data.room} at ${data.time}`)
  })

  socket.on('pause', data => {
    io.to(data.room).emit('pause', data)
    console.log(`Pause in room ${data.room} at ${data.time}`)
  })

  socket.on('seek', data => {
    io.to(data.room).emit('seek', data)
    console.log(`Seek in room ${data.room} to ${data.time}`)
  })

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`)
  })
})

server.listen(3000, () =>
  console.log('Server running on http://localhost:3000')
)
