const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');
const { pool, initDatabase } = require('./db');
const {
  generateQuestionsForSkill,
  generateNextAdaptiveQuestion,
  generateGatekeeperRecommendation,
  generatePersonalizedRecommendation,
} = require('./aiGenerator');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve landing page as home route (before static middleware)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

// Serve auth page
app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve quiz / assessment page
app.get('/quiz', (req, res) => {
  res.sendFile(path.join(__dirname, 'quiz.html'));
});

app.use(express.static(path.join(__dirname)));

// ==================== AUTHENTICATION APIS ====================

app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please fill all fields.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    return res.json({
      success: true,
      message: 'Account created successfully.',
      user: { id: result.insertId, name, email },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, message: 'Server error while signing up.' });
  }
});

app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please fill all fields.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, password FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    return res.json({
      success: true,
      message: 'Signed in successfully.',
      user: { id: user.id, name: user.full_name, email: user.email },
    });
  } catch (error) {
    console.error('Signin error:', error);
    return res.status(500).json({ success: false, message: 'Server error while signing in.' });
  }
});

// ==================== USER PROFILING APIS (Authentic Telemetry) ====================

// Security Helper: Verifies user ownership of assessment to prevent unauthorized access or cross-user answer tampering
function verifyAssessmentAccess(assessment, req) {
  if (!assessment || !assessment.user_id) return { allowed: true };
  const requesterId = req.headers['x-user-id'] || req.body?.userId || req.query?.userId;
  if (!requesterId) {
    return {
      allowed: false,
      reason: 'This assessment belongs to a registered user. User ID is required in headers or request body.',
    };
  }
  if (parseInt(requesterId, 10) !== parseInt(assessment.user_id, 10)) {
    return {
      allowed: false,
      reason: 'Unauthorized: You do not have permission to access or submit answers for another user’s assessment.',
    };
  }
  return { allowed: true };
}

// User Profile & Telemetry Endpoint (Real data, zero fake values)
app.get('/api/user/:id/profile', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }

  try {
    const [userRows] = await pool.query(
      'SELECT id, full_name, email, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = userRows[0];

    // Fetch genuine user assessments from database
    const [assessments] = await pool.query(
      `SELECT id, skill, total_questions, score, status, stage, max_questions, gatekeeper_passed, skill_level, 
              concept_analysis, personalized_recommendation, created_at, completed_at
       FROM assessments 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    const totalAssessments = assessments.length;
    const completedAssessments = assessments.filter((a) => a.status === 'completed').length;
    const gatekeeperPassedAssessments = assessments.filter((a) => a.gatekeeper_passed).length;

    // Distinct skills evaluated
    const skillsSet = new Set(assessments.map((a) => a.skill));
    const skillsAssessed = Array.from(skillsSet);

    // Cumulative accuracy calculation across all attempts
    let totalScore = 0;
    let totalQuestions = 0;
    assessments.forEach((a) => {
      totalScore += (a.score || 0);
      totalQuestions += (a.total_questions || 0);
    });
    const averageAccuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    // Highest skill level achieved
    const levelRank = { Novice: 1, Beginner: 2, Intermediate: 3, Proficient: 4, Advanced: 5 };
    let bestLevel = 'None';
    let bestRank = 0;
    assessments.forEach((a) => {
      if (a.skill_level && (levelRank[a.skill_level] || 0) > bestRank) {
        bestRank = levelRank[a.skill_level];
        bestLevel = a.skill_level;
      }
    });

    // Most recent assessment data
    let latestAssessment = null;
    if (assessments.length > 0) {
      const latest = assessments[0];
      let parsedRec = null;
      if (latest.personalized_recommendation) {
        try {
          parsedRec = typeof latest.personalized_recommendation === 'string'
            ? JSON.parse(latest.personalized_recommendation)
            : latest.personalized_recommendation;
        } catch (e) {
          parsedRec = null;
        }
      }

      let parsedConcepts = null;
      if (latest.concept_analysis) {
        try {
          parsedConcepts = typeof latest.concept_analysis === 'string'
            ? JSON.parse(latest.concept_analysis)
            : latest.concept_analysis;
        } catch (e) {
          parsedConcepts = null;
        }
      }

      latestAssessment = {
        id: latest.id,
        skill: latest.skill,
        score: latest.score,
        totalQuestions: latest.total_questions,
        status: latest.status,
        stage: latest.stage,
        gatekeeperPassed: !!latest.gatekeeper_passed,
        skillLevel: latest.skill_level || 'Beginner',
        accuracy: latest.total_questions > 0 ? Math.round((latest.score / latest.total_questions) * 100) : 0,
        recommendation: parsedRec,
        conceptAnalysis: parsedConcepts,
        createdAt: latest.created_at,
        completedAt: latest.completed_at,
      };
    }

    const recentAssessments = assessments.slice(0, 10).map((a) => ({
      id: a.id,
      skill: a.skill,
      score: a.score,
      totalQuestions: a.total_questions,
      accuracy: a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0,
      status: a.status,
      stage: a.stage,
      skillLevel: a.skill_level || 'Beginner',
      gatekeeperPassed: !!a.gatekeeper_passed,
      createdAt: a.created_at,
    }));

    return res.json({
      success: true,
      profile: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        memberSince: user.created_at,
        stats: {
          totalAssessments,
          completedAssessments,
          gatekeeperPassedAssessments,
          skillsAssessed,
          averageAccuracy,
          bestSkillLevel: bestLevel === 'None' ? (latestAssessment ? latestAssessment.skillLevel : 'Not Assessed') : bestLevel,
        },
        latestAssessment,
        recentAssessments,
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
});

// ==================== SKILLS & ASSESSMENT APIS ====================

// 1. Get available technical skills
app.get('/api/skills', async (req, res) => {
  try {
    const [skills] = await pool.query(`
      SELECT skill as id, skill as name, COUNT(*) as question_count
      FROM questions
      GROUP BY skill
      ORDER BY skill ASC
    `);

    const skillMetadata = {
      Python: {
        description: 'Core syntax, data structures, and functions',
        icon: 'fa-brands fa-python',
        badge: 'Recommended',
        category: 'Languages',
      },
      JavaScript: {
        description: 'Variables, ES6+ features, arrays, and operators',
        icon: 'fa-brands fa-js',
        badge: 'Popular',
        category: 'Languages',
      },
      'C++': {
        description: 'Memory management, pointers, OOP, and templates',
        icon: 'fa-solid fa-file-code',
        badge: 'Systems',
        category: 'Languages',
      },
      Java: {
        description: 'OOP, JVM, collections, and multi-threading',
        icon: 'fa-brands fa-java',
        badge: 'Enterprise',
        category: 'Languages',
      },
      'Node.js': {
        description: 'Event loop, non-blocking I/O, npm, and fs module',
        icon: 'fa-brands fa-node-js',
        badge: 'Backend',
        category: 'Frameworks',
      },
      'Python Django': {
        description: 'MVT architecture, ORM, migrations, and settings',
        icon: 'fa-solid fa-cubes',
        badge: 'Framework',
        category: 'Frameworks',
      },
      'HTML/CSS': {
        description: 'Semantic tags, layout grids, and box model',
        icon: 'fa-brands fa-html5',
        badge: 'Frontend',
        category: 'Frontend',
      },
      SQL: {
        description: 'Queries, filtering, sorting, and aggregate basics',
        icon: 'fa-solid fa-database',
        badge: 'Database',
        category: 'Database',
      },
      'Basic AI': {
        description: 'Graph search (BFS/DFS), heuristics, and Turing Test',
        icon: 'fa-solid fa-robot',
        badge: 'Foundations',
        category: 'AI & Data',
      },
      'Machine Learning': {
        description: 'Supervised learning, overfitting, and metrics',
        icon: 'fa-solid fa-chart-pie',
        badge: 'Data Science',
        category: 'AI & Data',
      },
      'Advanced AI': {
        description: 'Transformers, self-attention, RLHF, and policy',
        icon: 'fa-solid fa-brain',
        badge: 'Cutting Edge',
        category: 'AI & Data',
      },
      'Deep Learning': {
        description: 'CNNs, ReLU, backpropagation, and dropout',
        icon: 'fa-solid fa-network-wired',
        badge: 'Neural Nets',
        category: 'AI & Data',
      },
      'Problem Solving': {
        description: 'Binary search, dynamic programming, and stacks',
        icon: 'fa-solid fa-puzzle-piece',
        badge: 'Algorithms',
        category: 'Logic',
      },
      'Pattern Recognition': {
        description: 'K-Means clustering, PCA, and feature spaces',
        icon: 'fa-solid fa-shapes',
        badge: 'Cognition',
        category: 'Logic',
      },
    };

    const formatted = skills.map((s) => ({
      id: s.id,
      name: s.name,
      questionCount: s.question_count,
      description: skillMetadata[s.name]?.description || 'Fundamental concepts and syntax',
      icon: skillMetadata[s.name]?.icon || 'fa-solid fa-code',
      badge: skillMetadata[s.name]?.badge || '',
      category: skillMetadata[s.name]?.category || 'General',
    }));

    return res.json({ success: true, skills: formatted });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return res.status(500).json({ success: false, message: 'Failed to load skills.' });
  }
});

// 2. Start Assessment for a skill (Phase 3: Gatekeeper + Adaptive Skill Evaluation)
app.post('/api/assessment/start', async (req, res) => {
  const { skill, userId, maxQuestions } = req.body;
  if (!skill) {
    return res.status(400).json({ success: false, message: 'Skill is required.' });
  }

  // Configurable max questions: defaults to 10, bounds between 5 and 20
  const configuredMax = Math.min(Math.max(parseInt(maxQuestions, 10) || 10, 5), 20);

  try {
    // Validate that userId exists in users table if provided, otherwise default to null
    let validUserId = null;
    if (userId) {
      try {
        const [userCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
        if (userCheck.length > 0) {
          validUserId = userCheck[0].id;
        }
      } catch (uErr) {
        console.warn('Could not verify userId:', uErr.message);
      }
    }

    // Query previously seen questions for this user & skill to guarantee freshness
    let seenQuestionTexts = [];
    if (validUserId) {
      try {
        const [prevRows] = await pool.query(
          `SELECT DISTINCT q.question_text 
           FROM assessment_responses ar
           JOIN questions q ON ar.question_id = q.id
           JOIN assessments a ON ar.assessment_id = a.id
           WHERE a.user_id = ? AND a.skill = ?
           LIMIT 20`,
          [validUserId, skill]
        );
        seenQuestionTexts = prevRows.map((r) => r.question_text);
      } catch (dbErr) {
        console.warn('Could not fetch prior questions for deduplication:', dbErr.message);
      }
    }

    // Phase 3 Part A: Generate exactly 3 basic Gatekeeper questions
    const gatekeeperQuestions = await generateQuestionsForSkill(skill, seenQuestionTexts);

    // Save gatekeeper questions to the questions table
    const questionIds = [];
    for (const q of gatekeeperQuestions) {
      const [insertQ] = await pool.query(
        `INSERT INTO questions 
          (skill, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, concept, difficulty, is_ai_generated) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          skill,
          q.questionText,
          q.options.a,
          q.options.b,
          q.options.c,
          q.options.d,
          q.correctOption,
          q.explanation,
          q.concept || 'General',
          q.difficulty || 'basic',
          1,
        ]
      );
      questionIds.push(insertQ.insertId);
    }

    // Create assessment record initialized in Gatekeeper stage
    const [insertResult] = await pool.query(
      `INSERT INTO assessments 
        (user_id, skill, total_questions, current_question_index, score, status, stage, max_questions, gatekeeper_passed, question_ids) 
       VALUES (?, ?, 3, 0, 0, "in_progress", "gatekeeper", ?, FALSE, ?)`,
      [validUserId, skill, configuredMax, JSON.stringify(questionIds)]
    );

    const assessmentId = insertResult.insertId;
    const firstQ = gatekeeperQuestions[0];
    const firstQId = questionIds[0];

    return res.json({
      success: true,
      assessmentId,
      skill,
      stage: 'gatekeeper',
      gatekeeperPassed: false,
      totalQuestions: 3,
      maxQuestions: configuredMax,
      currentQuestionIndex: 0,
      question: {
        id: firstQId,
        questionNumber: 1,
        totalQuestions: 3,
        stage: 'gatekeeper',
        questionText: firstQ.questionText,
        options: {
          a: firstQ.options.a,
          b: firstQ.options.b,
          c: firstQ.options.c,
          d: firstQ.options.d,
        },
        concept: firstQ.concept,
        difficulty: firstQ.difficulty,
      },
    });
  } catch (error) {
    console.error('Error starting assessment:', error);
    return res.status(500).json({ success: false, message: 'Server error starting assessment.' });
  }
});

// 3. Get Current Assessment State (Enables reload/refresh resilience)
app.get('/api/assessment/:id/current', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (isNaN(assessmentId)) {
    return res.status(400).json({ success: false, message: 'Invalid assessment ID.' });
  }

  try {
    const [assessments] = await pool.query('SELECT * FROM assessments WHERE id = ?', [assessmentId]);
    if (assessments.length === 0) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const assessment = assessments[0];

    // Security: Verify user ownership if assessment is user-bound
    const accessCheck = verifyAssessmentAccess(assessment, req);
    if (!accessCheck.allowed) {
      return res.status(403).json({ success: false, message: accessCheck.reason });
    }

    const questionIds = typeof assessment.question_ids === 'string'
      ? JSON.parse(assessment.question_ids)
      : assessment.question_ids;

    // Handle gatekeeper failed status
    if (assessment.status === 'gatekeeper_failed') {
      return res.json({
        success: true,
        status: 'gatekeeper_failed',
        stage: 'gatekeeper',
        assessmentId: assessment.id,
        skill: assessment.skill,
        score: assessment.score,
        totalQuestions: questionIds.length,
        maxQuestions: assessment.max_questions,
        stoppedReason: assessment.stopped_reason,
        startingRecommendation: assessment.starting_recommendation,
        isCompleted: true,
      });
    }

    // Handle completed status
    if (assessment.status === 'completed') {
      return res.json({
        success: true,
        status: 'completed',
        stage: assessment.stage,
        assessmentId: assessment.id,
        skill: assessment.skill,
        score: assessment.score,
        totalQuestions: assessment.total_questions,
        maxQuestions: assessment.max_questions,
        isCompleted: true,
      });
    }

    const currentIndex = assessment.current_question_index;
    if (currentIndex >= questionIds.length) {
      await pool.query('UPDATE assessments SET status = "completed", completed_at = NOW() WHERE id = ?', [assessmentId]);
      return res.json({
        success: true,
        status: 'completed',
        stage: assessment.stage,
        assessmentId: assessment.id,
        skill: assessment.skill,
        score: assessment.score,
        totalQuestions: assessment.total_questions,
        maxQuestions: assessment.max_questions,
        isCompleted: true,
      });
    }

    const currentQuestionId = questionIds[currentIndex];

    // Fetch question
    const [qRows] = await pool.query(
      'SELECT id, skill, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, concept, difficulty FROM questions WHERE id = ?',
      [currentQuestionId]
    );

    if (qRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    const q = qRows[0];

    // Check if user already submitted an answer for this question
    const [responses] = await pool.query(
      'SELECT * FROM assessment_responses WHERE assessment_id = ? AND question_id = ?',
      [assessmentId, currentQuestionId]
    );

    if (responses.length > 0) {
      const response = responses[0];
      return res.json({
        success: true,
        status: 'in_progress',
        stage: assessment.stage,
        gatekeeperPassed: !!assessment.gatekeeper_passed,
        assessmentId: assessment.id,
        skill: assessment.skill,
        totalQuestions: assessment.total_questions,
        maxQuestions: assessment.max_questions,
        currentQuestionIndex: currentIndex,
        alreadyAnswered: true,
        question: {
          id: q.id,
          questionNumber: currentIndex + 1,
          totalQuestions: assessment.total_questions,
          stage: assessment.stage,
          questionText: q.question_text,
          options: {
            a: q.option_a,
            b: q.option_b,
            c: q.option_c,
            d: q.option_d,
          },
          concept: q.concept,
          difficulty: q.difficulty,
        },
        answerFeedback: {
          selected_option: response.selected_option,
          is_correct: !!response.is_correct,
          correct_option: q.correct_option,
          explanation: q.explanation,
          is_last_question: currentIndex + 1 >= assessment.total_questions,
        },
      });
    }

    // Question not answered yet: strictly omit correct_option & explanation
    return res.json({
      success: true,
      status: 'in_progress',
      stage: assessment.stage,
      gatekeeperPassed: !!assessment.gatekeeper_passed,
      assessmentId: assessment.id,
      skill: assessment.skill,
      totalQuestions: assessment.total_questions,
      maxQuestions: assessment.max_questions,
      currentQuestionIndex: currentIndex,
      alreadyAnswered: false,
      question: {
        id: q.id,
        questionNumber: currentIndex + 1,
        totalQuestions: assessment.total_questions,
        stage: assessment.stage,
        questionText: q.question_text,
        options: {
          a: q.option_a,
          b: q.option_b,
          c: q.option_c,
          d: q.option_d,
        },
        concept: q.concept,
        difficulty: q.difficulty,
      },
    });
  } catch (error) {
    console.error('Error fetching current question:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching assessment state.' });
  }
});

// 4. Submit Answer & Validate on Backend (Phase 3: Gatekeeper Enforcement & Adaptive Progression)
app.post('/api/assessment/:id/submit-answer', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  const { question_id, selected_option, time_taken_seconds } = req.body;

  if (isNaN(assessmentId) || !question_id) {
    return res.status(400).json({ success: false, message: 'Assessment ID and question_id are required.' });
  }

  try {
    const [assessments] = await pool.query('SELECT * FROM assessments WHERE id = ?', [assessmentId]);
    if (assessments.length === 0) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const assessment = assessments[0];

    // Security: Verify user ownership if assessment is user-bound (Prevents submitting answers for another user)
    const accessCheck = verifyAssessmentAccess(assessment, req);
    if (!accessCheck.allowed) {
      return res.status(403).json({ success: false, message: accessCheck.reason });
    }

    if (assessment.status === 'completed' || assessment.status === 'gatekeeper_failed') {
      return res.status(400).json({ success: false, message: 'Assessment has ended and is no longer accepting answers.' });
    }

    // Check if this question was ALREADY answered to prevent double submission (409 Conflict)
    const [existingResponses] = await pool.query(
      'SELECT id, selected_option, is_correct FROM assessment_responses WHERE assessment_id = ? AND question_id = ?',
      [assessmentId, parseInt(question_id, 10)]
    );

    if (existingResponses.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This question has already been submitted for this assessment.',
      });
    }

    const questionIds = typeof assessment.question_ids === 'string'
      ? JSON.parse(assessment.question_ids)
      : assessment.question_ids;

    const currentIndex = assessment.current_question_index;
    const expectedQuestionId = questionIds[currentIndex];

    if (parseInt(question_id, 10) !== expectedQuestionId) {
      return res.status(400).json({
        success: false,
        message: `Invalid question submission. Expected question ID ${expectedQuestionId}.`,
      });
    }

    // Fetch question from DB
    const [qRows] = await pool.query(
      'SELECT correct_option, explanation, question_text, concept, difficulty FROM questions WHERE id = ?',
      [expectedQuestionId]
    );

    if (qRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question data not found.' });
    }

    const { correct_option, explanation, question_text, concept, difficulty } = qRows[0];

    // Backend answer validation
    const isCorrect = Boolean(
      selected_option &&
      String(selected_option).trim().toLowerCase() === String(correct_option).trim().toLowerCase()
    );

    const newScore = assessment.score + (isCorrect ? 1 : 0);

    // Record response in assessment_responses table
    await pool.query(
      'INSERT INTO assessment_responses (assessment_id, question_id, question_order, selected_option, is_correct, time_taken_seconds) VALUES (?, ?, ?, ?, ?, ?)',
      [
        assessmentId,
        expectedQuestionId,
        currentIndex + 1,
        selected_option || null,
        isCorrect ? 1 : 0,
        time_taken_seconds || 0,
      ]
    );

    // ==================== PART A: GATEKEEPER STAGE ====================
    if (assessment.stage === 'gatekeeper') {
      if (!isCorrect) {
        // ANY INCORRECT ANSWER STOPS THE ASSESSMENT IMMEDIATELY!
        const recommendation = await generateGatekeeperRecommendation(assessment.skill, concept, qRows[0]);

        await pool.query(
          `UPDATE assessments 
           SET score = ?, current_question_index = ?, status = 'gatekeeper_failed', 
               stopped_reason = 'Gatekeeper checkpoint failed: foundational question missed', 
               starting_recommendation = ?, completed_at = NOW() 
           WHERE id = ?`,
          [newScore, currentIndex + 1, recommendation, assessmentId]
        );

        return res.json({
          success: true,
          is_correct: false,
          correct_option: correct_option.toLowerCase(),
          selected_option: selected_option ? String(selected_option).toLowerCase() : null,
          explanation,
          score: newScore,
          is_completed: true,
          gatekeeper_failed: true,
          gatekeeper_stopped: true,
          stage: 'gatekeeper',
          missed_question: {
            id: expectedQuestionId,
            questionNumber: currentIndex + 1,
            questionText: question_text,
            concept: concept,
            difficulty: difficulty,
            userAnswer: selected_option,
            correctAnswer: correct_option,
            explanation: explanation,
          },
          concept_needing_improvement: concept,
          starting_recommendation: recommendation,
        });
      }

      // If answer was correct during gatekeeper:
      if (currentIndex + 1 < 3) {
        // Advance to Question 2 or Question 3 of gatekeeper
        await pool.query(
          'UPDATE assessments SET score = ?, current_question_index = ? WHERE id = ?',
          [newScore, currentIndex + 1, assessmentId]
        );

        return res.json({
          success: true,
          is_correct: true,
          correct_option: correct_option.toLowerCase(),
          selected_option: selected_option ? String(selected_option).toLowerCase() : null,
          explanation,
          score: newScore,
          is_completed: false,
          stage: 'gatekeeper',
          gatekeeper_passed: false,
          next_question_number: currentIndex + 2,
        });
      }

      // Question 3 was answered correctly! (All 3 gatekeeper questions correct: 3/3)
      // UNLOCK ADAPTIVE ASSESSMENT!
      const [historyRows] = await pool.query(
        `SELECT ar.question_id, q.question_text, q.concept, q.difficulty, ar.selected_option, ar.is_correct, ar.time_taken_seconds
         FROM assessment_responses ar
         JOIN questions q ON ar.question_id = q.id
         WHERE ar.assessment_id = ?
         ORDER BY ar.question_order ASC`,
        [assessmentId]
      );

      const previousPrompts = historyRows.map((r) => r.question_text);

      // Dynamically generate Question 4 (the first adaptive question)
      const nextAdaptiveQ = await generateNextAdaptiveQuestion({
        skill: assessment.skill,
        history: historyRows,
        previousQuestionTexts: previousPrompts,
      });

      // Insert Q4 into questions table
      const [insertQ4] = await pool.query(
        `INSERT INTO questions 
          (skill, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, concept, difficulty, is_ai_generated) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assessment.skill,
          nextAdaptiveQ.questionText,
          nextAdaptiveQ.options.a,
          nextAdaptiveQ.options.b,
          nextAdaptiveQ.options.c,
          nextAdaptiveQ.options.d,
          nextAdaptiveQ.correctOption,
          nextAdaptiveQ.explanation,
          nextAdaptiveQ.concept,
          nextAdaptiveQ.difficulty,
          1,
        ]
      );

      const q4Id = insertQ4.insertId;
      questionIds.push(q4Id);

      await pool.query(
        `UPDATE assessments 
         SET score = ?, current_question_index = 3, stage = 'adaptive', gatekeeper_passed = TRUE, 
             total_questions = ?, question_ids = ? 
         WHERE id = ?`,
        [newScore, assessment.max_questions, JSON.stringify(questionIds), assessmentId]
      );

      return res.json({
        success: true,
        is_correct: true,
        correct_option: correct_option.toLowerCase(),
        selected_option: selected_option ? String(selected_option).toLowerCase() : null,
        explanation,
        score: newScore,
        is_completed: false,
        gatekeeper_passed: true,
        adaptive_unlocked: true,
        stage: 'adaptive',
        next_question_number: 4,
        total_questions: assessment.max_questions,
      });
    }

    // ==================== PART B: ADAPTIVE STAGE ====================
    const nextIndex = currentIndex + 1;
    const isCompleted = nextIndex >= assessment.max_questions;

    if (isCompleted) {
      // Reached maximum configured questions -> complete assessment!
      await pool.query(
        'UPDATE assessments SET score = ?, current_question_index = ?, status = "completed", completed_at = NOW() WHERE id = ?',
        [newScore, nextIndex, assessmentId]
      );

      return res.json({
        success: true,
        is_correct: isCorrect,
        correct_option: correct_option.toLowerCase(),
        selected_option: selected_option ? String(selected_option).toLowerCase() : null,
        explanation,
        score: newScore,
        is_completed: true,
        stage: 'adaptive',
        next_question_number: nextIndex + 1,
      });
    }

    // Dynamically generate the next single adaptive question based on cumulative performance
    const [allHistoryRows] = await pool.query(
      `SELECT ar.question_id, q.question_text, q.concept, q.difficulty, ar.selected_option, ar.is_correct, ar.time_taken_seconds
       FROM assessment_responses ar
       JOIN questions q ON ar.question_id = q.id
       WHERE ar.assessment_id = ?
       ORDER BY ar.question_order ASC`,
      [assessmentId]
    );

    const prevTexts = allHistoryRows.map((r) => r.question_text);

    const dynamicNextQ = await generateNextAdaptiveQuestion({
      skill: assessment.skill,
      history: allHistoryRows,
      previousQuestionTexts: prevTexts,
    });

    const [insertNextQ] = await pool.query(
      `INSERT INTO questions 
        (skill, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, concept, difficulty, is_ai_generated) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assessment.skill,
        dynamicNextQ.questionText,
        dynamicNextQ.options.a,
        dynamicNextQ.options.b,
        dynamicNextQ.options.c,
        dynamicNextQ.options.d,
        dynamicNextQ.correctOption,
        dynamicNextQ.explanation,
        dynamicNextQ.concept,
        dynamicNextQ.difficulty,
        1,
      ]
    );

    questionIds.push(insertNextQ.insertId);

    await pool.query(
      'UPDATE assessments SET score = ?, current_question_index = ?, question_ids = ? WHERE id = ?',
      [newScore, nextIndex, JSON.stringify(questionIds), assessmentId]
    );

    return res.json({
      success: true,
      is_correct: isCorrect,
      correct_option: correct_option.toLowerCase(),
      selected_option: selected_option ? String(selected_option).toLowerCase() : null,
      explanation,
      score: newScore,
      is_completed: false,
      stage: 'adaptive',
      next_question_number: nextIndex + 1,
    });
  } catch (error) {
    console.error('Error validating answer in adaptive assessment:', error);
    return res.status(500).json({ success: false, message: 'Server error while validating answer.' });
  }
});

// 5. Get Assessment Summary / Results (Phase 3: Adaptive Breakdown & Mastery Matrix)
app.get('/api/assessment/:id/summary', async (req, res) => {
  const assessmentId = parseInt(req.params.id, 10);
  if (isNaN(assessmentId)) {
    return res.status(400).json({ success: false, message: 'Invalid assessment ID.' });
  }

  try {
    const [assessments] = await pool.query('SELECT * FROM assessments WHERE id = ?', [assessmentId]);
    if (assessments.length === 0) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    const assessment = assessments[0];

    // Security: Verify user ownership if assessment is user-bound
    const accessCheck = verifyAssessmentAccess(assessment, req);
    if (!accessCheck.allowed) {
      return res.status(403).json({ success: false, message: accessCheck.reason });
    }

    // Join responses with question details
    const [responses] = await pool.query(
      `SELECT 
        ar.question_order,
        ar.selected_option,
        ar.is_correct,
        ar.time_taken_seconds,
        q.id as question_id,
        q.question_text,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_option,
        q.explanation,
        q.concept,
        q.difficulty
      FROM assessment_responses ar
      JOIN questions q ON ar.question_id = q.id
      WHERE ar.assessment_id = ?
      ORDER BY ar.question_order ASC`,
      [assessmentId]
    );

    const totalQuestions = responses.length;
    const correctAnswers = responses.filter((r) => r.is_correct).length;
    const incorrectAnswers = totalQuestions - correctAnswers;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const score = correctAnswers;

    // Calculate Concept-Wise Analysis (for every assessed concept)
    const conceptMap = {};
    const difficultiesFound = new Set();

    responses.forEach((r) => {
      const c = r.concept || 'General';
      const d = (r.difficulty || 'basic').toLowerCase();
      difficultiesFound.add(d);

      if (!conceptMap[c]) {
        conceptMap[c] = {
          concept: c,
          questionsAttempted: 0,
          correctAnswers: 0,
          highestDifficulty: d,
        };
      }
      conceptMap[c].questionsAttempted++;
      if (r.is_correct) {
        conceptMap[c].correctAnswers++;
      }
      const diffRank = { basic: 1, intermediate: 2, advanced: 3 };
      if ((diffRank[d] || 1) > (diffRank[conceptMap[c].highestDifficulty] || 1)) {
        conceptMap[c].highestDifficulty = d;
      }
    });

    const conceptAnalysis = Object.values(conceptMap).map((item) => {
      const acc = item.questionsAttempted > 0
        ? Math.round((item.correctAnswers / item.questionsAttempted) * 100)
        : 0;
      let perfLevel = 'Needs Improvement';
      if (acc >= 75) {
        perfLevel = 'Strong';
      } else if (acc >= 50) {
        perfLevel = 'Intermediate';
      }

      return {
        concept: item.concept,
        questionsAttempted: item.questionsAttempted,
        attempted: item.questionsAttempted,
        correctAnswers: item.correctAnswers,
        correct: item.correctAnswers,
        accuracy: acc,
        performanceLevel: perfLevel,
        highestDifficulty: item.highestDifficulty,
      };
    });

    let highestDifficulty = 'basic';
    if (difficultiesFound.has('advanced')) highestDifficulty = 'advanced';
    else if (difficultiesFound.has('intermediate')) highestDifficulty = 'intermediate';

    // Calculate Overall Skill Level
    let overallSkillLevel = 'Beginner';
    if (accuracy >= 85 && highestDifficulty === 'advanced') {
      overallSkillLevel = 'Advanced';
    } else if (accuracy >= 70) {
      overallSkillLevel = 'Proficient';
    } else if (accuracy >= 50) {
      overallSkillLevel = 'Intermediate';
    } else if (accuracy >= 30) {
      overallSkillLevel = 'Beginner';
    } else {
      overallSkillLevel = 'Novice';
    }

    // Check for cached/persisted recommendation
    let personalizedRecommendation = null;
    if (assessment.personalized_recommendation) {
      try {
        personalizedRecommendation = typeof assessment.personalized_recommendation === 'string'
          ? JSON.parse(assessment.personalized_recommendation)
          : assessment.personalized_recommendation;
      } catch (e) {
        personalizedRecommendation = null;
      }
    }

    // Generate and persist if not already saved
    if (!personalizedRecommendation) {
      let userHistory = [];
      if (assessment.user_id) {
        try {
          const [pastRows] = await pool.query(
            'SELECT id, skill, score, total_questions, status, created_at FROM assessments WHERE user_id = ? AND id != ? ORDER BY created_at DESC LIMIT 5',
            [assessment.user_id, assessment.id]
          );
          userHistory = pastRows;
        } catch (histErr) {
          console.error('Error fetching past user history:', histErr);
        }
      }

      const overallStats = {
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        accuracy,
        score,
        highestDifficultyAchieved: highestDifficulty,
        overallSkillLevel,
      };

      personalizedRecommendation = await generatePersonalizedRecommendation({
        skill: assessment.skill,
        overallStats,
        conceptAnalysis,
        userHistory,
        questionsReview: responses,
      });

      // Persist to MySQL for instant reload consistency
      try {
        await pool.query(
          'UPDATE assessments SET skill_level = ?, concept_analysis = ?, personalized_recommendation = ? WHERE id = ?',
          [
            personalizedRecommendation.skill_level || overallSkillLevel,
            JSON.stringify(conceptAnalysis),
            JSON.stringify(personalizedRecommendation),
            assessmentId,
          ]
        );
      } catch (dbErr) {
        console.error('Error persisting recommendation to DB:', dbErr);
      }
    }

    const finalSkillLevel = personalizedRecommendation?.skill_level || overallSkillLevel;

    return res.json({
      success: true,
      summary: {
        assessmentId: assessment.id,
        skill: assessment.skill,

        // Overall Performance (Phase 4 Requirement)
        overall: {
          totalQuestions,
          correctAnswers,
          incorrectAnswers,
          accuracy,
          score,
          overallSkillLevel: finalSkillLevel,
        },

        // Top-Level Overall Fields (Backwards Compatible)
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        accuracy,
        score,
        percentage: accuracy,
        overallSkillLevel: finalSkillLevel,
        skillLevel: finalSkillLevel,
        maxQuestions: assessment.max_questions,
        status: assessment.status,
        stage: assessment.stage,
        gatekeeperPassed: !!assessment.gatekeeper_passed,
        stoppedReason: assessment.stopped_reason,
        startingRecommendation: assessment.starting_recommendation,
        highestDifficultyAchieved: highestDifficulty,

        // Concept-Wise Analysis (Phase 4 Requirement)
        conceptAnalysis,

        // Personalized Learning Recommendation (Phase 4 Requirement)
        personalizedRecommendation,

        // Concept Mastery Matrix (Phase 3 Compatibility)
        conceptMatrix: {
          mastered: conceptAnalysis.filter((c) => c.performanceLevel === 'Strong'),
          developing: conceptAnalysis.filter((c) => c.performanceLevel === 'Intermediate'),
          needsImprovement: conceptAnalysis.filter((c) => c.performanceLevel === 'Needs Improvement'),
        },

        createdAt: assessment.created_at,
        completedAt: assessment.completed_at,

        // Answer Review (Phase 4 Requirement)
        questionsReview: responses.map((r) => ({
          order: r.question_order,
          questionText: r.question_text,
          options: {
            a: r.option_a,
            b: r.option_b,
            c: r.option_c,
            d: r.option_d,
          },
          selectedOption: r.selected_option,
          correctOption: r.correct_option,
          isCorrect: !!r.is_correct,
          status: !r.selected_option ? 'timed_out' : (r.is_correct ? 'correct' : 'incorrect'),
          explanation: r.explanation,
          concept: r.concept || 'General',
          difficulty: r.difficulty || 'basic',
          timeTaken: r.time_taken_seconds,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching assessment summary.' });
  }
});

// ==================== RECOMMENDATION API ====================

function getRecommendation(score, answers = []) {
  const total = 5;
  const percentage = Math.round((score / total) * 100);
  const recommendation = {
    score,
    total,
    percentage,
    path: 'Beginner Foundations',
    summary: 'Review core HTML, CSS and JavaScript concepts to build a stronger base before advancing.',
    nextSkill: 'HTML & CSS fundamentals',
    resources: [
      'HTML structure and semantics',
      'Responsive layout patterns',
      'JavaScript basics and control flow',
    ],
  };

  if (percentage >= 80) {
    recommendation.path = 'Advanced Frontend Developer';
    recommendation.summary = 'You are ready to master advanced frontend architecture, performance optimization, and modern component patterns.';
    recommendation.nextSkill = 'Advanced React Patterns';
    recommendation.resources = [
      'React performance optimization',
      'State management with Redux or Zustand',
      'Component design and reusable UI systems',
    ];
  } else if (percentage >= 50) {
    recommendation.path = 'Intermediate JavaScript Roadmap';
    recommendation.summary = 'Strengthen your JavaScript and modern frontend skills with intermediate patterns and practical application.';
    recommendation.nextSkill = 'JavaScript best practices';
    recommendation.resources = [
      'JavaScript ES6+ features',
      'React hooks and state management',
      'Modern CSS techniques',
    ];
  }

  const reactAnswerCorrect = answers[3] === 1;
  if (percentage >= 60 && reactAnswerCorrect) {
    recommendation.path = 'React Developer Track';
    recommendation.summary = 'Based on your quiz, focus on React development with hooks, component architecture, and modern UX patterns.';
    recommendation.nextSkill = 'React hooks and component state';
    recommendation.resources = [
      'React hooks deep dive',
      'Building reusable components',
      'Managing app state with context',
    ];
  }

  return recommendation;
}

app.post('/api/recommend', (req, res) => {
  const { score, answers } = req.body;
  if (typeof score !== 'number') {
    return res.status(400).json({ success: false, message: 'Score is required to generate a recommendation.' });
  }

  const recommendation = getRecommendation(score, Array.isArray(answers) ? answers : []);
  return res.json({ success: true, recommendation });
});

// ==================== INITIALIZATION & START ====================

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Cognify server running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database on startup:', err);
    process.exit(1);
  });
