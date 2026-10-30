const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'learnmate',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

const questionsCatalog = [
  // --- PYTHON ---
  ['Python', 'What is the correct file extension for Python files?', '.pt', '.py', '.pyt', '.python', 'b', 'Python source code files conventionally end with the .py extension.'],
  ['Python', 'Which keyword is used to define a function in Python?', 'function', 'def', 'func', 'define', 'b', 'In Python, the def keyword is used to declare and define a function.'],
  ['Python', 'Which of the following data structures in Python is immutable?', 'List', 'Dictionary', 'Set', 'Tuple', 'd', 'Tuples are immutable sequence types whose elements cannot be modified after creation.'],

  // --- JAVASCRIPT ---
  ['JavaScript', 'Which keyword declares a block-scoped variable in modern JavaScript?', 'var', 'let', 'set', 'define', 'b', 'let and const declare block-scoped variables in modern JavaScript (ES6+).'],
  ['JavaScript', 'What does the strict equality operator (===) check in JavaScript?', 'Value only', 'Type only', 'Both value and type without coercion', 'Memory reference only', 'c', 'The strict equality operator (===) checks both value and type without type coercion.'],
  ['JavaScript', 'Which method appends one or more elements to the end of an array in JavaScript?', 'push()', 'append()', 'insert()', 'pop()', 'a', 'push() appends elements to the end of an array and returns the new length.'],

  // --- SQL ---
  ['SQL', 'Which statement is used to query and retrieve data from a database in SQL?', 'GET', 'FETCH', 'SELECT', 'EXTRACT', 'c', 'The SELECT statement is used to retrieve data records from one or more tables.'],
  ['SQL', 'Which SQL clause is used to filter records based on a specified condition?', 'ORDER BY', 'WHERE', 'GROUP BY', 'HAVING', 'b', 'The WHERE clause filters rows before any grouping occurs.'],
  ['SQL', 'Which SQL clause is used to sort the retrieved results in ascending or descending order?', 'ORDER BY', 'SORT BY', 'ARRANGE BY', 'GROUP BY', 'a', 'ORDER BY sorts query results in ASC or DESC sequence.'],

  // --- HTML/CSS ---
  ['HTML/CSS', 'Which HTML element represents the top-level heading on a webpage?', '<heading>', '<h6>', '<head>', '<h1>', 'd', 'The <h1> element represents the highest rank heading in HTML.'],
  ['HTML/CSS', 'Which CSS display property creates a two-dimensional grid layout?', 'display: grid', 'layout: table', 'float: center', 'align: matrix', 'a', 'display: grid initializes a two-dimensional grid formatting context.'],
  ['HTML/CSS', 'Which CSS box-model property creates spacing outside the element border?', 'padding', 'margin', 'outline', 'spacing', 'b', 'Margin provides spacing outside the border of an element.'],

  // --- C++ ---
  ['C++', 'Which operator is used to allocate memory dynamically on the heap in C++?', 'malloc', 'alloc', 'new', 'create', 'c', 'In C++, the new operator dynamically allocates memory on the heap and calls constructors.'],
  ['C++', 'Which feature in C++ allows functions or classes to operate with generic data types?', 'Inheritance', 'Templates', 'Polymorphism', 'Encapsulation', 'b', 'Templates enable generic programming in C++ by allowing types to be specified as parameters.'],
  ['C++', 'What is the minimum size of an empty class in C++ according to the ISO standard?', '0 bytes', 'At least 1 byte', '4 bytes', '8 bytes', 'b', 'An empty class has a size of at least 1 byte to ensure that two distinct objects have unique memory addresses.'],

  // --- JAVA ---
  ['Java', 'Which keyword is used to prevent a method from being overridden in Java?', 'static', 'final', 'abstract', 'const', 'b', 'Marking a method as final prevents subclasses from overriding it.'],
  ['Java', 'What is the root superclass of every class in the Java language?', 'java.lang.Class', 'java.lang.System', 'java.lang.Object', 'java.lang.Root', 'c', 'java.lang.Object is the ultimate ancestor class for all Java classes.'],
  ['Java', 'Which Java collection class preserves elements in their insertion order?', 'HashSet', 'TreeSet', 'LinkedHashSet', 'PriorityQueue', 'c', 'LinkedHashSet maintains a doubly-linked running list through its elements to preserve insertion order.'],

  // --- NODE.JS ---
  ['Node.js', 'Which JavaScript engine powers execution inside Node.js?', 'SpiderMonkey', 'JavaScriptCore', 'V8', 'Chakra', 'c', 'Node.js runs on Google Chrome’s open-source V8 JavaScript engine.'],
  ['Node.js', 'Which built-in core module is used for reading and writing files in Node.js?', 'path', 'fs', 'http', 'os', 'b', 'The fs (File System) module provides APIs for interacting with the file system.'],
  ['Node.js', 'What underlying library handles asynchronous non-blocking I/O in Node.js?', 'libuv', 'npm', 'Babel', 'Webpack', 'a', 'libuv is the multi-platform C library that powers Node.js asynchronous event-driven I/O.'],

  // --- PYTHON DJANGO ---
  ['Python Django', 'Which architectural design pattern does Django primarily follow?', 'MVC (Model-View-Controller)', 'MVT (Model-View-Template)', 'MVVM (Model-View-ViewModel)', 'Microservices', 'b', 'Django follows the MVT pattern, where Django itself acts as the controller.'],
  ['Python Django', 'Which CLI command creates new migration files from detected model changes in Django?', 'python manage.py migrate', 'python manage.py makemigrations', 'python manage.py sqlmigrate', 'python manage.py inspectdb', 'b', 'makemigrations inspects models and packages changes into migration scripts.'],
  ['Python Django', 'Which file in a Django project stores database connections, installed apps, and middleware configuration?', 'urls.py', 'wsgi.py', 'settings.py', 'models.py', 'c', 'settings.py is the central configuration file for a Django project.'],

  // --- BASIC AI ---
  ['Basic AI', 'Which search algorithm always finds the shortest path in an unweighted graph?', 'Depth-First Search (DFS)', 'Breadth-First Search (BFS)', 'Linear Search', 'Depth-Limited Search', 'b', 'Breadth-First Search (BFS) explores all neighbors level by level, ensuring the shortest path in unweighted graphs.'],
  ['Basic AI', 'In heuristic search algorithms like A*, what does the heuristic function h(n) estimate?', 'The exact cost from the start node', 'The estimated cost from current node n to the goal', 'The number of expanded nodes', 'The branching factor', 'b', 'A heuristic function h(n) estimates the remaining cost to reach the goal state from node n.'],
  ['Basic AI', 'What was the Turing Test proposed to evaluate in an artificial system?', 'Computer memory and throughput', 'Whether a computer can exhibit human-indistinguishable intelligence', 'Network security', 'Graphics rendering speed', 'b', 'Alan Turing designed the Turing Test to assess whether a machine could exhibit intelligent behavior indistinguishable from a human.'],

  // --- MACHINE LEARNING ---
  ['Machine Learning', 'Which paradigm of machine learning trains models using labeled input-output pairs?', 'Unsupervised Learning', 'Supervised Learning', 'Reinforcement Learning', 'Self-Organizing Maps', 'b', 'Supervised learning algorithms learn mapping functions from labeled training data.'],
  ['Machine Learning', 'What describes overfitting in machine learning?', 'Poor performance on both train and test data', 'Strong performance on training data but poor generalization to unseen test data', 'Training faster than expected', 'The learning rate is too low', 'b', 'Overfitting occurs when a model captures noise and idiosyncrasies of training data instead of general patterns.'],
  ['Machine Learning', 'Which evaluation metric is best suited for assessing binary classifiers on heavily imbalanced datasets?', 'Accuracy', 'F1-Score', 'Mean Absolute Error', 'R-squared', 'b', 'F1-score computes the harmonic mean of precision and recall, balancing false positives and false negatives.'],

  // --- ADVANCED AI ---
  ['Advanced AI', 'What core attention mechanism enables Transformer architectures to process entire sequences concurrently?', 'Recurrent cell gating', 'Self-Attention (Scaled Dot-Product)', 'Convolutional pooling', 'Dense feedforward routing', 'b', 'Self-attention computes dynamic weights across all token pairs in parallel, capturing long-range context.'],
  ['Advanced AI', 'In Reinforcement Learning, what dilemma describes balancing maximizing known rewards versus finding new actions?', 'Bias vs. Variance', 'Exploration vs. Exploitation', 'Precision vs. Recall', 'Underfitting vs. Overfitting', 'b', 'The exploration-exploitation trade-off balances gathering new information against exploiting known high-reward choices.'],
  ['Advanced AI', 'Which technique aligns Large Language Models with human preference rankings?', 'TF-IDF Regularization', 'RLHF (Reinforcement Learning from Human Feedback)', 'K-Means Quantization', 'Principal Component Alignment', 'b', 'RLHF trains a reward model based on human rankings to fine-tune model generation policies.'],

  // --- DEEP LEARNING ---
  ['Deep Learning', 'Which activation function defined as f(x) = max(0, x) helps mitigate vanishing gradients in deep networks?', 'Sigmoid', 'Tanh', 'ReLU (Rectified Linear Unit)', 'LeakyReLU(0)', 'c', 'ReLU returns x for x > 0 and 0 otherwise, providing constant gradient for positive activations.'],
  ['Deep Learning', 'Which neural network layer is specifically engineered to extract spatial features from images?', 'Recurrent Layer', 'Convolutional Layer (Conv2D)', 'Embedding Layer', 'Dense Linear Layer', 'b', 'Convolutional layers apply localized kernels across receptive fields to detect hierarchical spatial patterns.'],
  ['Deep Learning', 'What regularization technique randomly sets a fraction of neuron outputs to zero during training?', 'Batch Normalization', 'Dropout', 'Weight Decay', 'Gradient Clipping', 'b', 'Dropout prevents co-adaptation of neurons by randomly setting a subset of activations to zero during training.'],

  // --- PROBLEM SOLVING ---
  ['Problem Solving', 'What is the worst-case time complexity of Binary Search on a sorted array of n elements?', 'O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'b', 'Binary search divides the search space in half each step, yielding logarithmic O(log n) time complexity.'],
  ['Problem Solving', 'Which algorithm technique solves problems with optimal substructure and overlapping subproblems using memoization or tabulation?', 'Greedy Approach', 'Divide and Conquer', 'Dynamic Programming', 'Brute Force', 'c', 'Dynamic Programming avoids redundant computations by caching solutions to overlapping subproblems.'],
  ['Problem Solving', 'Which data structure follows Last-In, First-Out (LIFO) and is ideal for matching brackets and evaluating postfix expressions?', 'Queue', 'Stack', 'Heap', 'Linked List', 'b', 'A Stack operates on LIFO order, making it the ideal structure for syntax parsing, parentheses matching, and expression evaluation.'],

  // --- PATTERN RECOGNITION ---
  ['Pattern Recognition', 'Which clustering algorithm partitions observations into k clusters by iteratively updating centroids?', 'K-Nearest Neighbors (KNN)', 'K-Means Clustering', 'Random Forest', 'Naive Bayes', 'b', 'K-Means groups data into k clusters by assigning samples to the nearest centroid and recomputing centroids.'],
  ['Pattern Recognition', 'What is the primary objective of Principal Component Analysis (PCA)?', 'Supervised classification', 'Dimensionality reduction while maximizing variance retention', 'Generating pseudo-random samples', 'Training recurrent networks', 'b', 'PCA projects high-dimensional data onto orthogonal axes that maximize variance, reducing dimensionality.'],
  ['Pattern Recognition', 'What phenomenon in pattern recognition describes exponential sparsity of data points as the number of features grows?', 'The Central Limit Theorem', 'The Curse of Dimensionality', 'The Law of Large Numbers', 'Bayesian Drift', 'b', 'The Curse of Dimensionality describes how space volume grows exponentially with dimensions, causing data to become sparse.']
];

async function initDatabase() {
  const connection = await pool.getConnection();
  try {
    // 1. users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. questions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        skill VARCHAR(50) NOT NULL,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_option VARCHAR(10) NOT NULL,
        explanation TEXT,
        concept VARCHAR(100) DEFAULT 'General',
        difficulty VARCHAR(50) DEFAULT 'basic',
        is_ai_generated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure columns exist on existing table
    const [cols] = await connection.query('DESCRIBE questions');
    const existingCols = new Set(cols.map((c) => c.Field));
    if (!existingCols.has('concept')) {
      await connection.query('ALTER TABLE questions ADD COLUMN concept VARCHAR(100) DEFAULT "General"');
    }
    if (!existingCols.has('difficulty')) {
      await connection.query('ALTER TABLE questions ADD COLUMN difficulty VARCHAR(50) DEFAULT "basic"');
    }
    if (!existingCols.has('is_ai_generated')) {
      await connection.query('ALTER TABLE questions ADD COLUMN is_ai_generated BOOLEAN DEFAULT FALSE');
    }

    // 3. assessments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        skill VARCHAR(50) NOT NULL,
        total_questions INT NOT NULL DEFAULT 3,
        current_question_index INT NOT NULL DEFAULT 0,
        score INT NOT NULL DEFAULT 0,
        status VARCHAR(50) DEFAULT 'in_progress',
        stage VARCHAR(50) DEFAULT 'gatekeeper',
        max_questions INT DEFAULT 10,
        gatekeeper_passed BOOLEAN DEFAULT FALSE,
        stopped_reason VARCHAR(255) NULL,
        starting_recommendation TEXT NULL,
        adaptive_history JSON NULL,
        question_ids JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Ensure columns exist on existing assessments table
    const [assCols] = await connection.query('DESCRIBE assessments');
    const existingAssCols = new Set(assCols.map((c) => c.Field));

    // Modify status from enum to VARCHAR(50) to support 'gatekeeper_failed'
    await connection.query('ALTER TABLE assessments MODIFY COLUMN status VARCHAR(50) DEFAULT "in_progress"');

    if (!existingAssCols.has('stage')) {
      await connection.query('ALTER TABLE assessments ADD COLUMN stage VARCHAR(50) DEFAULT "gatekeeper"');
    }
    if (!existingAssCols.has('max_questions')) {
      await connection.query('ALTER TABLE assessments ADD COLUMN max_questions INT DEFAULT 10');
    }
    if (!existingAssCols.has('gatekeeper_passed')) {
      await connection.query('ALTER TABLE assessments ADD COLUMN gatekeeper_passed BOOLEAN DEFAULT FALSE');
    }
    if (!existingAssCols.has('stopped_reason')) {
      await connection.query('ALTER TABLE assessments ADD COLUMN stopped_reason VARCHAR(255) NULL');
    }
    if (!existingAssCols.has('starting_recommendation')) {
      await connection.query('ALTER TABLE assessments ADD COLUMN starting_recommendation TEXT NULL');
    }
    if (!existingAssCols.has('adaptive_history')) {
      await connection.query('ALTER TABLE assessments ADD COLUMN adaptive_history JSON NULL');
    }
    if (!existingAssCols.has('skill_level')) {
      await connection.query('ALTER TABLE assessments ADD COLUMN skill_level VARCHAR(50) NULL');
    }
    if (!existingAssCols.has('concept_analysis')) {
      await connection.query('ALTER TABLE assessments ADD COLUMN concept_analysis JSON NULL');
    }
    if (!existingAssCols.has('personalized_recommendation')) {
      await connection.query('ALTER TABLE assessments ADD COLUMN personalized_recommendation JSON NULL');
    }

    // 4. assessment_responses table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS assessment_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assessment_id INT NOT NULL,
        question_id INT NOT NULL,
        question_order INT NOT NULL,
        selected_option VARCHAR(10) NULL,
        is_correct BOOLEAN NOT NULL DEFAULT FALSE,
        time_taken_seconds INT NULL,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )
    `);

    // Check existing skills in questions table to seed missing ones
    const [existingRows] = await connection.query('SELECT DISTINCT skill FROM questions');
    const existingSkills = new Set(existingRows.map((r) => r.skill));

    let seededCount = 0;
    for (const q of questionsCatalog) {
      if (!existingSkills.has(q[0])) {
        await connection.query(
          'INSERT INTO questions (skill, question_text, option_a, option_b, option_c, option_d, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          q
        );
        seededCount++;
      }
    }

    if (seededCount > 0) {
      console.log(`Successfully seeded ${seededCount} new questions into the database.`);
    }
  } catch (error) {
    console.error('Error during initDatabase:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  initDatabase,
};
