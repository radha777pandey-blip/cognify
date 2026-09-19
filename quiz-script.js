// Cognify Phase 3 - Adaptive Skill Evaluation Client Script

const DEFAULT_TIMER_SECONDS = 30;

// State
let currentAssessmentId = null;
let currentSkill = null;
let currentQuestion = null;
let selectedOptionKey = null;
let timerSecondsRemaining = DEFAULT_TIMER_SECONDS;
let timerInterval = null;
let questionStartTime = null;
let gatekeeperFailureData = null;
let isSubmitting = false;

// DOM Elements
const skillStage = document.getElementById('skill-stage');
const questionStage = document.getElementById('question-stage');
const gatekeeperStopStage = document.getElementById('gatekeeper-stop-stage');
const summaryStage = document.getElementById('summary-stage');

// Theme & User Profile Elements
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const themeLabel = document.getElementById('themeLabel');
const userProfileBadge = document.getElementById('userProfileBadge');
const userNavName = document.getElementById('userNavName');
const userAvatar = document.getElementById('userAvatar');
const toastContainer = document.getElementById('cognify-toast-container');

const skillsGrid = document.getElementById('skills-grid');
const startAssessmentBtn = document.getElementById('start-assessment-btn');

const activeSkillBadge = document.getElementById('active-skill-badge');
const stageBadge = document.getElementById('stage-badge');
const questionCounter = document.getElementById('question-counter');
const timerDisplay = document.getElementById('timer-display');
const timerBar = document.getElementById('timer-bar');
const timerBox = document.getElementById('timer-box');
const quizProgressFill = document.getElementById('quiz-progress-fill');

const questionText = document.getElementById('question-text');
const optionsGrid = document.getElementById('options-grid');
const feedbackPanel = document.getElementById('feedback-panel');
const feedbackAlert = document.getElementById('feedback-alert');
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackExplanation = document.getElementById('feedback-explanation');

const submitAnswerBtn = document.getElementById('submit-answer-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const nextBtnText = document.getElementById('next-btn-text');

// Gatekeeper Stop Card Elements
const gatekeeperScoreVal = document.getElementById('gatekeeper-score-val');
const gatekeeperConceptTag = document.getElementById('gatekeeper-concept-tag');
const gatekeeperQuestionPrompt = document.getElementById('gatekeeper-question-prompt');
const gatekeeperUserAns = document.getElementById('gatekeeper-user-ans');
const gatekeeperCorrectAns = document.getElementById('gatekeeper-correct-ans');
const gatekeeperExplanationText = document.getElementById('gatekeeper-explanation-text');
const gatekeeperAiRecommendation = document.getElementById('gatekeeper-ai-recommendation');
const gatekeeperRetryBtn = document.getElementById('gatekeeper-retry-btn');
const gatekeeperSkillsBtn = document.getElementById('gatekeeper-skills-btn');

// Summary Elements (Phase 4)
const summarySkillName = document.getElementById('summary-skill-name');
const summaryOverallSkillLevel = document.getElementById('summary-overall-skill-level');
const summaryAccuracyVal = document.getElementById('summary-accuracy-val');
const summaryScoreVal = document.getElementById('summary-score-val');
const summaryCorrectVal = document.getElementById('summary-correct-val');
const summaryIncorrectVal = document.getElementById('summary-incorrect-val');
const summaryTotalQuestionsVal = document.getElementById('summary-total-questions-val');
const highestDiffTag = document.getElementById('highest-diff-tag');
const conceptAnalysisContainer = document.getElementById('concept-analysis-container');

// AI Recommendation Elements (Phase 4)
const recSummaryText = document.getElementById('rec-summary-text');
const recStartingPointText = document.getElementById('rec-starting-point-text');
const recStrengthsList = document.getElementById('rec-strengths-list');
const recWeaknessesList = document.getElementById('rec-weaknesses-list');
const recNextTopicsList = document.getElementById('rec-next-topics-list');
const recPracticeList = document.getElementById('rec-practice-list');

const summaryReviewList = document.getElementById('summary-review-list');
const retakeAssessmentBtn = document.getElementById('retake-assessment-btn');
const signOutLink = document.getElementById('signOutLink');

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  setupTheme();
  setupUserProfile();
  setupSignOut();
  setupGatekeeperButtons();

  // Check if there is an active assessment to restore (reload resilience)
  const urlParams = new URLSearchParams(window.location.search);
  const paramAssessmentId = urlParams.get('assessment_id');
  const sessionAssessmentId = sessionStorage.getItem('cognify_assessment_id');
  const targetAssessmentId = paramAssessmentId || sessionAssessmentId;

  if (targetAssessmentId) {
    const restored = await restoreAssessmentState(targetAssessmentId);
    if (restored) return;
  }

  // Otherwise, load skill selection screen
  await loadSkills();
});

// ---------------- THEME TOGGLE (Dark / Light) ----------------
function setupTheme() {
  const savedTheme = localStorage.getItem('cognify_theme') || 'dark';
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('cognify_theme', theme);
  if (themeIcon && themeLabel) {
    if (theme === 'light') {
      themeIcon.className = 'fas fa-sun';
      themeLabel.textContent = 'Light';
    } else {
      themeIcon.className = 'fas fa-moon';
      themeLabel.textContent = 'Dark';
    }
  }
}

// ---------------- USER PROFILING (Unique User Data) ----------------
function setupUserProfile() {
  const userJson = localStorage.getItem('cognifyUser');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user && user.name) {
        if (userNavName) userNavName.textContent = user.name;
        if (userAvatar) userAvatar.textContent = user.name.charAt(0).toUpperCase();
        return;
      }
    } catch (e) {
      console.error('Error reading cognifyUser:', e);
    }
  }
  if (userNavName) userNavName.textContent = 'Learner';
  if (userAvatar) userAvatar.textContent = 'L';
}

function getLoggedInUserId() {
  const userJson = localStorage.getItem('cognifyUser');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      return user?.id || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// ---------------- TOAST NOTIFICATION SYSTEM ----------------
function showToast(type, title, message, actionBtn = null) {
  const container = document.getElementById('cognify-toast-container');
  if (!container) {
    console.warn(`[Toast ${type}] ${title}: ${message}`);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `cognify-toast toast-${type}`;

  const iconClass = type === 'success' ? 'fa-circle-check' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation');

  toast.innerHTML = `
    <i class="fas ${iconClass} toast-icon"></i>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-desc">${escapeHtml(message)}</div>
    </div>
  `;

  if (actionBtn && actionBtn.text && actionBtn.onClick) {
    const btn = document.createElement('button');
    btn.className = 'toast-btn';
    btn.textContent = actionBtn.text;
    btn.addEventListener('click', () => {
      toast.remove();
      actionBtn.onClick();
    });
    toast.querySelector('.toast-content').appendChild(btn);
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 320);
  }, 5000);
}

function setupSignOut() {
  if (signOutLink) {
    signOutLink.addEventListener('click', () => {
      localStorage.removeItem('cognifyUser');
      sessionStorage.removeItem('cognify_assessment_id');
    });
  }
}

function setupGatekeeperButtons() {
  if (gatekeeperRetryBtn) {
    gatekeeperRetryBtn.addEventListener('click', async () => {
      sessionStorage.removeItem('cognify_assessment_id');
      window.history.replaceState(null, '', window.location.pathname);
      currentAssessmentId = null;
      gatekeeperFailureData = null;
      if (currentSkill) {
        await startNewAssessment(currentSkill);
      } else {
        await loadSkills();
      }
    });
  }

  if (gatekeeperSkillsBtn) {
    gatekeeperSkillsBtn.addEventListener('click', () => {
      sessionStorage.removeItem('cognify_assessment_id');
      window.history.replaceState(null, '', window.location.pathname);
      currentAssessmentId = null;
      gatekeeperFailureData = null;
      loadSkills();
    });
  }
}

// ==================== STAGE 1: SKILL SELECTION ====================

async function loadSkills() {
  showStage('skill');
  skillsGrid.innerHTML = `<div class="skill-loading"><i class="fas fa-circle-notch fa-spin"></i> Loading skills...</div>`;

  try {
    const response = await fetch('/api/skills');
    const data = await response.json();

    if (!data.success || !data.skills || data.skills.length === 0) {
      skillsGrid.innerHTML = `<p>No skills available. Please try again later.</p>`;
      return;
    }

    skillsGrid.innerHTML = '';
    let defaultSelected = false;

    data.skills.forEach((skill) => {
      const card = document.createElement('div');
      card.className = 'skill-select-card';
      card.dataset.skill = skill.id;
      card.dataset.category = skill.category || 'General';

      card.innerHTML = `
        <div class="skill-card-top">
          <div class="skill-card-icon"><i class="${skill.icon}"></i></div>
          ${skill.badge ? `<span class="skill-card-badge">${skill.badge}</span>` : ''}
        </div>
        <div class="skill-card-name">${escapeHtml(skill.name)}</div>
        <div class="skill-card-desc">${escapeHtml(skill.description)}</div>
        <div class="skill-card-meta">
          <i class="fas fa-shield-halved"></i> 3-Q Gatekeeper + Adaptive
        </div>
      `;

      card.addEventListener('click', () => {
        selectSkill(skill.id, card);
      });

      skillsGrid.appendChild(card);

      if (skill.id === 'Python' && !defaultSelected) {
        selectSkill(skill.id, card);
        defaultSelected = true;
      }
    });

    setupCategoryFilters();

    if (!defaultSelected && data.skills.length > 0) {
      selectSkill(data.skills[0].id, skillsGrid.children[0]);
    }
  } catch (error) {
    console.error('Failed to load skills:', error);
    skillsGrid.innerHTML = `<p>Failed to connect to server. Please ensure the backend is running.</p>`;
  }
}

function setupCategoryFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach((btn) => {
    btn.onclick = () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.category;
      const allCards = skillsGrid.querySelectorAll('.skill-select-card');
      allCards.forEach((card) => {
        if (cat === 'all' || card.dataset.category === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    };
  });
}

function selectSkill(skillId, cardElement) {
  currentSkill = skillId;
  const allCards = skillsGrid.querySelectorAll('.skill-select-card');
  allCards.forEach((c) => c.classList.remove('selected'));
  if (cardElement) {
    cardElement.classList.add('selected');
  }
  startAssessmentBtn.disabled = false;
}

startAssessmentBtn.addEventListener('click', async () => {
  if (!currentSkill) return;
  await startNewAssessment(currentSkill);
});

async function startNewAssessment(skillId) {
  startAssessmentBtn.disabled = true;
  startAssessmentBtn.innerHTML = `<span>Preparing Gatekeeper...</span> <i class="fas fa-circle-notch fa-spin"></i>`;

  try {
    let userId = null;
    const userJson = localStorage.getItem('cognifyUser');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        userId = user.id;
      } catch (e) {
        console.error('Error reading userId:', e);
      }
    }

    const response = await fetch('/api/assessment/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'x-user-id': String(userId) } : {}),
      },
      body: JSON.stringify({ skill: skillId, userId }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();
    if (!data.success) {
      showToast('error', 'Start Failed', data.message || 'Failed to start assessment.');
      startAssessmentBtn.disabled = false;
      startAssessmentBtn.innerHTML = `<span>Start Assessment</span> <i class="fas fa-arrow-right"></i>`;
      return;
    }

    currentAssessmentId = data.assessmentId;
    currentSkill = data.skill;
    gatekeeperFailureData = null;
    sessionStorage.setItem('cognify_assessment_id', currentAssessmentId);
    window.history.replaceState(null, '', `?assessment_id=${currentAssessmentId}`);

    displayQuestion(data.question, false, null);
  } catch (error) {
    console.error('Error starting assessment:', error);
    const msg = error.name === 'TimeoutError'
      ? 'Question generation timed out. Please click Start again.'
      : 'Server connection error while starting assessment. Please ensure backend is running.';
    showToast('error', 'Connection Interrupted', msg, {
      text: 'Retry Start',
      onClick: () => startNewAssessment(skillId),
    });
    startAssessmentBtn.disabled = false;
    startAssessmentBtn.innerHTML = `<span>Start Assessment</span> <i class="fas fa-arrow-right"></i>`;
  }
}

// ==================== STAGE 2: QUESTION & TIMER ====================

function displayQuestion(question, alreadyAnswered = false, answerFeedback = null) {
  currentQuestion = question;
  selectedOptionKey = null;
  gatekeeperFailureData = null;
  questionStartTime = Date.now();

  showStage('question');

  // Update headers and progress
  activeSkillBadge.textContent = currentSkill || 'Assessment';
  questionCounter.textContent = `Question ${question.questionNumber} of ${question.totalQuestions}`;

  // Update Stage Badge (Gatekeeper vs Adaptive)
  if (stageBadge) {
    const isAdaptive = question.stage === 'adaptive' || question.questionNumber > 3;
    if (isAdaptive) {
      stageBadge.className = 'meta-stage stage-adaptive';
      stageBadge.innerHTML = '<i class="fas fa-brain"></i> Adaptive Assessment';
    } else {
      stageBadge.className = 'meta-stage';
      stageBadge.innerHTML = '<i class="fas fa-shield-halved"></i> Gatekeeper Checkpoint';
    }
  }

  // Update Concept & Difficulty Badges
  const conceptBadge = document.getElementById('question-concept-badge');
  const conceptText = document.getElementById('concept-text');
  const diffBadge = document.getElementById('question-difficulty-badge');

  if (conceptBadge && conceptText) {
    if (question.concept) {
      conceptText.textContent = question.concept;
      conceptBadge.style.display = 'inline-flex';
    } else {
      conceptBadge.style.display = 'none';
    }
  }

  if (diffBadge) {
    const diff = (question.difficulty || 'basic').toLowerCase();
    diffBadge.className = `meta-difficulty difficulty-${diff}`;
    diffBadge.textContent = diff.toUpperCase();
  }

  const progressPercent = (question.questionNumber / question.totalQuestions) * 100;
  quizProgressFill.style.width = `${progressPercent}%`;

  // Render question text
  questionText.textContent = question.questionText;

  // Render options
  optionsGrid.innerHTML = '';
  const optionKeys = ['a', 'b', 'c', 'd'];

  optionKeys.forEach((key) => {
    if (!question.options[key]) return;

    const optCard = document.createElement('div');
    optCard.className = 'option-card';
    optCard.dataset.key = key;

    optCard.innerHTML = `
      <div class="option-letter">${key.toUpperCase()}</div>
      <div class="option-text">${escapeHtml(question.options[key])}</div>
      <div class="option-badge-icon"></div>
    `;

    if (!alreadyAnswered) {
      optCard.addEventListener('click', () => {
        if (optCard.classList.contains('disabled')) return;
        selectOption(key, optCard);
      });
    }

    optionsGrid.appendChild(optCard);
  });

  feedbackPanel.style.display = 'none';

  if (alreadyAnswered && answerFeedback) {
    stopTimer();
    renderFeedback(answerFeedback);
  } else {
    submitAnswerBtn.style.display = 'inline-flex';
    submitAnswerBtn.disabled = true;
    nextQuestionBtn.style.display = 'none';
    startTimer();
  }
}

function selectOption(key, card) {
  selectedOptionKey = key;
  const cards = optionsGrid.querySelectorAll('.option-card');
  cards.forEach((c) => c.classList.remove('selected'));
  card.classList.add('selected');
  submitAnswerBtn.disabled = false;
}

// ---------------- TIMER MECHANICS ----------------

function startTimer() {
  stopTimer();
  timerSecondsRemaining = DEFAULT_TIMER_SECONDS;
  updateTimerUI();

  timerInterval = setInterval(() => {
    timerSecondsRemaining--;
    updateTimerUI();

    if (timerSecondsRemaining <= 0) {
      stopTimer();
      handleTimerExpired();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerUI() {
  timerDisplay.textContent = `${timerSecondsRemaining}s`;

  const percent = Math.max(0, (timerSecondsRemaining / DEFAULT_TIMER_SECONDS) * 100);
  timerBar.style.width = `${percent}%`;

  timerBox.classList.remove('timer-warning', 'timer-danger');
  if (timerSecondsRemaining <= 5) {
    timerBox.classList.add('timer-danger');
  } else if (timerSecondsRemaining <= 10) {
    timerBox.classList.add('timer-warning');
  }
}

async function handleTimerExpired() {
  lockOptions();
  submitAnswerBtn.disabled = true;
  await submitAnswer(null, true);
}

// ---------------- SUBMIT ANSWER & FEEDBACK ----------------

submitAnswerBtn.addEventListener('click', async () => {
  if (!selectedOptionKey || !currentQuestion) return;
  stopTimer();
  lockOptions();
  submitAnswerBtn.disabled = true;

  const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);
  await submitAnswer(selectedOptionKey, false, timeTaken);
});

async function submitAnswer(optionKey, isTimeout = false, timeTaken = DEFAULT_TIMER_SECONDS) {
  if (isSubmitting) return;
  isSubmitting = true;

  try {
    const userId = getLoggedInUserId();
    const response = await fetch(`/api/assessment/${currentAssessmentId}/submit-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'x-user-id': String(userId) } : {}),
      },
      body: JSON.stringify({
        question_id: currentQuestion.id,
        selected_option: optionKey,
        time_taken_seconds: timeTaken,
        userId: userId,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      showToast('error', 'Submission Error', data.message || 'Failed to submit answer.');
      return;
    }

    // Gatekeeper Failure Check (Part A Requirement)
    if (data.gatekeeper_stopped || data.gatekeeper_failed) {
      gatekeeperFailureData = data;
      renderFeedback({
        selected_option: optionKey,
        is_correct: false,
        correct_option: data.correct_option,
        explanation: data.explanation,
        is_last_question: true,
        isTimeout,
        isGatekeeperFail: true,
      });
      return;
    }

    gatekeeperFailureData = null;
    renderFeedback({
      selected_option: optionKey,
      is_correct: data.is_correct,
      correct_option: data.correct_option,
      explanation: data.explanation,
      is_last_question: data.is_completed,
      isTimeout,
      gatekeeperPassed: data.gatekeeper_passed,
      adaptiveUnlocked: data.adaptive_unlocked,
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    showToast('error', 'Network Interrupted', 'Could not validate answer. Please check your connection.', {
      text: 'Retry Answer',
      onClick: () => submitAnswer(optionKey, isTimeout, timeTaken),
    });
  } finally {
    isSubmitting = false;
  }
}

function lockOptions() {
  const cards = optionsGrid.querySelectorAll('.option-card');
  cards.forEach((c) => c.classList.add('disabled'));
}

function renderFeedback(feedback) {
  lockOptions();
  submitAnswerBtn.style.display = 'none';
  nextQuestionBtn.style.display = 'inline-flex';

  if (feedback.isGatekeeperFail) {
    nextBtnText.textContent = 'View Gatekeeper Checkpoint Report';
  } else if (feedback.adaptiveUnlocked) {
    nextBtnText.textContent = 'Proceed to Adaptive Assessment 🚀';
  } else if (feedback.is_last_question) {
    nextBtnText.textContent = 'View Final Results';
  } else {
    nextBtnText.textContent = 'Next Question';
  }

  // Highlight options
  const cards = optionsGrid.querySelectorAll('.option-card');
  cards.forEach((card) => {
    const key = card.dataset.key;
    const badgeIcon = card.querySelector('.option-badge-icon');

    if (key === feedback.correct_option) {
      card.classList.add('correct');
      badgeIcon.innerHTML = `<i class="fas fa-check-circle"></i>`;
    }

    if (key === feedback.selected_option && !feedback.is_correct) {
      card.classList.add('incorrect');
      badgeIcon.innerHTML = `<i class="fas fa-times-circle"></i>`;
    }
  });

  // Feedback Alert Banner
  feedbackAlert.className = 'feedback-alert';
  if (feedback.isTimeout) {
    feedbackAlert.classList.add('alert-timeout');
    feedbackIcon.className = 'fas fa-stopwatch';
    feedbackTitle.textContent = 'Time Expired! The question was marked incorrect.';
  } else if (feedback.is_correct) {
    feedbackAlert.classList.add('alert-correct');
    feedbackIcon.className = 'fas fa-check-circle';
    feedbackTitle.textContent = 'Correct! Well done.';
  } else {
    feedbackAlert.classList.add('alert-incorrect');
    feedbackIcon.className = 'fas fa-times-circle';
    feedbackTitle.textContent = feedback.isGatekeeperFail
      ? 'Gatekeeper Checkpoint Not Cleared.'
      : 'Incorrect.';
  }

  feedbackExplanation.textContent = feedback.explanation || '';
  feedbackPanel.style.display = 'block';
}

// ---------------- NEXT QUESTION / TRANSITION ----------------

nextQuestionBtn.addEventListener('click', async () => {
  // If gatekeeper checkpoint failed, show report screen
  if (gatekeeperFailureData) {
    showGatekeeperStopScreen(gatekeeperFailureData);
    return;
  }

  nextQuestionBtn.disabled = true;
  nextQuestionBtn.innerHTML = `<span>Loading...</span> <i class="fas fa-circle-notch fa-spin"></i>`;

  try {
    const userId = getLoggedInUserId();
    const response = await fetch(`/api/assessment/${currentAssessmentId}/current`, {
      headers: {
        ...(userId ? { 'x-user-id': String(userId) } : {}),
      },
    });
    const data = await response.json();

    nextQuestionBtn.disabled = false;
    nextQuestionBtn.innerHTML = `<span id="next-btn-text">Next Question</span> <i class="fas fa-arrow-right"></i>`;

    if (!data.success) {
      showToast('error', 'Error', data.message || 'Failed to load next question.');
      return;
    }

    if (data.status === 'gatekeeper_failed') {
      await loadGatekeeperStopFromSummary(currentAssessmentId);
    } else if (data.status === 'completed') {
      await loadSummary(currentAssessmentId);
    } else {
      currentSkill = data.skill;
      displayQuestion(data.question, data.alreadyAnswered, data.answerFeedback);
    }
  } catch (error) {
    console.error('Error moving to next question:', error);
    showToast('error', 'Connection Error', 'Could not load next question. Please check connection.');
    nextQuestionBtn.disabled = false;
  }
});

// ==================== STAGE 2B: GATEKEEPER STOP CARD (Part A) ====================

function showGatekeeperStopScreen(data) {
  stopTimer();
  showStage('gatekeeper_stop');

  if (gatekeeperScoreVal) {
    gatekeeperScoreVal.textContent = `${data.score || 0} / 3`;
  }

  const missedQ = data.missed_question || {};
  const concept = data.concept_needing_improvement || missedQ.concept || 'Foundational Syntax';

  if (gatekeeperConceptTag) {
    gatekeeperConceptTag.textContent = `Concept: ${concept}`;
  }

  if (gatekeeperQuestionPrompt) {
    gatekeeperQuestionPrompt.textContent = missedQ.questionText || currentQuestion?.questionText || 'Foundational Question';
  }

  if (gatekeeperUserAns) {
    const userOpt = missedQ.userAnswer || selectedOptionKey;
    gatekeeperUserAns.textContent = userOpt ? userOpt.toUpperCase() : 'None (Time Expired)';
  }

  if (gatekeeperCorrectAns) {
    const correctOpt = missedQ.correctAnswer || data.correct_option;
    gatekeeperCorrectAns.textContent = correctOpt ? correctOpt.toUpperCase() : 'N/A';
  }

  if (gatekeeperExplanationText) {
    gatekeeperExplanationText.textContent = missedQ.explanation || data.explanation || 'Review fundamental syntax and rules.';
  }

  if (gatekeeperAiRecommendation) {
    gatekeeperAiRecommendation.textContent = data.starting_recommendation ||
      `Focus on reviewing basic ${currentSkill || 'core'} concepts, especially ${concept}. Complete practical coding drills before re-attempting the Gatekeeper checkpoint.`;
  }
}

async function loadGatekeeperStopFromSummary(assessmentId) {
  stopTimer();
  try {
    const userId = getLoggedInUserId();
    const response = await fetch(`/api/assessment/${assessmentId}/summary`, {
      headers: {
        ...(userId ? { 'x-user-id': String(userId) } : {}),
      },
    });
    const data = await response.json();
    if (data.success && data.summary) {
      const s = data.summary;
      const missed = (s.questionsReview || []).find((q) => !q.isCorrect) ||
        (s.questionsReview && s.questionsReview[s.questionsReview.length - 1]) || {};

      showGatekeeperStopScreen({
        score: s.score,
        concept_needing_improvement: missed.concept,
        missed_question: {
          questionText: missed.questionText,
          concept: missed.concept,
          difficulty: missed.difficulty,
          userAnswer: missed.selectedOption,
          correctAnswer: missed.correctOption,
          explanation: missed.explanation,
        },
        starting_recommendation: s.startingRecommendation,
      });
    } else {
      showGatekeeperStopScreen({ score: 0 });
    }
  } catch (err) {
    console.error('Error fetching gatekeeper summary:', err);
    showGatekeeperStopScreen({ score: 0 });
  }
}

// ==================== STAGE 3: SUMMARY & RESULTS (Phase 4) ====================

async function loadSummary(assessmentId) {
  stopTimer();
  showStage('summary');

  try {
    const userId = getLoggedInUserId();
    const response = await fetch(`/api/assessment/${assessmentId}/summary`, {
      headers: {
        ...(userId ? { 'x-user-id': String(userId) } : {}),
      },
    });
    const data = await response.json();

    if (!data.success || !data.summary) {
      showToast('error', 'Summary Error', data.message || 'Unable to load assessment summary.');
      return;
    }

    const s = data.summary;

    // Cache recommendation in localStorage for Dashboard synchronization
    if (s.personalizedRecommendation) {
      try {
        localStorage.setItem('cognifyRecommendation', JSON.stringify({
          path: `${s.skill} Track`,
          nextSkill: s.personalizedRecommendation.starting_point || s.personalizedRecommendation.next_topics?.[0] || s.skill,
          summary: s.personalizedRecommendation.summary || '',
        }));
      } catch (e) {
        console.warn('Could not cache recommendation:', e);
      }
    }
    summarySkillName.textContent = `${s.skill} Skill Evaluation Results`;

    // 1. Overall Performance Metrics (Phase 4)
    const totalQ = s.totalQuestions || 0;
    const correctQ = s.correctAnswers !== undefined ? s.correctAnswers : (s.score || 0);
    const incorrectQ = s.incorrectAnswers !== undefined ? s.incorrectAnswers : Math.max(0, totalQ - correctQ);
    const accuracy = s.accuracy !== undefined ? s.accuracy : (s.percentage || 0);
    const skillLvl = s.overallSkillLevel || s.skillLevel || 'Beginner';

    if (summaryScoreVal) summaryScoreVal.textContent = `${correctQ} / ${totalQ}`;
    if (summaryAccuracyVal) summaryAccuracyVal.textContent = `${accuracy}%`;
    if (summaryCorrectVal) summaryCorrectVal.textContent = `${correctQ}`;
    if (summaryIncorrectVal) summaryIncorrectVal.textContent = `${incorrectQ}`;
    if (summaryTotalQuestionsVal) summaryTotalQuestionsVal.textContent = `${totalQ}`;

    if (summaryOverallSkillLevel) {
      summaryOverallSkillLevel.textContent = skillLvl;
      summaryOverallSkillLevel.className = `metric-val skill-level-badge level-${skillLvl.toLowerCase()}`;
    }

    if (highestDiffTag) {
      highestDiffTag.textContent = `Highest: ${(s.highestDifficultyAchieved || 'Basic').toUpperCase()}`;
    }

    // 2. Concept-Wise Analysis (Phase 4)
    if (conceptAnalysisContainer && Array.isArray(s.conceptAnalysis)) {
      conceptAnalysisContainer.innerHTML = '';

      if (s.conceptAnalysis.length === 0) {
        conceptAnalysisContainer.innerHTML = `<p class="matrix-empty-msg">No concept data recorded.</p>`;
      } else {
        s.conceptAnalysis.forEach((item) => {
          const perfClass = item.performanceLevel === 'Strong'
            ? 'perf-strong'
            : (item.performanceLevel === 'Intermediate' ? 'perf-intermediate' : 'perf-improvement');

          const barColor = item.performanceLevel === 'Strong'
            ? '#16a34a'
            : (item.performanceLevel === 'Intermediate' ? '#d97706' : '#ef4444');

          const row = document.createElement('div');
          row.className = 'concept-row-card';
          row.innerHTML = `
            <div class="concept-row-main">
              <div class="concept-row-name">${escapeHtml(item.concept)}</div>
              <div class="concept-row-sub">${item.correctAnswers} of ${item.questionsAttempted} correct (${item.accuracy}%)</div>
            </div>
            <div class="concept-row-progress-wrap">
              <div class="concept-row-bar">
                <div class="concept-row-bar-fill" style="width: ${item.accuracy}%; background: ${barColor};"></div>
              </div>
              <span class="concept-row-percent" style="color: ${barColor};">${item.accuracy}%</span>
            </div>
            <span class="perf-badge ${perfClass}">${item.performanceLevel}</span>
          `;

          conceptAnalysisContainer.appendChild(row);
        });
      }
    }

    // 3. Personalized AI Learning Recommendation (Phase 4)
    const rec = s.personalizedRecommendation || {};

    if (recSummaryText) {
      recSummaryText.textContent = rec.summary || 'Review your core concepts and practice practical coding drills to advance.';
    }

    if (recStartingPointText) {
      recStartingPointText.textContent = rec.starting_point || 'Focus on foundational concepts and syntax.';
    }

    if (recStrengthsList) {
      recStrengthsList.innerHTML = (rec.strengths && rec.strengths.length > 0)
        ? rec.strengths.map((str) => `<li>${escapeHtml(str)}</li>`).join('')
        : `<li>Demonstrated baseline familiarity with ${s.skill}.</li>`;
    }

    if (recWeaknessesList) {
      recWeaknessesList.innerHTML = (rec.weaknesses && rec.weaknesses.length > 0)
        ? rec.weaknesses.map((w) => `<li>${escapeHtml(w)}</li>`).join('')
        : `<li>Edge cases and advanced optimization patterns.</li>`;
    }

    if (recNextTopicsList) {
      recNextTopicsList.innerHTML = (rec.next_topics && rec.next_topics.length > 0)
        ? rec.next_topics.map((t) => `<li>${escapeHtml(t)}</li>`).join('')
        : `<li>Functions & Scope</li><li>Object-Oriented Design</li>`;
    }

    if (recPracticeList) {
      recPracticeList.innerHTML = (rec.practice_recommendations && rec.practice_recommendations.length > 0)
        ? rec.practice_recommendations.map((p) => `<li>${escapeHtml(p)}</li>`).join('')
        : `<li>Build standalone scripts to reinforce concepts</li>`;
    }

    // 4. Itemized Answer Review (Phase 4)
    if (summaryReviewList && Array.isArray(s.questionsReview)) {
      summaryReviewList.innerHTML = '';

      s.questionsReview.forEach((item) => {
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';

        let statusBadge = '';
        if (!item.selectedOption) {
          statusBadge = `<span class="review-status-badge badge-timeout"><i class="fas fa-stopwatch"></i> Timed Out</span>`;
        } else if (item.isCorrect) {
          statusBadge = `<span class="review-status-badge badge-correct"><i class="fas fa-check"></i> Correct</span>`;
        } else {
          statusBadge = `<span class="review-status-badge badge-incorrect"><i class="fas fa-times"></i> Incorrect</span>`;
        }

        const userChoiceText = item.selectedOption
          ? `${item.selectedOption.toUpperCase()}: ${item.options[item.selectedOption] || ''}`
          : 'None (Timer Expired)';

        const correctChoiceText = `${item.correctOption.toUpperCase()}: ${item.options[item.correctOption] || ''}`;

        reviewItem.innerHTML = `
          <div class="review-item-header">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="review-q-num">Question ${item.order} of ${totalQ}</span>
              ${item.concept ? `<span class="review-concept"><i class="fas fa-lightbulb"></i> ${escapeHtml(item.concept)}</span>` : ''}
              <span class="meta-difficulty difficulty-${(item.difficulty || 'basic').toLowerCase()}">${(item.difficulty || 'basic').toUpperCase()}</span>
            </div>
            ${statusBadge}
          </div>
          <div class="review-prompt">${escapeHtml(item.questionText)}</div>
          <div class="review-answers">
            <div class="review-user-answer"><strong>Your Answer:</strong> ${escapeHtml(userChoiceText)}</div>
            <div class="review-correct-answer"><strong>Correct Answer:</strong> ${escapeHtml(correctChoiceText)}</div>
          </div>
          ${item.explanation ? `<div class="review-explanation"><strong>Explanation:</strong> ${escapeHtml(item.explanation)}</div>` : ''}
        `;

        summaryReviewList.appendChild(reviewItem);
      });
    }
  } catch (error) {
    console.error('Error fetching summary:', error);
  }
}

retakeAssessmentBtn.addEventListener('click', () => {
  sessionStorage.removeItem('cognify_assessment_id');
  window.history.replaceState(null, '', window.location.pathname);
  currentAssessmentId = null;
  gatekeeperFailureData = null;
  loadSkills();
});

// ==================== RESTORE STATE (Reload Resilience) ====================

async function restoreAssessmentState(assessmentId) {
  try {
    const userId = getLoggedInUserId();
    const response = await fetch(`/api/assessment/${assessmentId}/current`, {
      headers: {
        ...(userId ? { 'x-user-id': String(userId) } : {}),
      },
    });
    const data = await response.json();

    if (!data.success) {
      sessionStorage.removeItem('cognify_assessment_id');
      window.history.replaceState(null, '', window.location.pathname);
      return false;
    }

    currentAssessmentId = assessmentId;
    currentSkill = data.skill;

    if (data.status === 'gatekeeper_failed') {
      await loadGatekeeperStopFromSummary(assessmentId);
      return true;
    }

    if (data.status === 'completed') {
      await loadSummary(assessmentId);
      return true;
    }

    displayQuestion(data.question, data.alreadyAnswered, data.answerFeedback);
    return true;
  } catch (error) {
    console.error('Error restoring state:', error);
    return false;
  }
}

// ==================== UTILITIES ====================

function showStage(stageName) {
  skillStage.style.display = stageName === 'skill' ? 'block' : 'none';
  questionStage.style.display = stageName === 'question' ? 'block' : 'none';
  if (gatekeeperStopStage) {
    gatekeeperStopStage.style.display = stageName === 'gatekeeper_stop' ? 'block' : 'none';
  }
  summaryStage.style.display = stageName === 'summary' ? 'block' : 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
