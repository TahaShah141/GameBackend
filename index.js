const express = require("express")
const app = express()
const http = require('http')
const {Server} = require("socket.io")
const cors = require("cors")

app.use(cors())
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: "*"
    }
})


const moveStacks = {}
const roomSettings= {}

io.on("connection", (socket) => {
    console.log("Connected:", socket.id)
    
    socket.on("connected", (room) => {
      const size = io.sockets.adapter.rooms.get(room).size
      io.in(room).emit("connected", size, roomSettings[room].playerCount)
    })
    
    socket.on("sync", (room, syncMoves) => {
      syncMoves(moveStacks[room], roomSettings[room])
    })
    
    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id)
    })

    socket.on("disconnecting", () => {
        console.log("Disconnecting:", socket.id)
        for (const room of socket.rooms) {
          if (room !== socket.id) {
            const size = io.sockets.adapter.rooms.get(room).size
            const limit = roomSettings[room].playerCount
            setTimeout(() => socket.to(room).emit("disconnected", size, limit), 2000)
          }
        }
    })

    socket.on("makeRoom", (roomID, settings, roomMade) => {
      roomSettings[roomID] = settings
      console.log("MADE ROOM", roomID, settings)
      roomMade()
    })

    socket.on("joinRoom", (roomID, onJoin) => {
      socket.join(roomID)
      const size = io.sockets.adapter.rooms.get(roomID).size
      if (moveStacks[roomID] === undefined) moveStacks[roomID] = []
      onJoin(size, roomSettings[roomID])
      socket.broadcast.emit("joinRoom", roomID)
    })

    socket.on("leaveRoom", (roomID) => {
      socket.leave(roomID)
    })

    socket.on("moveMade", (room, payload) => {
      socket.to(room).emit("moveMade", payload)
      moveStacks[room].push(payload)
    })

    socket.on("newGame", (room, settings) => {
      socket.to(room).emit("newGame", settings)
      moveStacks[room] = []
    })

    socket.on("message", (room, message, callback) => {
      socket.to(room).emit("message", message)
      callback(room)
    })
})

server.listen(4000, () => {
    console.log("STARTED SERVER")
})