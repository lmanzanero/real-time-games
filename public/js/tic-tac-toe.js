const X_CLASS = 'x'
const CIRCLE_CLASS = 'circle'
const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
]
const cellElements = document.querySelectorAll('[data-cell]')
const board = document.getElementById('board')
const winningMessageElement = document.getElementById('winningMessage')
const restartButton = document.getElementById('restartButton')
const winningMessageTextElement = document.querySelector('[data-winning-message-text]')
const generateRoomBtn = document.querySelector('.btn');
const userName = document.querySelector('#user-name');
const roomId = document.querySelector('#room-name');
const userList = document.getElementById('users');
const enterGame = document.querySelector("#enter-game");
let circleTurn; 
const socket = io();
 console.log(socket); 

socket.on('winner', winner => {
  console.log(winner);
  winningMessageTextElement.innerHTML = winner;
  winningMessageElement.classList.add('show');
});

socket.emit('restartGame', () => {
 console.log('game restarted')
})

socket.on('cell', ({currentCellIndex, currentClass})=> {   
  console.log(currentCellIndex, currentClass, "From on Cell socket"); 
  cellElements[currentCellIndex].classList.add(currentClass);
});

startGame()
 

restartButton.addEventListener('click', startGame)
generateRoomBtn.addEventListener('click', () => {
  roomId.value = `${new Date().getMilliseconds()}`;
});

roomId.addEventListener('click', () => {
    roomId.select();
    document.execCommand('copy');    
});

enterGame.addEventListener('click', () => { 
  socket.emit('joinGame', { userName: userName.value, roomId: roomId.value}); 
  
  // Get room and users
 socket.on('roomUsers', ({ room, users }) => {
  console.log(room, users, "from tic tac toe.js");
  outputUsers(users);
 });
  socket.on('message', game => {
    console.log(`${game} created`);
  });
 
});
 

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = `
    ${users.map(user => `<li>${user.username}</li>`).join('')}
  `;
}

function startGame() {
  circleTurn = false
  cellElements.forEach(cell => {
    cell.classList.remove(X_CLASS)
    cell.classList.remove(CIRCLE_CLASS)
    cell.removeEventListener('click', handleClick)
    cell.addEventListener('click', handleClick, { once: true })
  })
  setBoardHoverClass()
  winningMessageElement.classList.remove('show')
}

function handleClick(e, index) {  
  console.log(index, "Index of Element");
  const cell = e.target   
  const currentCellIndex = Array.from(cellElements).indexOf(cell);
  const currentClass = circleTurn ? CIRCLE_CLASS : X_CLASS 
   // Emit message to server
   placeMark(cell, currentClass)
   socket.emit('userPick', ({currentCellIndex: currentCellIndex, currentClass: currentClass}));
  if (checkWin(currentClass)) {
    endGame(false)
  } else if (isDraw()) {
    endGame(true)
  } else {
    swapTurns()
    setBoardHoverClass()
  }
}

function endGame(draw) {
  if (draw) {
    winningMessageTextElement.innerText = 'Draw!';
    socket.emit('endGame', winningMessageTextElement.innerText);
  } else {
    winningMessageTextElement.innerText = `${circleTurn ? "O's" : "X's"} Wins!`;
    socket.emit('endGame', winningMessageTextElement.innerText); 
  }
  winningMessageElement.classList.add('show');
}

function isDraw() {
  return [...cellElements].every(cell => {
    return cell.classList.contains(X_CLASS) || cell.classList.contains(CIRCLE_CLASS)
  })
}

function placeMark(cell, currentClass) { 
  cell.classList.add(currentClass)
}

function swapTurns() {
  circleTurn = !circleTurn
}

function setBoardHoverClass() {
  board.classList.remove(X_CLASS)
  board.classList.remove(CIRCLE_CLASS)
  if (circleTurn) {
    board.classList.add(CIRCLE_CLASS)
  } else {
    board.classList.add(X_CLASS)
  }
}

function checkWin(currentClass) {
  return WINNING_COMBINATIONS.some(combination => {
    return combination.every(index => {
      return cellElements[index].classList.contains(currentClass)
    })
  })
}