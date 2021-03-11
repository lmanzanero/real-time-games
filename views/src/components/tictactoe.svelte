<script>
 
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
//  socket.on('roomUsers', ({ room, users }) => {
//   console.log(room, users, "from tic tac toe.js");
//   // outputUsers(users);
//  });
  // socket.on('message', game => {
  //   console.log(`${game} created`);
  // });
 
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
</script>  

<div class="container"> 
  <button class="btn">Generate Room</button>
  <input id="user-name"/>
  <input id="room-name"/>
  <button class="btn" id="enter-game">Enter Game</button>
  <ul id="users"></ul>
</div>
<div class="board" id="board">
  <div class="cell" data-cell></div>
  <div class="cell" data-cell></div>
  <div class="cell" data-cell></div>
  <div class="cell" data-cell></div>
  <div class="cell" data-cell></div>
  <div class="cell" data-cell></div>
  <div class="cell" data-cell></div>
  <div class="cell" data-cell></div>
  <div class="cell" data-cell></div>
</div>
<div class="winning-message" id="winningMessage">
  <div data-winning-message-text></div>
  <button id="restartButton">Restart</button>
</div>

<style>
*, *::after, *::before {
  box-sizing: border-box;
}

:root {
  --cell-size: 100px;
  --mark-size: calc(var(--cell-size) * .9);
}

.container {
  justify-content: center;
  align-content: center;
  align-items: center;
}

.container .btn {
  width: 200px;
  height: 40px;
  color: linear-gradient(#2A5470, #4C4177);
  background-color: grey;
} 

.board {
  width: 100vw;
  height: 100vh;
  display: grid;
  justify-content: center;
  align-content: center;
  justify-items: center;
  align-items: center;
  grid-template-columns: repeat(3, auto)
}

.cell {
  width: var(--cell-size);
  height: var(--cell-size);
  border: 1px solid black;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  cursor: pointer;
}

.cell:first-child,
.cell:nth-child(2),
.cell:nth-child(3) {
  border-top: none;
}

.cell:nth-child(3n + 1) {
  border-left: none;
}

.cell:nth-child(3n + 3) {
  border-right: none;
}

.cell:last-child,
.cell:nth-child(8),
.cell:nth-child(7) {
  border-bottom: none;
}

.cell.x,
.cell.circle {
  cursor: not-allowed;
}

.cell.x::before,
.cell.x::after,
.cell.circle::before {
  background-color: black;
}

.board.x .cell:not(.x):not(.circle):hover::before,
.board.x .cell:not(.x):not(.circle):hover::after,
.board.circle .cell:not(.x):not(.circle):hover::before {
  background-color: plum;
}

.cell.x::before,
.cell.x::after,
.board.x .cell:not(.x):not(.circle):hover::before,
.board.x .cell:not(.x):not(.circle):hover::after {
  content: '';
  position: absolute;
  width: calc(var(--mark-size) * .15);
  height: var(--mark-size);
}

.cell.x::before,
.board.x .cell:not(.x):not(.circle):hover::before {
  transform: rotate(45deg);
}

.cell.x::after,
.board.x .cell:not(.x):not(.circle):hover::after {
  transform: rotate(-45deg);
}

.cell.circle::before,
.cell.circle::after,
.board.circle .cell:not(.x):not(.circle):hover::before,
.board.circle .cell:not(.x):not(.circle):hover::after {
  content: '';
  position: absolute;
  border-radius: 50%;
}

.cell.circle::before,
.board.circle .cell:not(.x):not(.circle):hover::before {
  width: var(--mark-size);
  height: var(--mark-size);
}

.cell.circle::after,
.board.circle .cell:not(.x):not(.circle):hover::after {
  width: calc(var(--mark-size) * .7);
  height: calc(var(--mark-size) * .7);
  background: linear-gradient(#2A5470, #4C4177);
}

.winning-message {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, .9);
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 5rem;
  flex-direction: column;
}

.winning-message button {
  font-size: 3rem;
  background-color: white;
  border: 1px solid black;
  padding: .25em .5em;
  cursor: pointer;
}

.winning-message button:hover {
  background-color: black;
  color: white;
  border-color: white;
}

.winning-message.show {
  display: flex;
}
</style>