const technologySelection = document.getElementById('technologySelection');
const quizCard = document.getElementById('quizCard');
const questionCount = document.getElementById('questionCount');
const quizDuration = document.getElementById('quizDuration');

let quizData = [];
let selectedTechnology = '';

const state = {
  currentQuestionIndex: 0,
  answers: []
};
document.querySelectorAll('.technology-card').forEach((button) => {

  button.addEventListener('click', () => {

    selectedTechnology = button.dataset.tech;

    quizData = window.quizData[selectedTechnology];

    if (!quizData || quizData.length === 0) {
      alert('Questions are not available for this technology.');
      return;
    }

    state.currentQuestionIndex = 0;
    state.answers = new Array(quizData.length).fill(null);

    technologySelection.classList.add('hidden');
    quizCard.classList.remove('hidden');

    questionCount.textContent = quizData.length;
    quizDuration.textContent = `${quizData.length} min`;

    renderQuestion();
  });

});


const state = {
  selectedTechnology: null,
  currentQuestionIndex: 0,
  answers: [],
  questions: []
};


// -------------------------------
// HTML ELEMENTS
// -------------------------------

const technologySelection =
  document.getElementById("technologySelection");

const quizSection =
  document.getElementById("quizSection");

const resultsPanel =
  document.getElementById("resultsPanel");

const questionTitle =
  document.getElementById("questionTitle");

const questionConcept =
  document.getElementById("questionConcept");

const choicesContainer =
  document.getElementById("choices");

const quizProgressLabel =
  document.getElementById("quizProgressLabel");

const quizProgressBar =
  document.getElementById("quizProgressBar");

const prevButton =
  document.getElementById("prevButton");

const nextButton =
  document.getElementById("nextButton");

const resetQuiz =
  document.getElementById("resetQuiz");

const selectedTechnology =
  document.getElementById("selectedTechnology");

const resultTechnology =
  document.getElementById("resultTechnology");

const finalScore =
  document.getElementById("finalScore");

const finalPercentage =
  document.getElementById("finalPercentage");

const recommendedPath =
  document.getElementById("recommendedPath");

const recommendationText =
  document.getElementById("recommendationText");

const recommendedResources =
  document.getElementById("recommendedResources");

const backToTechnologies =
  document.getElementById("backToTechnologies");

const takeAnotherQuiz =
  document.getElementById("takeAnotherQuiz");


// -------------------------------
// TECHNOLOGY NAMES
// -------------------------------

const technologyNames = {

  c: "C",

  cpp: "C++",

  java: "Java",

  python: "Python",

  sql: "SQL",

  html: "HTML",

  css: "CSS",

  javascript: "JavaScript",

  node: "Node.js"

};


// -------------------------------
// SELECT TECHNOLOGY
// -------------------------------

document.querySelectorAll(".technology-card")
  .forEach((card) => {

    card.addEventListener("click", () => {

      const technology =
        card.dataset.tech;

      startQuiz(technology);

    });

  });


// -------------------------------
// START QUIZ
// -------------------------------

function startQuiz(technology) {

  state.selectedTechnology = technology;

  state.currentQuestionIndex = 0;

  state.questions =
    window.quizData[technology];

  if (!state.questions ||
    state.questions.length === 0) {

    alert(
      "Questions for this technology are not available."
    );

    return;
  }


  state.answers =
    new Array(state.questions.length)
      .fill(null);


  selectedTechnology.textContent =
    technologyNames[technology];


  technologySelection
    .classList.add("hidden");

  resultsPanel
    .classList.add("hidden");

  quizSection
    .classList.remove("hidden");


  renderQuestion();
}


// -------------------------------
// RENDER QUESTION
// -------------------------------

function renderQuestion() {

  const currentIndex =
    state.currentQuestionIndex;

  const question =
    state.questions[currentIndex];


  questionTitle.textContent =
    question.question;


  questionConcept.textContent =
    `Concept: ${question.concept}`;


  quizProgressLabel.textContent =
    `Question ${currentIndex + 1} of ${state.questions.length}`;


  quizProgressBar.style.width =
    `${((currentIndex + 1) /
      state.questions.length) * 100}%`;


  choicesContainer.innerHTML = "";


  question.options.forEach(
    (option, index) => {

      const choiceElement =
        document.createElement("label");

      choiceElement.className =
        "choice";


      const radioInput =
        document.createElement("input");

      radioInput.type = "radio";

      radioInput.name =
        "quizChoice";

      radioInput.value =
        index;


      radioInput.checked =
        state.answers[currentIndex] ===
        index;


      radioInput.addEventListener(
        "change",
        () => {

          state.answers[currentIndex] =
            index;

        }
      );


      const optionText =
        document.createElement("span");

      optionText.textContent =
        option;


      choiceElement.appendChild(
        radioInput
      );

      choiceElement.appendChild(
        optionText
      );


      choicesContainer.appendChild(
        choiceElement
      );

    }
  );


  prevButton.disabled =
    currentIndex === 0;


  nextButton.textContent =
    currentIndex ===
      state.questions.length - 1
      ? "Finish"
      : "Next";
}


// -------------------------------
// CALCULATE SCORE
// -------------------------------

function calculateResults() {

  let score = 0;


  state.answers.forEach(
    (selectedAnswer, index) => {

      if (
        selectedAnswer !== null &&
        state.questions[index]
          .options[selectedAnswer] ===
        state.questions[index].answer
      ) {

        score++;

      }

    }
  );


  const percentage =
    Math.round(
      (score / state.questions.length) *
      100
    );


  return {
    score,
    percentage
  };
}


// -------------------------------
// CONCEPT ANALYSIS
// -------------------------------

function analyzeConcepts() {

  const conceptStats = {};


  state.questions.forEach(
    (question, index) => {

      const concept =
        question.concept;


      if (!conceptStats[concept]) {

        conceptStats[concept] = {
          total: 0,
          correct: 0
        };

      }


      conceptStats[concept].total++;


      const selected =
        state.answers[index];


      if (
        selected !== null &&
        question.options[selected] ===
        question.answer
      ) {

        conceptStats[concept].correct++;

      }

    }
  );


  return conceptStats;
}


// -------------------------------
// LOCAL RECOMMENDATION
// -------------------------------

function generateRecommendation(results) {

  const technology =
    state.selectedTechnology;


  let path;
  let summary;
  let nextSkill;
  let resources;


  if (results.percentage >= 80) {

    path =
      `${technologyNames[technology]} Advanced Path`;

    summary =
      `You have a strong foundation in ${technologyNames[technology]}. Cognify recommends moving toward advanced concepts and practical projects.`;

    nextSkill =
      getNextSkill(technology);

    resources =
      getAdvancedResources(technology);

  }

  else if (results.percentage >= 50) {

    path =
      `${technologyNames[technology]} Intermediate Path`;

    summary =
      `You have a reasonable understanding of ${technologyNames[technology]}, but some fundamentals need strengthening before moving to advanced topics.`;

    nextSkill =
      getIntermediateSkill(technology);

    resources =
      getIntermediateResources(technology);

  }

  else {

    path =
      `${technologyNames[technology]} Fundamentals`;

    summary =
      `Your assessment shows that you should strengthen the fundamental concepts of ${technologyNames[technology]} before moving to advanced topics.`;

    nextSkill =
      getFundamentalSkill(technology);

    resources =
      getFundamentalResources(technology);

  }


  return {
    path,
    summary,
    nextSkill,
    resources
  };
}


// -------------------------------
// NEXT SKILLS
// -------------------------------

function getNextSkill(technology) {

  const skills = {

    c: "Data Structures and Algorithms",

    cpp: "Advanced STL and DSA",

    java: "Advanced OOP and Collections",

    python: "Advanced Python and OOP",

    sql: "Query Optimization and Database Design",

    html: "Semantic HTML and Accessibility",

    css: "Advanced CSS and Responsive Design",

    javascript: "Advanced JavaScript and Async Programming",

    node: "Express.js and Backend Architecture"

  };


  return skills[technology];
}


function getIntermediateSkill(technology) {

  const skills = {

    c: "Pointers and Arrays",

    cpp: "OOP and STL",

    java: "Collections and Exception Handling",

    python: "Functions, Collections and OOP",

    sql: "Joins and Subqueries",

    html: "Forms and Semantic Elements",

    css: "Flexbox and Grid",

    javascript: "DOM and ES6",

    node: "Node.js Modules and Express Basics"

  };


  return skills[technology];
}


function getFundamentalSkill(technology) {

  const skills = {

    c: "Variables, Loops and Functions",

    cpp: "C++ Syntax and OOP Fundamentals",

    java: "Java Syntax and OOP Fundamentals",

    python: "Python Syntax and Data Types",

    sql: "SQL Syntax and Basic Queries",

    html: "HTML Elements and Document Structure",

    css: "CSS Selectors and Box Model",

    javascript: "JavaScript Variables, Functions and Arrays",

    node: "Node.js Runtime and Modules"

  };


  return skills[technology];
}


// -------------------------------
// RESOURCES
// -------------------------------

function getAdvancedResources(technology) {

  const resources = {

    c: [
      "Advanced C Programming",
      "Data Structures and Algorithms",
      "Memory Management in C"
    ],

    cpp: [
      "Advanced C++ STL",
      "Modern C++",
      "Competitive Programming"
    ],

    java: [
      "Advanced Java Collections",
      "Multithreading",
      "Spring Boot"
    ],

    python: [
      "Advanced Python",
      "Python OOP",
      "FastAPI / Django"
    ],

    sql: [
      "Query Optimization",
      "Database Indexing",
      "Advanced SQL"
    ],

    html: [
      "Web Accessibility",
      "Semantic HTML",
      "Web Performance"
    ],

    css: [
      "Advanced CSS",
      "Responsive Design",
      "CSS Architecture"
    ],

    javascript: [
      "Advanced JavaScript",
      "Async/Await",
      "JavaScript Design Patterns"
    ],

    node: [
      "Express.js",
      "REST APIs",
      "Node.js Backend Architecture"
    ]

  };


  return resources[technology];
}


function getIntermediateResources(technology) {

  return [
    `${technologyNames[technology]} Intermediate Concepts`,
    `${technologyNames[technology]} Practice Problems`,
    `${technologyNames[technology]} Mini Project`
  ];

}


function getFundamentalResources(technology) {

  return [
    `${technologyNames[technology]} Fundamentals`,
    `${technologyNames[technology]} Basic Practice`,
    `${technologyNames[technology]} Beginner Project`
  ];

}


// -------------------------------
// COMPLETE QUIZ
// -------------------------------

function completeQuiz() {

  const allAnswered =
    state.answers.every(
      answer => answer !== null
    );


  if (!allAnswered) {

    alert(
      "Please answer all questions before finishing the quiz."
    );

    return;

  }


  const results =
    calculateResults();


  const recommendation =
    generateRecommendation(results);


  renderRecommendation(
    recommendation,
    results
  );
}


// -------------------------------
// SHOW RESULT
// -------------------------------

function renderRecommendation(
  recommendation,
  results
) {

  finalScore.textContent =
    `${results.score}/${state.questions.length}`;


  finalPercentage.textContent =
    `${results.percentage}%`;


  recommendedPath.textContent =
    recommendation.path;


  recommendationText.textContent =
    `${recommendation.summary} Your next recommended skill is ${recommendation.nextSkill}.`;


  resultTechnology.textContent =
    `${technologyNames[state.selectedTechnology]} Assessment`;


  recommendedResources.innerHTML = "";


  recommendation.resources.forEach(
    resource => {

      const li =
        document.createElement("li");

      li.textContent =
        resource;

      recommendedResources.appendChild(li);

    }
  );


  // Save result for dashboard
  const resultData = {

    technology:
      state.selectedTechnology,

    technologyName:
      technologyNames[state.selectedTechnology],

    score:
      results.score,

    percentage:
      results.percentage,

    total:
      state.questions.length,

    conceptStats:
      analyzeConcepts(),

    recommendation:
      recommendation,

    answers:
      state.answers,

    timestamp:
      new Date().toISOString()

  };


  localStorage.setItem(
    "cognifyRecommendation",
    JSON.stringify(resultData)
  );


  quizSection.classList.add("hidden");

  resultsPanel.classList.remove("hidden");
}


// -------------------------------
// NEXT BUTTON
// -------------------------------

nextButton.addEventListener(
  "click",
  () => {

    if (
      state.currentQuestionIndex ===
      state.questions.length - 1
    ) {

      completeQuiz();

      return;

    }


    state.currentQuestionIndex++;

    renderQuestion();

  }
);


// -------------------------------
// PREVIOUS BUTTON
// -------------------------------

prevButton.addEventListener(
  "click",
  () => {

    if (
      state.currentQuestionIndex === 0
    ) {

      return;

    }


    state.currentQuestionIndex--;

    renderQuestion();

  }
);


// -------------------------------
// RESTART CURRENT QUIZ
// -------------------------------

resetQuiz.addEventListener(
  "click",
  () => {

    state.currentQuestionIndex = 0;

    state.answers =
      new Array(
        state.questions.length
      ).fill(null);


    resultsPanel
      .classList.add("hidden");


    quizSection
      .classList.remove("hidden");


    renderQuestion();

  }
);


// -------------------------------
// CHANGE TECHNOLOGY
// -------------------------------

backToTechnologies.addEventListener(
  "click",
  () => {

    quizSection.classList.add("hidden");

    resultsPanel.classList.add("hidden");

    technologySelection.classList.remove("hidden");

  }
);


// -------------------------------
// TAKE ANOTHER QUIZ
// -------------------------------

takeAnotherQuiz.addEventListener(
  "click",
  () => {

    resultsPanel.classList.add("hidden");

    technologySelection.classList.remove("hidden");

  }
);