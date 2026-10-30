// Cognify Phase 5 - Authentic User Dashboard & Profiling Script

document.addEventListener('DOMContentLoaded', async () => {
  setupTheme();
  setupNavToggle();
  setupSignOut();
  await loadUserProfileAndTelemetry();
});

// ==================== THEME TOGGLE (Dark / Light) ====================

function setupTheme() {
  const savedTheme = localStorage.getItem('cognify_theme') || 'dark';
  applyTheme(savedTheme);

  const themeToggleBtn = document.getElementById('themeToggleBtn');
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
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');
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

// ==================== NAVIGATION & AUTH ====================

function setupNavToggle() {
  const navToggle = document.querySelector('.nav-toggle');
  const dashboardNav = document.querySelector('.dashboard-nav');
  if (navToggle && dashboardNav) {
    navToggle.addEventListener('click', () => {
      dashboardNav.classList.toggle('open');
    });
  }
}

function setupSignOut() {
  const signOutLinks = document.querySelectorAll('a[href="/auth"]');
  signOutLinks.forEach((link) => {
    if (link.textContent.toLowerCase().includes('sign out')) {
      link.addEventListener('click', () => {
        localStorage.removeItem('cognifyUser');
        sessionStorage.removeItem('cognify_assessment_id');
      });
    }
  });
}

function getStoredUser() {
  const userJson = localStorage.getItem('cognifyUser');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    console.error('Error parsing cognifyUser:', e);
    return null;
  }
}

// ==================== USER PROFILING & TELEMETRY ====================

async function loadUserProfileAndTelemetry() {
  const storedUser = getStoredUser();

  const userNavName = document.getElementById('userNavName');
  const userAvatar = document.getElementById('userAvatar');
  const greetingEl = document.getElementById('dashboardGreeting');

  if (storedUser && storedUser.name) {
    const firstName = storedUser.name.split(' ')[0];
    if (userNavName) userNavName.textContent = storedUser.name;
    if (userAvatar) userAvatar.textContent = firstName.charAt(0).toUpperCase();
    if (greetingEl) {
      const hour = new Date().getHours();
      let timeOfDay = 'Morning';
      if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
      else if (hour >= 17) timeOfDay = 'Evening';
      greetingEl.textContent = `Good ${timeOfDay}, ${firstName}`;
    }
  } else {
    if (userNavName) userNavName.textContent = 'Guest Learner';
    if (userAvatar) userAvatar.textContent = 'G';
    if (greetingEl) greetingEl.textContent = 'Welcome to Cognify';
  }

  // If user is not signed in, show guest defaults and guide them to sign in or take quiz
  if (!storedUser || !storedUser.id) {
    renderGuestState();
    return;
  }

  // Fetch authentic user profile and assessments telemetry
  try {
    const response = await fetch(`/api/user/${storedUser.id}/profile`, {
      headers: { 'x-user-id': String(storedUser.id) },
    });
    const data = await response.json();

    if (!data.success || !data.profile) {
      renderGuestState();
      return;
    }

    renderProfileTelemetry(data.profile);
  } catch (error) {
    console.error('Error loading user profile:', error);
    renderGuestState();
  }
}

function renderProfileTelemetry(profile) {
  const stats = profile.stats || {};
  const latest = profile.latestAssessment;
  const rec = latest?.recommendation;

  // 1. Hero Cards (Real Data)
  const pathEl = document.getElementById('dashboardRecommendedPath');
  const nextSkillEl = document.getElementById('dashboardNextSkill');
  const countEl = document.getElementById('dashboardAssessmentsCount');
  const accEl = document.getElementById('dashboardAvgAccuracy');
  const summaryEl = document.getElementById('dashboardRecommendationSummary');

  if (pathEl) {
    pathEl.textContent = latest ? `${latest.skill}` : 'None Assessed';
  }

  if (nextSkillEl) {
    nextSkillEl.textContent = rec?.starting_point
      ? truncateText(rec.starting_point, 32)
      : (rec?.next_topics?.[0] || (latest ? 'Explore Advanced Topics' : 'Select a Skill'));
  }

  if (countEl) {
    countEl.textContent = `${stats.totalAssessments || 0} Evaluated`;
  }

  if (accEl) {
    accEl.textContent = `${stats.averageAccuracy || 0}%`;
  }

  if (summaryEl) {
    if (rec?.summary) {
      summaryEl.textContent = rec.summary;
    } else if (latest) {
      summaryEl.textContent = `Latest assessment in ${latest.skill} resulted in a skill level of ${latest.skillLevel}.`;
    } else {
      summaryEl.textContent = 'Your personalized AI recommendation will appear here after completing your first technical assessment.';
    }
  }

  // 2. Overview Cards (Real Data)
  const scoreVal = document.getElementById('dashboardLatestScore');
  const scoreMax = document.getElementById('dashboardScoreMax');
  const scoreTag = document.getElementById('dashboardScoreTag');
  const scoreDesc = document.getElementById('dashboardScoreDesc');

  if (scoreVal) scoreVal.textContent = latest ? latest.score : 0;
  if (scoreMax) scoreMax.textContent = latest ? `/ ${latest.totalQuestions}` : '/ 0';
  if (scoreTag) {
    scoreTag.textContent = latest ? `${latest.accuracy}% Accuracy` : 'No Activity';
    scoreTag.className = `tag ${latest && latest.accuracy >= 70 ? 'success' : 'warning'}`;
  }
  if (scoreDesc && latest) {
    scoreDesc.textContent = `Scored in ${latest.skill} assessment on ${new Date(latest.createdAt).toLocaleDateString()}.`;
  }

  const levelVal = document.getElementById('dashboardSkillLevel');
  const levelTag = document.getElementById('dashboardLevelTag');
  if (levelVal) levelVal.textContent = stats.bestSkillLevel || 'Not Assessed';
  if (levelTag) levelTag.textContent = latest?.skillLevel || 'Tier';

  const skillsCount = document.getElementById('dashboardSkillsCount');
  const skillsTag = document.getElementById('dashboardSkillsTag');
  const skillsDesc = document.getElementById('dashboardSkillsDesc');
  const skillsArray = stats.skillsAssessed || [];

  if (skillsCount) skillsCount.textContent = skillsArray.length;
  if (skillsTag) skillsTag.textContent = `${skillsArray.length} Explored`;
  if (skillsDesc) {
    skillsDesc.textContent = skillsArray.length > 0
      ? `Assessed: ${skillsArray.join(', ')}`
      : 'No skills assessed yet.';
  }

  const gkPassed = document.getElementById('dashboardGatekeeperPassed');
  const gkTag = document.getElementById('dashboardGatekeeperTag');
  const gkRatio = stats.totalAssessments > 0
    ? Math.round((stats.gatekeeperPassedAssessments / stats.totalAssessments) * 100)
    : 0;

  if (gkPassed) gkPassed.textContent = `${gkRatio}%`;
  if (gkTag) gkTag.textContent = `${stats.gatekeeperPassedAssessments || 0} Cleared`;

  // 3. Recent Assessments List
  renderRecentAssessmentsList(profile.recentAssessments || []);
}

function renderGuestState() {
  const pathEl = document.getElementById('dashboardRecommendedPath');
  const nextSkillEl = document.getElementById('dashboardNextSkill');
  const countEl = document.getElementById('dashboardAssessmentsCount');
  const accEl = document.getElementById('dashboardAvgAccuracy');

  if (pathEl) pathEl.textContent = 'None Assessed';
  if (nextSkillEl) nextSkillEl.textContent = 'Select a Skill';
  if (countEl) countEl.textContent = '0 Completed';
  if (accEl) accEl.textContent = '0%';

  renderRecentAssessmentsList([]);
}

function renderRecentAssessmentsList(assessments) {
  const container = document.getElementById('recentAssessmentsList');
  if (!container) return;

  if (!assessments || assessments.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card">
        <i class="fas fa-clipboard-question"></i>
        <h4>No Assessments Completed Yet</h4>
        <p>Choose from 14 technical skills to evaluate your knowledge and unlock your personalized learning roadmap.</p>
        <a href="/quiz" class="btn-cta-primary"><i class="fas fa-play"></i> Start First Assessment</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  assessments.forEach((a) => {
    const card = document.createElement('article');
    card.className = 'activity-card';
    card.style.cursor = 'pointer';
    card.title = 'Click to review evaluation report';

    const isGatekeeperFail = a.status === 'gatekeeper_failed';
    const statusClass = a.status === 'completed' ? 'success' : (isGatekeeperFail ? 'warning' : '');
    const statusLabel = isGatekeeperFail ? 'Gatekeeper Checkpoint' : (a.status === 'completed' ? 'Completed' : 'In Progress');

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span class="activity-type" style="margin: 0; font-weight: 700; color: var(--primary);">${escapeHtml(a.skill)}</span>
        <span class="tag ${statusClass}">${statusLabel}</span>
      </div>
      <h4 style="margin: 4px 0;">Score: ${a.score} / ${a.totalQuestions} (${a.accuracy}%)</h4>
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: var(--muted); margin-top: 6px;">
        <span>Skill Level: <strong style="color: var(--text);">${escapeHtml(a.skillLevel)}</strong></span>
        <span><i class="far fa-calendar"></i> ${new Date(a.createdAt).toLocaleDateString()}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      window.location.href = `/quiz?assessment_id=${a.id}`;
    });

    container.appendChild(card);
  });
}

function truncateText(text, maxLen) {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
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

const style = document.createElement('style');
style.textContent = `
.reveal-hidden {
    opacity: 0;
    transform: translateY(20px);
    transition: transform 0.8s ease, opacity 0.8s ease;
}

.reveal-visible {
    opacity: 1;
    transform: translateY(0);
}

.dashboard-nav.open {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 14px;
    margin-top: 16px;
}
`;
document.head.appendChild(style);
