<script>
  	import { Router, Link, Route } from "svelte-routing";
</script>
<h1>Real Time Games</h1>  
<ul class="cards">
  <li class="cards_item">
    <div class="card">
      <div class="card_image"><img src="https://picsum.photos/500/300/?image=10" alt="Tic Tac Toe" loading="lazy"></div>
      <div class="card_content">
        <h2 class="card_title">Tic Tac Toe</h2>
        <p class="card_text">Demo of pixel perfect pure CSS simple responsive card grid layout</p>
        <button class="btn card_btn"><Link to="/tic-tac-toe">Play now</Link></button>
      </div>
    </div>
  </li>
  <li class="cards_item">
    <div class="card">
      <div class="card_image"><img src="https://picsum.photos/500/300/?image=5" alt="battle ship" loading="lazy"></div>
      <div class="card_content">
        <h2 class="card_title">Battle Ship</h2>
        <p class="card_text">Demo of pixel perfect pure CSS simple responsive card grid layout</p>
        <button class="btn card_btn"><Link to="/vocab-quiz">Play now </Link></button>
      </div>
    </div>
  </li>
  <li class="cards_item">
    <div class="card">
      <div class="card_image"><img src="https://picsum.photos/500/300/?image=11" alt="Hang Man" loading="lazy"></div>
      <div class="card_content">
        <h2 class="card_title">Hang Man</h2>
        <p class="card_text">Demo of pixel perfect pure CSS simple responsive card grid layout</p>
        <button class="btn card_btn">Play now</button>
      </div>
    </div>
  </li>
  <li class="cards_item">
    <div class="card">
      <div class="card_image"><img src="https://picsum.photos/500/300/?image=14" alt="Vocabluarly Quiz" loading="lazy"></div>
      <div class="card_content">
        <h2 class="card_title">Vocabulary Quiz</h2>
        <p class="card_text">Demo of pixel perfect pure CSS simple responsive card grid layout</p>
        <button class="btn card_btn">Play now</button>
      </div>
    </div>
  </li>
  <li class="cards_item">
    <div class="card">
      <div class="card_image"><img src="https://picsum.photos/500/300/?image=17" alt="Space invadors" loading="lazy"></div>
      <div class="card_content">
        <h2 class="card_title">Space Invadors</h2>
        <p class="card_text">Demo of pixel perfect pure CSS simple responsive card grid layout</p>
        <button class="btn card_btn">Play now</button>
      </div>
    </div>
  </li>
  <li class="cards_item">
    <div class="card">
      <div class="card_image"><img src="https://picsum.photos/500/300/?image=2" alt="Something"loading="lazy" ></div>
      <div class="card_content">
        <h2 class="card_title">Card Grid Layout</h2>
        <p class="card_text">Demo of pixel perfect pure CSS simple responsive card grid layout</p>
        <button class="btn card_btn">Play now</button>
      </div>
    </div>
  </li>
</ul> 

<style>  
	h1 {
		color: #524a48;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100; 
	}
	/* Cards */

img {
  height: auto;
  max-width: 100%;
	vertical-align: middle;
}

.btn {
  color: #ffffff;
  padding: 0.8rem;
  font-size: 14px;
  text-transform: uppercase;
  border-radius: 4px;
  font-weight: 400;
  display: block;
  width: 100%;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
}

.btn:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

.cards {
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
}

.cards_item {
  display: flex;
  padding: 1rem;
}

@media (min-width: 40rem) {
  .cards_item {
    width: 50%;
  }
}

@media (min-width: 56rem) {
  .cards_item {
    width: 30%;
  }
}

.card {
  background-color: white;
  border-radius: 0.25rem;
  box-shadow: 0 20px 40px -14px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card_content {
  padding: 1rem;
  background: #1f1f1f;
}

.card_title {
  color: wheat;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 3px;
  text-transform: capitalize;
  margin: 0px;
}

.card_text {
  color: #ffffff;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1.25rem;    
  font-weight: 400;
}
 
</style>