export const isAnswerSaidCorrectly = (question, answer) => {  
    console.log(question.length, answer.length + 1);
    if(question.toLowerCase().includes(answer.toLowerCase()) && answer.length + 1 == question.length) {  
      return true;
    } 
}