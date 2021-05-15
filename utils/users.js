const users = [];
const ticTacToeUsers = [];

function ticTacToeUserJoin(id, userName, roomId) {
  const user = { id, userName, roomId }
  ticTacToeUsers.push(user);
  console.log(ticTacToeUsers, "From users.js");
  return user
}

function getUsersAmt(){
  return ticTacToeUsers.length;
}

// Join user to chat
function userJoin(id, username, room, score) {
  const user = { id, username, room, score };

  users.push(user); 
  console.log(users);
  return user;
}

// Get current user
function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

//get Current Tic Tac Toe User
function getCurrentTicTacToeUser(id){
  return ticTacToeUsers.find(user => user.id === id);
}

// User leaves chat
function userLeave(id) {
  const index = users.findIndex(user => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

// Get room users
function getRoomUsers(room) {
  return users.filter(user => user.room === room);
}

module.exports = {
  userJoin,
  getCurrentUser,
  getCurrentTicTacToeUser,
  userLeave,
  getRoomUsers,
  ticTacToeUserJoin,
  getUsersAmt
};
