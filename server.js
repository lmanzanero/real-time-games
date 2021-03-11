const path = require('path');
const http = require('http');
const express = require('express');
const router = express.Router();
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  ticTacToeUserJoin,
  getUsersAmt,
  getCurrentTicTacToeUser
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
router.get('/', (req, res) => {
  res.render(path.join(__dirname, 'public/index.html'));
})
router.get('/tic-tac-toe', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tic-tac-toe.html'));
});

router.get('/vocab-quiz', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/quiz.html'));
});


router.get('/tic-tac-toe/:room', (req, res) => {    
    io.on('connection', (socket) => {
      console.log('a user connected');
      if(getUsersAmt() <= 2) {
        socket.on('joinGame', ({userName, roomId}) => { 
          const user = ticTacToeUserJoin(socket.id, userName, roomId); 
          socket.join(user.roomId);
        });

         // Listen for user pick
        socket.on('userPick', ({currentCellIndex, currentClass}) => {
          console.log(currentCellIndex, currentClass);
          const user = getCurrentTicTacToeUser(socket.id); 
          io.to(user.roomId).emit('cell', ({currentCellIndex, currentClass})); 
        });

        socket.on('endGame', (winner) => {
          const user = getCurrentTicTacToeUser(socket.id);
            io.to(user.roomId).emit('winner', winner); 
        });

        socket.on('restartGame', () => {
          console.log('game restarted');
        })
      } else {
        console.log("Cannot Join Game");
      }
      socket.on('disconnect', () => {
        console.log('user disconnected');
      });
    });
    res.sendFile(path.join(__dirname, 'public/tic-tac-toe.html'));
});

const botName = 'ChatCord Bot';


// Run when client connects
io.on('connection', socket => { 
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });
      

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

app.use('/', router);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
