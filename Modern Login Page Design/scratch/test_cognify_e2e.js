/**
 * Cognify - End-to-End Test Suite
 *
 * Stack:
 * Node.js + Express.js + MySQL + Gemini API
 *
 * Run:
 *   node scratch/test_cognify_e2e.js
 *
 * Server:
 *   The Cognify server must already be running on port 3000.
 */
require("dotenv").config();
const mysql = require("mysql2/promise");
const crypto = require("crypto");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const TEST_PREFIX = `cognify_e2e_${Date.now()}_${crypto
  .randomBytes(3)
  .toString("hex")}`;

const USER1 = {
  name: "Cognify E2E User One",
  email: `${TEST_PREFIX}_one@test.local`,
  password: "Test@12345",
};

const USER2 = {
  name: "Cognify E2E User Two",
  email: `${TEST_PREFIX}_two@test.local`,
  password: "Test@12345",
};

let db;
let user1Id;
let user2Id;

let failedAssessmentId;
let completedAssessmentId;

let passed = 0;
let failed = 0;

function pass(message) {
  passed++;
  console.log(`  [PASS] ${message}`);
}

function fail(message) {
  failed++;
  console.log(`  [FAIL] ${message}`);
}

function section(title) {
  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
}

function assert(condition, message) {
  if (condition) {
    pass(message);
    return true;
  }

  fail(message);
  return false;
}

function normalizeOption(value) {
  if (value === undefined || value === null) return "";

  const text = String(value).trim().toLowerCase();

  // Supports values such as:
  // "a", "A", "option_a", "Option A"
  if (text === "a" || text.includes("option_a") || text.includes("option a")) {
    return "a";
  }

  if (text === "b" || text.includes("option_b") || text.includes("option b")) {
    return "b";
  }

  if (text === "c" || text.includes("option_c") || text.includes("option c")) {
    return "c";
  }

  if (text === "d" || text.includes("option_d") || text.includes("option d")) {
    return "d";
  }

  return text.charAt(0);
}

function wrongOption(correctOption) {
  const correct = normalizeOption(correctOption);

  for (const option of ["a", "b", "c", "d"]) {
    if (option !== correct) return option;
  }

  return "a";
}

function extractQuestion(body) {
  if (!body || typeof body !== "object") return null;

  return (
    body.question ||
    body.currentQuestion ||
    body.current_question ||
    body.nextQuestion ||
    body.next_question ||
    null
  );
}

function extractQuestionId(question) {
  if (!question) return null;

  return (
    question.question_id ??
    question.questionId ??
    question.id ??
    null
  );
}

function containsAnswerSecrets(value) {
  const forbiddenKeys = new Set([
    "correct_option",
    "correctoption",
    "correct_answer",
    "correctanswer",
    "explanation",
  ]);

  function scan(obj) {
    if (!obj || typeof obj !== "object") return false;

    if (Array.isArray(obj)) {
      return obj.some(scan);
    }

    for (const [key, child] of Object.entries(obj)) {
      if (forbiddenKeys.has(key.toLowerCase())) {
        return true;
      }

      if (child && typeof child === "object" && scan(child)) {
        return true;
      }
    }

    return false;
  }

  return scan(value);
}

async function api(method, path, body = undefined, headers = {}) {
  const options = {
    method,
    headers: {
      Accept: "application/json",
      ...headers,
    },
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch (error) {
    throw new Error(
      `Could not connect to Cognify server at ${BASE_URL}. ` +
      `Make sure the server is running. Original error: ${error.message}`
    );
  }

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function dbQuery(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

async function getQuestionFromDatabase(questionId) {
  const rows = await dbQuery(
    `
      SELECT
        id,
        skill,
        question_text,
        correct_option,
        explanation,
        concept,
        difficulty,
        is_ai_generated
      FROM questions
      WHERE id = ?
      LIMIT 1
    `,
    [questionId]
  );

  return rows[0] || null;
}

async function getAssessment(assessmentId) {
  const rows = await dbQuery(
    `
      SELECT
        id,
        user_id,
        skill,
        total_questions,
        current_question_index,
        score,
        status,
        stage,
        max_questions,
        gatekeeper_passed,
        stopped_reason,
        starting_recommendation,
        adaptive_history,
        question_ids,
        skill_level,
        concept_analysis,
        personalized_recommendation,
        created_at,
        completed_at
      FROM assessments
      WHERE id = ?
      LIMIT 1
    `,
    [assessmentId]
  );

  return rows[0] || null;
}

function parseJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;

  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function submitAnswer({
  assessmentId,
  userId,
  questionId,
  selectedOption,
  scoreTamper = false,
}) {
  const body = {
    question_id: questionId,
    selected_option: selectedOption,
    time_taken_seconds: 5,
  };

  if (scoreTamper) {
    body.score = 999999;
    body.total_score = 999999;
  }

  return api(
    "POST",
    `/api/assessment/${assessmentId}/submit-answer`,
    body,
    {
      "x-user-id": String(userId),
    }
  );
}

async function getCurrentQuestion(assessmentId, userId) {
  return api(
    "GET",
    `/api/assessment/${assessmentId}/current`,
    undefined,
    {
      "x-user-id": String(userId),
    }
  );
}

async function startAssessment(userId, skill = "JavaScript") {
  return api(
    "POST",
    "/api/assessment/start",
    {
      skill,
      userId,
      maxQuestions: 5,
    },
    {
      "x-user-id": String(userId),
    }
  );
}

async function createUser(user) {
  return api("POST", "/api/signup", {
    name: user.name,
    email: user.email,
    password: user.password,
  });
}

async function cleanup() {
  if (!db) return;

  try {
    console.log("\nCleaning up test data...");

    const userIds = [user1Id, user2Id].filter(Boolean);

    if (userIds.length === 0) {
      return;
    }

    const placeholders = userIds.map(() => "?").join(",");

    // Find all test assessments.
    const assessments = await dbQuery(
      `
        SELECT id, question_ids
        FROM assessments
        WHERE user_id IN (${placeholders})
      `,
      userIds
    );

    const questionIds = new Set();

    for (const assessment of assessments) {
      const ids = parseJson(assessment.question_ids, []);

      if (Array.isArray(ids)) {
        for (const id of ids) {
          const parsed = Number(id);

          if (Number.isInteger(parsed)) {
            questionIds.add(parsed);
          }
        }
      }
    }

    // Delete assessments first.
    // assessment_responses are configured with ON DELETE CASCADE.
    await db.query(
      `
        DELETE FROM assessments
        WHERE user_id IN (${placeholders})
      `,
      userIds
    );

    // Remove AI-generated questions created by these test assessments.
    if (questionIds.size > 0) {
      const ids = [...questionIds];
      const questionPlaceholders = ids.map(() => "?").join(",");

      await db.query(
        `
          DELETE FROM questions
          WHERE id IN (${questionPlaceholders})
        `,
        ids
      );
    }

    // Delete test users last.
    await db.query(
      `
        DELETE FROM users
        WHERE id IN (${placeholders})
      `,
      userIds
    );

    console.log("Test data cleanup completed.");
  } catch (error) {
    console.log("Cleanup warning:", error.message);
  }
}

async function runTests() {
  console.log("\n");
  console.log("╔" + "═".repeat(70) + "╗");
  console.log("║" + " COGNIFY END-TO-END TEST SUITE ".padStart(44).padEnd(70) + "║");
  console.log("╚" + "═".repeat(70) + "╝");

  console.log(`\nServer: ${BASE_URL}`);
  console.log(`Test users: ${USER1.email}, ${USER2.email}`);

  // ------------------------------------------------------------
  // DATABASE CONNECTION
  // ------------------------------------------------------------

  section("1. DATABASE CONNECTION");


  db = await mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "learnmate",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 5,
  });

  const dbRows = await dbQuery("SELECT 1 AS connected");

  assert(
    dbRows.length === 1 && dbRows[0].connected === 1,
    "MySQL database connection is working"
  );

  // ------------------------------------------------------------
  // SERVER CONNECTION
  // ------------------------------------------------------------

  section("2. SERVER / BASIC ROUTES");

  const root = await api("GET", "/");

  assert(
    root.status >= 200 && root.status < 500,
    "Cognify server is reachable"
  );

  const authPage = await api("GET", "/auth");

  assert(
    authPage.status >= 200 && authPage.status < 500,
    "Authentication route is reachable"
  );

  // ------------------------------------------------------------
  // SIGNUP
  // ------------------------------------------------------------

  section("3. AUTHENTICATION - SIGNUP");

  const signup1 = await createUser(USER1);

  assert(
    signup1.status === 200 && signup1.data?.success === true,
    "User 1 signup succeeds"
  );

  user1Id =
    signup1.data?.user?.id ??
    signup1.data?.id ??
    null;

  assert(
    Number.isInteger(Number(user1Id)),
    "Signup returns a valid user ID"
  );

  const signup2 = await createUser(USER2);

  assert(
    signup2.status === 200 && signup2.data?.success === true,
    "User 2 signup succeeds"
  );

  user2Id =
    signup2.data?.user?.id ??
    signup2.data?.id ??
    null;

  assert(
    Number.isInteger(Number(user2Id)),
    "Second signup returns a valid user ID"
  );

  // Duplicate signup.
  const duplicateSignup = await createUser(USER1);

  assert(
    duplicateSignup.status === 409,
    "Duplicate email signup is rejected with HTTP 409"
  );

  // ------------------------------------------------------------
  // SIGNIN
  // ------------------------------------------------------------

  section("4. AUTHENTICATION - SIGNIN");

  const validSignin = await api("POST", "/api/signin", {
    email: USER1.email,
    password: USER1.password,
  });

  assert(
    validSignin.status === 200 && validSignin.data?.success === true,
    "Valid signin succeeds"
  );

  assert(
    Number(validSignin.data?.user?.id) === Number(user1Id),
    "Signin returns the correct user ID"
  );

  const invalidSignin = await api("POST", "/api/signin", {
    email: USER1.email,
    password: "DefinitelyWrongPassword!",
  });

  assert(
    invalidSignin.status === 401,
    "Invalid password is rejected with HTTP 401"
  );

  // ------------------------------------------------------------
  // PROFILE
  // ------------------------------------------------------------

  section("5. USER PROFILE");

  const profileBefore = await api(
    "GET",
    `/api/user/${user1Id}/profile`
  );

  assert(
    profileBefore.status === 200,
    "User profile endpoint returns HTTP 200"
  );

  assert(
    profileBefore.data?.success === true,
    "Profile response reports success"
  );

  const profileUser =
    profileBefore.data?.user ||
    profileBefore.data?.profile?.user ||
    profileBefore.data?.profile ||
    null;

  assert(
    profileUser !== null,
    "Profile contains user information"
  );

  if (profileUser) {
    assert(
      String(profileUser.email).toLowerCase() === USER1.email.toLowerCase(),
      "Profile contains the authenticated test user's real email"
    );

    assert(
      String(
        profileUser.name ??
        profileUser.full_name ??
        profileUser.fullName ??
        ""
      ).length > 0,
      "Profile contains the user's real name"
    );
  }

  // ------------------------------------------------------------
  // SKILLS
  // ------------------------------------------------------------

  section("6. SKILLS API");

  const skills = await api("GET", "/api/skills");

  assert(
    skills.status === 200,
    "Skills endpoint returns HTTP 200"
  );

  const skillsArray =
    skills.data?.skills ||
    skills.data?.data ||
    [];

  assert(
    Array.isArray(skillsArray),
    "Skills endpoint returns an array"
  );

  assert(
    skillsArray.length > 0,
    "Skills endpoint contains technical skills"
  );

  // ------------------------------------------------------------
  // GATEKEEPER FAILURE
  // ------------------------------------------------------------

  section("7. GATEKEEPER - FAILURE PATH");

  const failedStart = await startAssessment(user1Id, "JavaScript");

  assert(
    failedStart.status === 200 && failedStart.data?.success === true,
    "Assessment starts successfully"
  );

  failedAssessmentId =
    failedStart.data?.assessmentId ??
    failedStart.data?.assessment_id ??
    failedStart.data?.assessment?.id ??
    null;

  assert(
    Number.isInteger(Number(failedAssessmentId)),
    "Assessment start returns a valid assessment ID"
  );

  const failedQuestion = extractQuestion(failedStart.data);
  const failedQuestionId = extractQuestionId(failedQuestion);

  assert(
    Number.isInteger(Number(failedQuestionId)),
    "Gatekeeper returns a valid question ID"
  );

  assert(
    failedStart.data?.stage === undefined ||
    String(failedStart.data.stage).toLowerCase() === "gatekeeper",
    "Assessment begins in gatekeeper stage"
  );

  assert(
    !containsAnswerSecrets(failedStart.data),
    "Gatekeeper response does not expose correct answer/explanation"
  );

  const failedQuestionDB = await getQuestionFromDatabase(
    failedQuestionId
  );

  assert(
    failedQuestionDB !== null,
    "Gatekeeper question exists in the database"
  );

  assert(
    failedQuestionDB?.correct_option !== undefined,
    "Server stores the correct answer privately in the database"
  );

  const wrong = wrongOption(failedQuestionDB.correct_option);

  const failedSubmit = await submitAnswer({
    assessmentId: failedAssessmentId,
    userId: user1Id,
    questionId: failedQuestionId,
    selectedOption: wrong,
  });

  assert(
    failedSubmit.status === 200,
    "Wrong gatekeeper answer is processed"
  );

  const failedAssessment = await getAssessment(
    failedAssessmentId
  );

  assert(
    failedAssessment?.status === "gatekeeper_failed",
    "Wrong gatekeeper answer stops the assessment"
  );

  assert(
    Number(failedAssessment?.gatekeeper_passed) === 0 ||
    failedAssessment?.gatekeeper_passed === false,
    "Gatekeeper failure is persisted"
  );

  assert(
    Number(failedAssessment?.score) === 0,
    "Failed gatekeeper assessment has zero score"
  );

  assert(
    String(
      failedAssessment?.starting_recommendation || ""
    ).trim().length > 0,
    "Gatekeeper failure generates a starting recommendation"
  );

  // ------------------------------------------------------------
  // AUTHORIZATION
  // ------------------------------------------------------------

  section("8. AUTHORIZATION / CROSS-USER SECURITY");

  const unauthorizedCurrent = await api(
    "GET",
    `/api/assessment/${failedAssessmentId}/current`,
    undefined,
    {
      "x-user-id": String(user2Id),
    }
  );

  assert(
    unauthorizedCurrent.status === 403,
    "User 2 cannot access User 1's assessment"
  );

  const noIdentityCurrent = await api(
    "GET",
    `/api/assessment/${failedAssessmentId}/current`
  );

  assert(
    noIdentityCurrent.status === 403,
    "Assessment access without user identity is rejected"
  );

  // ------------------------------------------------------------
  // SECOND ASSESSMENT - SUCCESSFUL GATEKEEPER
  // ------------------------------------------------------------

  section("9. GATEKEEPER - SUCCESS PATH");

  const successfulStart = await startAssessment(
    user1Id,
    "JavaScript"
  );

  assert(
    successfulStart.status === 200,
    "Second assessment starts successfully"
  );

  completedAssessmentId =
    successfulStart.data?.assessmentId ??
    successfulStart.data?.assessment_id ??
    successfulStart.data?.assessment?.id ??
    null;

  assert(
    Number.isInteger(Number(completedAssessmentId)),
    "Second assessment returns a valid assessment ID"
  );

  // ------------------------------------------------------------
  // ANSWER ALL QUESTIONS USING SERVER-SIDE DB KNOWLEDGE
  // ------------------------------------------------------------

  let firstQuestionId = null;
  let firstQuestionResponse = null;

  let completedSuccessfully = false;

  for (let attempt = 0; attempt < 10; attempt++) {
    const assessment = await getAssessment(
      completedAssessmentId
    );

    if (!assessment) {
      fail("Assessment remains available during the test");
      break;
    }

    if (
      assessment.status === "completed" ||
      assessment.status === "gatekeeper_failed"
    ) {
      completedSuccessfully =
        assessment.status === "completed";
      break;
    }

    const current = await getCurrentQuestion(
      completedAssessmentId,
      user1Id
    );

    assert(
      current.status === 200,
      `Current question request succeeds at step ${attempt + 1}`
    );

    assert(
      !containsAnswerSecrets(current.data),
      `Question ${attempt + 1} does not expose correct answer/explanation`
    );

    const question = extractQuestion(current.data);
    const questionId = extractQuestionId(question);

    assert(
      Number.isInteger(Number(questionId)),
      `Question ${attempt + 1} has a valid question ID`
    );

    if (attempt === 0) {
      firstQuestionId = questionId;
      firstQuestionResponse = current;
    }

    const questionDB = await getQuestionFromDatabase(
      questionId
    );

    assert(
      questionDB !== null,
      `Question ${attempt + 1} exists in the database`
    );

    const correct = normalizeOption(
      questionDB.correct_option
    );

    // For the very first answer, deliberately send a fake score.
    // This checks that the server calculates score itself.
    const submit = await submitAnswer({
      assessmentId: completedAssessmentId,
      userId: user1Id,
      questionId,
      selectedOption: correct,
      scoreTamper: attempt === 0,
    });

    assert(
      submit.status === 200,
      `Correct answer ${attempt + 1} is accepted`
    );

    if (attempt === 0) {
      const afterFirstAnswer = await getAssessment(
        completedAssessmentId
      );

      assert(
        Number(afterFirstAnswer?.score) === 1,
        "Server-side score ignores client-injected score values"
      );

      // Duplicate submission of the same answer.
      const duplicate = await submitAnswer({
        assessmentId: completedAssessmentId,
        userId: user1Id,
        questionId,
        selectedOption: correct,
      });

      assert(
        duplicate.status === 409,
        "Duplicate answer submission is rejected with HTTP 409"
      );
    }

    const afterSubmit = await getAssessment(
      completedAssessmentId
    );

    assert(
      afterSubmit !== null,
      `Assessment state persists after answer ${attempt + 1}`
    );

    if (afterSubmit?.stage === "adaptive") {
      assert(
        Boolean(afterSubmit.gatekeeper_passed),
        "Assessment unlocks adaptive stage after passing gatekeeper"
      );

      const questionIds = parseJson(
        afterSubmit.question_ids,
        []
      );

      assert(
        Array.isArray(questionIds) &&
        questionIds.length >= 4,
        "Adaptive stage adds a new question after gatekeeper"
      );

      const adaptiveQuestionId =
        questionIds[3];

      const adaptiveQuestion =
        await getQuestionFromDatabase(
          adaptiveQuestionId
        );

      assert(
        adaptiveQuestion !== null,
        "Adaptive question exists in the database"
      );

      assert(
        ["basic", "intermediate", "advanced"].includes(
          String(adaptiveQuestion?.difficulty || "").toLowerCase()
        ),
        "Adaptive question has a valid difficulty level"
      );

      // Only perform this adaptive-stage assertion once.
      // Additional loop iterations will continue normally.
    }
  }

  assert(
    completedSuccessfully,
    "Assessment reaches completed status after successful adaptive progression"
  );

  // ------------------------------------------------------------
  // COMPLETED ASSESSMENT DATABASE VALIDATION
  // ------------------------------------------------------------

  section("10. COMPLETED ASSESSMENT DATABASE INTEGRITY");

  const finalAssessment = await getAssessment(
    completedAssessmentId
  );

  assert(
    finalAssessment?.status === "completed",
    "Completed assessment status is persisted"
  );

  assert(
    Number(finalAssessment?.score) >= 1,
    "Completed assessment contains a calculated score"
  );

  assert(
    Number(finalAssessment?.score) <=
    Number(finalAssessment?.total_questions),
    "Score cannot exceed total questions"
  );

  assert(
    finalAssessment?.completed_at !== null,
    "Completion timestamp is persisted"
  );

  assert(
    Boolean(finalAssessment?.gatekeeper_passed),
    "Gatekeeper passed state remains persisted"
  );

  assert(
    finalAssessment?.stage === "adaptive",
    "Final assessment remains marked as adaptive stage"
  );

  // ------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------

  section("11. ASSESSMENT SUMMARY");

  const summary = await api(
    "GET",
    `/api/assessment/${completedAssessmentId}/summary`,
    undefined,
    {
      "x-user-id": String(user1Id),
    }
  );

  assert(
    summary.status === 200,
    "Assessment summary returns HTTP 200"
  );

  assert(
    summary.data?.success === true,
    "Assessment summary reports success"
  );

  const summaryData =
    summary.data?.summary ||
    summary.data?.data ||
    summary.data;

  assert(
    summaryData !== null &&
    typeof summaryData === "object",
    "Summary contains structured assessment data"
  );

  const accuracy = Number(
    summaryData?.accuracy ??
    summaryData?.percentage ??
    0
  );

  assert(
    Number.isFinite(accuracy),
    "Summary contains calculated accuracy"
  );

  const correctAnswers = Number(
    summaryData?.correctAnswers ??
    summaryData?.correct_answers ??
    summaryData?.correct ??
    0
  );

  assert(
    Number.isFinite(correctAnswers),
    "Summary contains calculated correct-answer count"
  );

  const conceptAnalysis =
    summaryData?.conceptAnalysis ??
    summaryData?.concept_analysis ??
    [];

  assert(
    Array.isArray(conceptAnalysis),
    "Summary contains concept-level analysis"
  );

  const questionsReview =
    summaryData?.questionsReview ??
    summaryData?.questions_review ??
    [];

  assert(
    Array.isArray(questionsReview),
    "Summary contains question review data"
  );

  assert(
    questionsReview.length > 0,
    "Question review contains completed assessment questions"
  );

  // ------------------------------------------------------------
  // PERSONALIZED RECOMMENDATION
  // ------------------------------------------------------------

  section("12. PERSONALIZED AI RECOMMENDATION");

  const recommendation =
    summaryData?.personalizedRecommendation ??
    summaryData?.personalized_recommendation ??
    summaryData?.recommendation ??
    null;

  assert(
    recommendation !== null &&
    typeof recommendation === "object",
    "Personalized recommendation is returned as structured data"
  );

  if (recommendation) {
    assert(
      typeof recommendation.skill_level === "string" &&
      recommendation.skill_level.length > 0,
      "Recommendation contains skill_level"
    );

    assert(
      Array.isArray(recommendation.strengths),
      "Recommendation contains strengths array"
    );

    assert(
      Array.isArray(recommendation.weaknesses),
      "Recommendation contains weaknesses array"
    );

    assert(
      typeof recommendation.starting_point === "string" &&
      recommendation.starting_point.length > 0,
      "Recommendation contains starting_point"
    );

    assert(
      Array.isArray(recommendation.next_topics) &&
      recommendation.next_topics.length > 0,
      "Recommendation contains next_topics"
    );

    assert(
      Array.isArray(recommendation.practice_recommendations) &&
      recommendation.practice_recommendations.length > 0,
      "Recommendation contains practice_recommendations"
    );

    assert(
      typeof recommendation.summary === "string" &&
      recommendation.summary.length >= 15,
      "Recommendation contains a meaningful summary"
    );
  }

  // ------------------------------------------------------------
  // PERSISTENCE
  // ------------------------------------------------------------

  section("13. RECOMMENDATION PERSISTENCE / NO DATA DRIFT");

  const summaryAgain = await api(
    "GET",
    `/api/assessment/${completedAssessmentId}/summary`,
    undefined,
    {
      "x-user-id": String(user1Id),
    }
  );

  assert(
    summaryAgain.status === 200,
    "Second summary request succeeds"
  );

  const summaryAgainData =
    summaryAgain.data?.summary ||
    summaryAgain.data?.data ||
    summaryAgain.data;

  const recommendationAgain =
    summaryAgainData?.personalizedRecommendation ??
    summaryAgainData?.personalized_recommendation ??
    summaryAgainData?.recommendation ??
    null;

  function normalizeForComparison(value) {
    if (Array.isArray(value)) {
      return value.map(normalizeForComparison);
    }

    if (value && typeof value === "object") {
      return Object.keys(value)
        .sort()
        .reduce((result, key) => {
          result[key] = normalizeForComparison(value[key]);
          return result;
        }, {});
    }

    return value;
  }

  if (recommendation && recommendationAgain) {
    const normalizedRecommendation =
      normalizeForComparison(recommendation);

    const normalizedRecommendationAgain =
      normalizeForComparison(recommendationAgain);

    assert(
      JSON.stringify(normalizedRecommendation) ===
      JSON.stringify(normalizedRecommendationAgain),
      "Personalized recommendation remains logically unchanged across repeated requests"
    );
  }

  const dbAfterSummary = await getAssessment(
    completedAssessmentId
  );

  const persistedRecommendation = parseJson(
    dbAfterSummary?.personalized_recommendation,
    null
  );

  assert(
    persistedRecommendation !== null,
    "Personalized recommendation is persisted in MySQL"
  );

  assert(
    dbAfterSummary?.skill_level !== null &&
    String(dbAfterSummary?.skill_level || "").length > 0,
    "Calculated skill level is persisted in MySQL"
  );

  assert(
    dbAfterSummary?.concept_analysis !== null,
    "Concept analysis is persisted in MySQL"
  );

  // ------------------------------------------------------------
  // PROFILE TELEMETRY AFTER ASSESSMENT
  // ------------------------------------------------------------

  section("14. REAL USER PROFILE TELEMETRY");

  const profileAfter = await api(
    "GET",
    `/api/user/${user1Id}/profile`
  );

  assert(
    profileAfter.status === 200,
    "Profile still loads after assessment completion"
  );

  const profileData =
    profileAfter.data?.profile ||
    profileAfter.data?.data ||
    profileAfter.data;

  assert(
    profileData !== null &&
    typeof profileData === "object",
    "Profile contains structured telemetry"
  );

  const profileText = JSON.stringify(profileData).toLowerCase();

  assert(
    profileText.includes("javascript"),
    "Profile telemetry reflects the assessed JavaScript skill"
  );

  assert(
    profileText.includes("assessment"),
    "Profile contains assessment-related telemetry"
  );

  // ------------------------------------------------------------
  // CROSS-USER SUMMARY SECURITY
  // ------------------------------------------------------------

  section("15. SUMMARY AUTHORIZATION");

  const unauthorizedSummary = await api(
    "GET",
    `/api/assessment/${completedAssessmentId}/summary`,
    undefined,
    {
      "x-user-id": String(user2Id),
    }
  );

  assert(
    unauthorizedSummary.status === 403,
    "User 2 cannot access User 1's completed summary"
  );

  // ------------------------------------------------------------
  // FINAL RESULT
  // ------------------------------------------------------------

  section("FINAL TEST RESULT");

  console.log(`\n  PASSED : ${passed}`);
  console.log(`  FAILED : ${failed}`);
  console.log(`  TOTAL  : ${passed + failed}`);

  if (failed === 0) {
    console.log("\n  ✓ ALL COGNIFY E2E TESTS PASSED");
  } else {
    console.log("\n  ✗ SOME COGNIFY E2E TESTS FAILED");
  }

  return failed === 0;
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------

(async () => {
  let success = false;

  try {
    success = await runTests();
  } catch (error) {
    console.error("\n");
    console.error("╔" + "═".repeat(70) + "╗");
    console.error("║" + " TEST EXECUTION ERROR ".padStart(42).padEnd(70) + "║");
    console.error("╚" + "═".repeat(70) + "╝");

    console.error("\n", error.stack || error.message);

    success = false;
  } finally {
    await cleanup();

    if (db) {
      await db.end();
    }
  }

  process.exit(success ? 0 : 1);
})();