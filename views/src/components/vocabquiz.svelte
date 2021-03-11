<script>

</script>
<div class="container">
  <div id="question-container" class="hide">
    <div id="question">Question</div>
    <div id="answer-buttons" class="btn-grid">
      <button class="btn">Answer 1</button>
      <button class="btn">Answer 2</button>
      <button class="btn">Answer 3</button>
      <button class="btn">Answer 4</button>
    </div>
  </div>
  <div class="controls">
    <button id="start-btn" class="start-btn btn">Start</button>
    <button id="next-btn" class="next-btn btn hide">Next</button>
  </div>
</div>
<style>
*, *::before, *::after {
  box-sizing: border-box;
  font-family: monospace;
}

:root {
  --hue-neutral: 200;
  --hue-wrong: 0;
  --hue-correct: 145;
}

.container {
  width: 800px;
  max-width: 80%;
  background-color: white;
  border-radius: 5px;
  padding: 10px;
  box-shadow: 0 0 10px 2px;
}

.btn-grid {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 10px;
  margin: 20px 0;
}

.btn {
  --hue: var(--hue-neutral);
  border: 1px solid hsl(var(--hue), 100%, 30%);
  background-color: hsl(var(--hue), 100%, 50%);
  border-radius: 5px;
  padding: 5px 10px;
  color: white;
  outline: none;
}

.btn:hover {
  border-color: black;
}

.start-btn, .next-btn {
  font-size: 1.5rem;
  font-weight: bold;
  padding: 10px 20px;
}

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hide {
  display: none;
}

</style>