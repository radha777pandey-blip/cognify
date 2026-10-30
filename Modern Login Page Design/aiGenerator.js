// Cognify Phase 3 - AI Question Generator & Adaptive Engine
// Supports 3-Question Gatekeeper, Dynamic Single-Question Generation, Concept-Wise Adaptation, and De-duplication

const dotenv = require('dotenv');
dotenv.config();

/**
 * Validates a structured JSON response for 3 gatekeeper questions
 */
function validateQuestionsResponse(data, skill) {
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: 'Root output is not a JSON object.' };
  }

  if (!Array.isArray(data.questions)) {
    return { valid: false, reason: 'Missing "questions" array in response.' };
  }

  if (data.questions.length !== 3) {
    return {
      valid: false,
      reason: `Expected exactly 3 questions, got ${data.questions.length}.`,
    };
  }

  for (let i = 0; i < data.questions.length; i++) {
    const qVal = validateSingleQuestion(data.questions[i], i + 1);
    if (!qVal.valid) return qVal;
  }

  return { valid: true };
}

/**
 * Validates a single question structure
 */
function validateSingleQuestion(q, qNum = 1) {
  if (!q || typeof q !== 'object') {
    return { valid: false, reason: `Question #${qNum} is not an object.` };
  }

  if (typeof q.question !== 'string' || q.question.trim().length < 8) {
    return {
      valid: false,
      reason: `Question #${qNum} has an invalid or too short question prompt.`,
    };
  }

  if (!q.options || typeof q.options !== 'object') {
    return { valid: false, reason: `Question #${qNum} is missing an options object.` };
  }

  const optKeys = Object.keys(q.options).map((k) => k.toUpperCase().trim());
  const hasA = optKeys.includes('A');
  const hasB = optKeys.includes('B');
  const hasC = optKeys.includes('C');
  const hasD = optKeys.includes('D');

  if (!hasA || !hasB || !hasC || !hasD) {
    return {
      valid: false,
      reason: `Question #${qNum} does not contain all 4 required options (A, B, C, D).`,
    };
  }

  const textA = String(q.options.A || q.options.a || '').trim();
  const textB = String(q.options.B || q.options.b || '').trim();
  const textC = String(q.options.C || q.options.c || '').trim();
  const textD = String(q.options.D || q.options.d || '').trim();

  if (!textA || !textB || !textC || !textD) {
    return {
      valid: false,
      reason: `Question #${qNum} contains one or more empty option choices.`,
    };
  }

  const uniqueOptions = new Set([textA, textB, textC, textD]);
  if (uniqueOptions.size < 4) {
    return {
      valid: false,
      reason: `Question #${qNum} contains duplicate option values.`,
    };
  }

  if (typeof q.correct_answer !== 'string') {
    return {
      valid: false,
      reason: `Question #${qNum} has an invalid or missing correct_answer.`,
    };
  }

  const normalizedCorrect = q.correct_answer.toUpperCase().trim();
  if (!['A', 'B', 'C', 'D'].includes(normalizedCorrect)) {
    return {
      valid: false,
      reason: `Question #${qNum} correct_answer "${q.correct_answer}" is not one of [A, B, C, D].`,
    };
  }

  if (typeof q.explanation !== 'string' || q.explanation.trim().length < 5) {
    return {
      valid: false,
      reason: `Question #${qNum} is missing a descriptive explanation.`,
    };
  }

  if (typeof q.concept !== 'string' || q.concept.trim().length === 0) {
    return {
      valid: false,
      reason: `Question #${qNum} is missing a concept identifier.`,
    };
  }

  const diff = String(q.difficulty || '').toLowerCase().trim();
  if (!['basic', 'intermediate', 'advanced'].includes(diff)) {
    q.difficulty = 'basic';
  }

  return { valid: true };
}

/**
 * Normalizes question object into standard application format
 */
function normalizeQuestion(q) {
  const normKey = (key) => q.options[key.toUpperCase()] || q.options[key.toLowerCase()] || '';
  const diff = String(q.difficulty || 'basic').toLowerCase().trim();
  const validDiff = ['basic', 'intermediate', 'advanced'].includes(diff) ? diff : 'basic';

  return {
    questionText: q.question.trim(),
    options: {
      a: normKey('A').trim(),
      b: normKey('B').trim(),
      c: normKey('C').trim(),
      d: normKey('D').trim(),
    },
    correctOption: q.correct_answer.toLowerCase().trim(),
    explanation: q.explanation.trim(),
    concept: (q.concept || 'General').trim(),
    difficulty: validDiff,
    adaptiveReasoning: q.adaptive_reasoning || null,
  };
}

/**
 * Checks whether a candidate question is substantially duplicated against past questions in the session
 */
function isQuestionDuplicated(candidateText, previousQuestionTexts = []) {
  if (!candidateText || !Array.isArray(previousQuestionTexts) || previousQuestionTexts.length === 0) {
    return false;
  }

  const clean = (str) =>
    String(str)
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const cleanCandidate = clean(candidateText);
  const candidateWords = new Set(cleanCandidate.split(' ').filter((w) => w.length > 2));

  for (const prev of previousQuestionTexts) {
    const cleanPrev = clean(prev);
    if (cleanCandidate === cleanPrev) return true;

    const prevWords = new Set(cleanPrev.split(' ').filter((w) => w.length > 2));
    if (candidateWords.size === 0 || prevWords.size === 0) continue;

    let overlap = 0;
    for (const word of candidateWords) {
      if (prevWords.has(word)) overlap++;
    }

    const similarity = overlap / Math.min(candidateWords.size, prevWords.size);
    if (similarity >= 0.75) return true;
  }

  return false;
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Curated Multi-Tier Question Banks (Basic, Intermediate, Advanced) across all 14 Skills
 */
const dynamicSkillPools = {
  Python: [
    // BASIC
    {
      question: 'What is the correct file extension for Python source files?',
      options: { A: '.pt', B: '.py', C: '.pyt', D: '.python' },
      correct_answer: 'B',
      explanation: 'Python files conventionally use the .py file extension.',
      concept: 'Syntax & Setup',
      difficulty: 'basic',
    },
    {
      question: 'Which reserved keyword is used to define a function in Python?',
      options: { A: 'function', B: 'def', C: 'func', D: 'define' },
      correct_answer: 'B',
      explanation: 'In Python, the def keyword begins a function definition.',
      concept: 'Functions',
      difficulty: 'basic',
    },
    {
      question: 'Which of the following data structures in Python is ordered and immutable?',
      options: { A: 'List', B: 'Dictionary', C: 'Set', D: 'Tuple' },
      correct_answer: 'D',
      explanation: 'Tuples are ordered and immutable collections in Python.',
      concept: 'Data Types',
      difficulty: 'basic',
    },
    {
      question: 'Which operator is used to calculate floor division in Python?',
      options: { A: '/', B: '//', C: '%', D: '**' },
      correct_answer: 'B',
      explanation: '// divides two numbers and rounds down to the nearest integer.',
      concept: 'Operators',
      difficulty: 'basic',
    },
    {
      question: 'How do you insert a single-line comment in Python code?',
      options: { A: '// comment', B: '# comment', C: '/* comment */', D: '<!-- comment -->' },
      correct_answer: 'B',
      explanation: 'The hash symbol (#) marks the remainder of the line as a comment in Python.',
      concept: 'Syntax & Setup',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What does the *args parameter allow in a Python function definition?',
      options: {
        A: 'Enforcing keyword-only arguments',
        B: 'Accepting an arbitrary number of positional arguments as a tuple',
        C: 'Multiplying the arguments by a scalar',
        D: 'Restricting arguments to integer types only',
      },
      correct_answer: 'B',
      explanation: '*args gathers remaining positional arguments into an immutable tuple.',
      concept: 'Functions',
      difficulty: 'intermediate',
    },
    {
      question: 'What is the primary difference between shallow copy and deep copy in Python?',
      options: {
        A: 'Shallow copy duplicates nested objects; deep copy copies top-level references only',
        B: 'Shallow copy duplicates the outer collection but references nested objects; deep copy recursively clones all nested objects',
        C: 'Deep copy converts lists into immutable tuples',
        D: 'Shallow copy only works on dictionary data structures',
      },
      correct_answer: 'B',
      explanation: 'copy.copy() creates a shallow container reference, whereas copy.deepcopy() recursively clones inner structures.',
      concept: 'Data Types',
      difficulty: 'intermediate',
    },
    {
      question: 'What does a generator function return when called in Python?',
      options: { A: 'A fully evaluated list', B: 'A generator iterator object', C: 'None', D: 'A dictionary of states' },
      correct_answer: 'B',
      explanation: 'A function containing yield returns a generator iterator that produces values on demand via next().',
      concept: 'Iteration & Generators',
      difficulty: 'intermediate',
    },
    {
      question: 'How does the "finally" block execute in a Python try-except-finally statement?',
      options: {
        A: 'Only if an exception was caught in the except block',
        B: 'Always, regardless of whether an exception occurred or was handled',
        C: 'Only when no exceptions were raised',
        D: 'Only if explicitly invoked by return',
      },
      correct_answer: 'B',
      explanation: 'The finally block executes unconditionally before the try-except statement completes.',
      concept: 'Error Handling',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'What is the purpose of functools.wraps in a custom Python decorator?',
      options: {
        A: 'To compile Python code to C bytecode',
        B: 'To preserve the original function metadata (__name__, __doc__, and signature)',
        C: 'To execute the function on multiple threads concurrently',
        D: 'To encrypt the decorated function body',
      },
      correct_answer: 'B',
      explanation: '@functools.wraps copies function attributes (__name__, __doc__) from the original function to the wrapper.',
      concept: 'Functions',
      difficulty: 'advanced',
    },
    {
      question: 'What does defining __slots__ in a Python class accomplish?',
      options: {
        A: 'Allows dynamic addition of arbitrary instance attributes at runtime',
        B: 'Prevents creation of the default __dict__ per instance, optimizing memory footprint',
        C: 'Forces all class methods to run asynchronously',
        D: 'Automatically serializes class instances to JSON',
      },
      correct_answer: 'B',
      explanation: '__slots__ reserves space for a declared set of attributes, eliminating __dict__ overhead and saving RAM.',
      concept: 'Memory & OOP',
      difficulty: 'advanced',
    },
    {
      question: 'What is the role of the Global Interpreter Lock (GIL) in CPython?',
      options: {
        A: 'Locks variables from being modified across functions',
        B: 'A mutex that prevents multiple native threads from executing CPython bytecodes concurrently',
        C: 'Secures network sockets from external access',
        D: 'Prevents recursion depth from exceeding 1000',
      },
      correct_answer: 'B',
      explanation: 'The CPython GIL ensures thread-safety by allowing only one native thread to execute Python bytecode at a time.',
      concept: 'Concurrency & GIL',
      difficulty: 'advanced',
    },
    {
      question: 'Which special dunder methods must an object implement to act as a Python context manager (with statement)?',
      options: {
        A: '__start__ and __stop__',
        B: '__enter__ and __exit__',
        C: '__open__ and __close__',
        D: '__init__ and __del__',
      },
      correct_answer: 'B',
      explanation: 'Context managers implement __enter__() for setup and __exit__() for cleanup/teardown.',
      concept: 'Context Managers',
      difficulty: 'advanced',
    },
  ],

  JavaScript: [
    // BASIC
    {
      question: 'Which keyword declares a block-scoped variable in modern JavaScript?',
      options: { A: 'var', B: 'let', C: 'set', D: 'define' },
      correct_answer: 'B',
      explanation: 'let and const declare block-scoped variables in modern JavaScript (ES6+).',
      concept: 'Variables & Scope',
      difficulty: 'basic',
    },
    {
      question: 'What does the strict equality operator (===) check in JavaScript?',
      options: { A: 'Value only', B: 'Type only', C: 'Both value and type without coercion', D: 'Memory address only' },
      correct_answer: 'C',
      explanation: '=== checks for equality of both value and type without implicit coercion.',
      concept: 'Operators',
      difficulty: 'basic',
    },
    {
      question: 'Which array method adds one or more elements to the end of an array in JavaScript?',
      options: { A: 'push()', B: 'append()', C: 'insert()', D: 'pop()' },
      correct_answer: 'A',
      explanation: 'push() appends elements to the end of an array and returns its new length.',
      concept: 'Arrays',
      difficulty: 'basic',
    },
    {
      question: 'What is the primitive type returned by typeof null in JavaScript?',
      options: { A: '"null"', B: '"undefined"', C: '"object"', D: '"boolean"' },
      correct_answer: 'C',
      explanation: 'Due to a legacy implementation in JavaScript, typeof null returns "object".',
      concept: 'Data Types',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What is a "closure" in JavaScript?',
      options: {
        A: 'A function that closes the browser window',
        B: 'The combination of a function bundled with references to its surrounding lexical environment',
        C: 'A method that removes all event listeners from the DOM',
        D: 'An object whose properties cannot be modified',
      },
      correct_answer: 'B',
      explanation: 'A closure allows an inner function to retain access to its outer enclosing scope even after the outer function has executed.',
      concept: 'Closures & Scope',
      difficulty: 'intermediate',
    },
    {
      question: 'What is the difference between Function Declaration and Function Expression in JavaScript regarding hoisting?',
      options: {
        A: 'Function expressions are hoisted with body; function declarations are not',
        B: 'Function declarations are fully hoisted with their implementation; function expressions are not hoisted until evaluated',
        C: 'Neither is hoisted',
        D: 'Both behave identically in all environments',
      },
      correct_answer: 'B',
      explanation: 'Function declarations are hoisted to the top of their scope, allowing calls before declaration.',
      concept: 'Functions',
      difficulty: 'intermediate',
    },
    {
      question: 'What does Promise.all() do when one of the passed promises rejects?',
      options: {
        A: 'It ignores the rejection and resolves the remaining promises',
        B: 'It immediately rejects with the reason of the first rejected promise',
        C: 'It retries the rejected promise 3 times',
        D: 'It pauses until all promises settle',
      },
      correct_answer: 'B',
      explanation: 'Promise.all() rejects immediately (fail-fast) upon the first rejection encountered.',
      concept: 'Asynchronous JS',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'In the JavaScript Event Loop, how is the microtask queue processed relative to the macrotask (task) queue?',
      options: {
        A: 'Macrotasks are prioritized before any microtasks run',
        B: 'All microtasks in the microtask queue are drained completely before the next macrotask is executed',
        C: 'Microtasks only run during web worker threads',
        D: 'Microtasks and macrotasks alternate execution in equal turns',
      },
      correct_answer: 'B',
      explanation: 'The event loop empties the entire microtask queue (Promises, queueMicrotask) after each callback and before the next task.',
      concept: 'Event Loop',
      difficulty: 'advanced',
    },
    {
      question: 'What is the primary difference between a Map and a WeakMap in JavaScript?',
      options: {
        A: 'WeakMap keys must be objects and are held weakly, allowing garbage collection when unreferenced elsewhere',
        B: 'Map keys must be integers only',
        C: 'WeakMap supports forEach iteration, while Map does not',
        D: 'WeakMap can only store up to 100 entries',
      },
      correct_answer: 'A',
      explanation: 'WeakMap keys must be objects and do not prevent garbage collection of their keys, preventing memory leaks.',
      concept: 'Memory & Garbage Collection',
      difficulty: 'advanced',
    },
  ],

  SQL: [
    // BASIC
    {
      question: 'Which SQL statement is used to retrieve data from a database table?',
      options: { A: 'GET', B: 'FETCH', C: 'SELECT', D: 'EXTRACT' },
      correct_answer: 'C',
      explanation: 'The SELECT statement is used to query and retrieve data records.',
      concept: 'Query Basics',
      difficulty: 'basic',
    },
    {
      question: 'Which SQL clause is used to filter records based on a condition?',
      options: { A: 'ORDER BY', B: 'WHERE', C: 'GROUP BY', D: 'HAVING' },
      correct_answer: 'B',
      explanation: 'The WHERE clause filters rows before grouping or ordering.',
      concept: 'Filtering',
      difficulty: 'basic',
    },
    {
      question: 'Which SQL clause sorts query results in ascending or descending order?',
      options: { A: 'ORDER BY', B: 'SORT BY', C: 'ARRANGE BY', D: 'GROUP BY' },
      correct_answer: 'A',
      explanation: 'ORDER BY sorts the returned records by one or more columns.',
      concept: 'Sorting',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What is the key distinction between WHERE and HAVING clauses in SQL?',
      options: {
        A: 'WHERE filters aggregated groups; HAVING filters individual rows',
        B: 'WHERE filters rows before aggregation; HAVING filters aggregated groups created by GROUP BY',
        C: 'WHERE only works on strings; HAVING works on numbers',
        D: 'They are identical and can be used interchangeably',
      },
      correct_answer: 'B',
      explanation: 'WHERE filters individual records prior to grouping, while HAVING applies conditions to aggregated group results.',
      concept: 'Grouping & Aggregates',
      difficulty: 'intermediate',
    },
    {
      question: 'Which JOIN returns all rows from the left table, and matching rows from the right table (filling NULL for non-matches)?',
      options: { A: 'INNER JOIN', B: 'LEFT JOIN', C: 'CROSS JOIN', D: 'RIGHT JOIN' },
      correct_answer: 'B',
      explanation: 'LEFT JOIN (or LEFT OUTER JOIN) preserves all records from the left relation.',
      concept: 'Joins',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'What does the ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) window function accomplish?',
      options: {
        A: 'Permanently alters the primary key sequence of the table',
        B: 'Assigns a sequential ranking integer to each row within each dept_id partition based on salary',
        C: 'Deletes duplicate rows based on dept_id',
        D: 'Sums the salaries of each department into a single scalar row',
      },
      correct_answer: 'B',
      explanation: 'Window functions calculate values across a set of table rows related to the current row without collapsing them.',
      concept: 'Window Functions',
      difficulty: 'advanced',
    },
    {
      question: 'What is the difference between a Clustered Index and a Non-Clustered Index in relational databases?',
      options: {
        A: 'A clustered index physically orders the data rows in the table; non-clustered index stores pointers to physical rows',
        B: 'Tables can have multiple clustered indexes, but only one non-clustered index',
        C: 'Clustered indexes only work on foreign keys',
        D: 'Non-clustered indexes delete the underlying table data',
      },
      correct_answer: 'A',
      explanation: 'A clustered index determines the physical storage layout of table data; only one clustered index can exist per table.',
      concept: 'Indexing & Performance',
      difficulty: 'advanced',
    },
  ],

  'C++': [
    // BASIC
    {
      question: 'What is the required return type of the standard C++ entry-point main() function?',
      options: { A: 'void', B: 'int', C: 'bool', D: 'char' },
      correct_answer: 'B',
      explanation: 'In standard C++, the main function must have a return type of int.',
      concept: 'Syntax & Entry Point',
      difficulty: 'basic',
    },
    {
      question: 'Which operator is used to access the memory address of an existing variable in C++?',
      options: { A: '*', B: '&', C: '->', D: '@' },
      correct_answer: 'B',
      explanation: 'The ampersand (&) operator is the address-of operator in C++.',
      concept: 'Pointers & Addresses',
      difficulty: 'basic',
    },
    {
      question: 'Which stream object from <iostream> outputs formatted text to the standard console in C++?',
      options: { A: 'std::cin', B: 'std::cout', C: 'std::cerr', D: 'std::print' },
      correct_answer: 'B',
      explanation: 'std::cout writes characters to the standard console output stream.',
      concept: 'Standard I/O',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What is RAII (Resource Acquisition Is Initialization) in C++?',
      options: {
        A: 'A tool that automatically recompiles C++ templates',
        B: 'A programming idiom where resources (memory, file handles) are bound to object lifetime via constructors and destructors',
        C: 'A compiler flag that optimizes vector performance',
        D: 'A syntax rule forcing all variables to be global',
      },
      correct_answer: 'B',
      explanation: 'RAII guarantees resource release by encapsulating management inside objects whose destructors trigger on scope exit.',
      concept: 'Memory Management',
      difficulty: 'intermediate',
    },
    {
      question: 'Why should a base class containing virtual member functions declare a virtual destructor in C++?',
      options: {
        A: 'To speed up constructor calls',
        B: 'To ensure derived class destructors are properly invoked when deleting derived objects through base pointers',
        C: 'To prevent any derived classes from being instantiated',
        D: 'To automatically free stack memory',
      },
      correct_answer: 'B',
      explanation: 'Deleting a derived instance through a base pointer without a virtual destructor results in undefined behavior and memory leaks.',
      concept: 'Polymorphism & OOP',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'What does std::move(x) actually perform under the hood in modern C++ (C++11 and beyond)?',
      options: {
        A: 'Physically relocates variable x to a new memory address in RAM',
        B: 'An unconditional static_cast of x to an rvalue reference (T&&) to enable move semantics',
        C: 'Asynchronously executes x on a separate thread',
        D: 'Zeroes out the bytes occupied by x in memory',
      },
      correct_answer: 'B',
      explanation: 'std::move is purely a compile-time cast that converts an lvalue into an rvalue, allowing move constructors to steal resources.',
      concept: 'Move Semantics',
      difficulty: 'advanced',
    },
    {
      question: 'What is the structural difference between std::unique_ptr and std::shared_ptr in modern C++?',
      options: {
        A: 'std::unique_ptr expresses exclusive ownership with zero reference-count overhead; std::shared_ptr uses an atomic reference count',
        B: 'std::unique_ptr can be copied to multiple threads simultaneously',
        C: 'std::shared_ptr cannot be used with custom deleters',
        D: 'std::unique_ptr allocates memory on the stack while std::shared_ptr allocates on the heap',
      },
      correct_answer: 'A',
      explanation: 'std::unique_ptr is a non-copyable move-only pointer with no control-block overhead; std::shared_ptr maintains shared reference counts.',
      concept: 'Smart Pointers',
      difficulty: 'advanced',
    },
  ],

  Java: [
    // BASIC
    {
      question: 'What is the exact signature of the entry point method in a runnable Java class?',
      options: {
        A: 'public void main(String args[])',
        B: 'public static void main(String[] args)',
        C: 'static int main(String[] args)',
        D: 'public static int main()',
      },
      correct_answer: 'B',
      explanation: 'Java requires public static void main(String[] args) as the standard application entry point.',
      concept: 'Entry Point',
      difficulty: 'basic',
    },
    {
      question: 'What converts Java source code (.java) into machine-independent bytecode (.class)?',
      options: { A: 'JVM', B: 'javac compiler', C: 'JRE', D: 'JAR utility' },
      correct_answer: 'B',
      explanation: 'The javac compiler transforms .java source files into portable Java bytecode (.class files).',
      concept: 'Compilation & Architecture',
      difficulty: 'basic',
    },
    {
      question: 'Why are String objects considered immutable in Java?',
      options: {
        A: 'They cannot be printed to the console',
        B: 'Their internal character sequence cannot be modified once instantiated',
        C: 'They only accept lowercase letters',
        D: 'They cannot be stored in ArrayLists',
      },
      correct_answer: 'B',
      explanation: 'In Java, String objects are immutable; any modification creates a new String instance in the pool.',
      concept: 'Strings & Immutability',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What is "Type Erasure" in Java Generics?',
      options: {
        A: 'Deleting duplicate variables during compilation',
        B: 'The compile-time process where generic type parameters are removed and replaced with raw types or bounds in bytecode',
        C: 'A security breach that deletes class files',
        D: 'Automatically converting primitive ints to Strings',
      },
      correct_answer: 'B',
      explanation: 'Java Generics use type erasure for backward compatibility, replacing type parameters with Object or their upper bound.',
      concept: 'Generics',
      difficulty: 'intermediate',
    },
    {
      question: 'What is the key difference between Checked and Unchecked exceptions in Java?',
      options: {
        A: 'Checked exceptions inherit from RuntimeException and do not require handling',
        B: 'Checked exceptions are verified at compile-time and must be declared or caught; Unchecked exceptions extend RuntimeException',
        C: 'Unchecked exceptions immediately terminate the operating system',
        D: 'Checked exceptions can only be thrown by the JVM itself',
      },
      correct_answer: 'B',
      explanation: 'Checked exceptions (extending Exception but not RuntimeException) are enforced by the compiler.',
      concept: 'Exception Handling',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'What does the "volatile" keyword guarantee in Java multithreading?',
      options: {
        A: 'Atomic execution of compound statements (like count++)',
        B: 'Visibility: reads and writes to the variable are directly synchronized with main memory across all thread caches',
        C: 'The variable is stored exclusively on the thread\'s call stack',
        D: 'Prevents multiple threads from entering the enclosing class',
      },
      correct_answer: 'B',
      explanation: 'volatile guarantees memory visibility and prevents compiler instruction reordering, but does not provide mutual exclusion.',
      concept: 'Concurrency & Memory Model',
      difficulty: 'advanced',
    },
    {
      question: 'How does ConcurrentHashMap in Java achieve high concurrency without locking the entire table?',
      options: {
        A: 'It converts all writes to synchronous file I/O',
        B: 'It uses lock striping, CAS (Compare-And-Swap) operations, and synchronized locking on individual bucket nodes',
        C: 'It only permits a single reader thread at any time',
        D: 'It copies the entire array on every put operation',
      },
      correct_answer: 'B',
      explanation: 'ConcurrentHashMap avoids global locks by utilizing CAS for empty bucket insertions and fine-grained bucket synchronization.',
      concept: 'Collections & Concurrency',
      difficulty: 'advanced',
    },
  ],

  'Node.js': [
    // BASIC
    {
      question: 'What kind of architecture does Node.js utilize to handle concurrent connections efficiently?',
      options: {
        A: 'Multi-threaded synchronous blocking I/O',
        B: 'Single-threaded event loop with non-blocking asynchronous I/O',
        C: 'Forking a separate operating system process for each user',
        D: 'Compiled C++ bytecode interpretation only',
      },
      correct_answer: 'B',
      explanation: 'Node.js runs on an event-driven, single-threaded loop powered by V8 and libuv for non-blocking I/O.',
      concept: 'Event Loop & Architecture',
      difficulty: 'basic',
    },
    {
      question: 'Which core built-in module in Node.js provides methods to interact with the file system?',
      options: { A: 'path', B: 'fs', C: 'os', D: 'http' },
      correct_answer: 'B',
      explanation: 'The fs (File System) module provides both synchronous and asynchronous file operation APIs.',
      concept: 'Core Modules',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What is the purpose of Streams and backpressure in Node.js?',
      options: {
        A: 'To encrypt WebSocket connections',
        B: 'To process data piece by piece in chunks without overwhelming server memory when handling large files',
        C: 'To prevent browser cookies from expiring',
        D: 'To convert JSON data into XML',
      },
      correct_answer: 'B',
      explanation: 'Streams read/write data in chunks, and backpressure signals the readable stream to pause when write buffers fill up.',
      concept: 'Streams & Buffers',
      difficulty: 'intermediate',
    },
    {
      question: 'What is the difference between process.nextTick() and setImmediate() in the Node.js event loop?',
      options: {
        A: 'process.nextTick() executes immediately after the current operation finishes, before any other event loop phase continues',
        B: 'setImmediate() runs before process.nextTick() callbacks',
        C: 'process.nextTick() only runs on server shutdown',
        D: 'They are completely identical functions',
      },
      correct_answer: 'A',
      explanation: 'process.nextTick() fires at the end of the current turn of the event loop, before the loop proceeds to timers or check phases.',
      concept: 'Event Loop',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'How do Worker Threads in Node.js differ from child_process.fork()?',
      options: {
        A: 'Worker threads share memory via SharedArrayBuffer and run within the same OS process; child processes run in isolated OS processes',
        B: 'Worker threads cannot run JavaScript code',
        C: 'Child processes have lower memory footprint than worker threads',
        D: 'Worker threads only support Windows systems',
      },
      correct_answer: 'A',
      explanation: 'worker_threads run multiple threads within a single process sharing memory spaces, ideal for CPU-bound computation.',
      concept: 'Concurrency & Scaling',
      difficulty: 'advanced',
    },
  ],

  'Python Django': [
    // BASIC
    {
      question: 'Which architectural pattern best describes the Django framework structure?',
      options: { A: 'MVC (Model-View-Controller)', B: 'MVT (Model-View-Template)', C: 'Microservices', D: 'Client-Server Only' },
      correct_answer: 'B',
      explanation: 'Django adopts the MVT (Model-View-Template) pattern, where Django itself manages the controller role.',
      concept: 'Architecture',
      difficulty: 'basic',
    },
    {
      question: 'Where are database table schemas declared in a Django application?',
      options: { A: 'views.py', B: 'models.py', C: 'urls.py', D: 'admin.py' },
      correct_answer: 'B',
      explanation: 'models.py defines database tables and columns as Python subclasses of models.Model.',
      concept: 'Django ORM',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What does select_related() accomplish in Django ORM optimization?',
      options: {
        A: 'Performs a SQL JOIN to retrieve related ForeignKey/OneToOne data in a single database query, solving N+1 queries',
        B: 'Deletes related rows automatically when a parent row is removed',
        C: 'Generates a new database migration file',
        D: 'Converts database rows into CSV files',
      },
      correct_answer: 'A',
      explanation: 'select_related() creates a SQL join to fetch related single-valued relationships in one query, avoiding N+1 query overhead.',
      concept: 'Query Optimization',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'What is the role of Django Middleware in request/response processing?',
      options: {
        A: 'To compile Python templates into binary format',
        B: 'A framework of hooks into Django request/response processing that intercepts and modifies HTTP flows globally',
        C: 'To manage database connections exclusively',
        D: 'To render HTML components in the browser',
      },
      correct_answer: 'B',
      explanation: 'Middleware components are chained to process requests before view dispatch and process responses before transmission.',
      concept: 'Middleware & Lifecycle',
      difficulty: 'advanced',
    },
  ],

  'Basic AI': [
    // BASIC
    {
      question: 'What does the famous Turing Test evaluate in Artificial Intelligence?',
      options: {
        A: 'The computational processing speed of a microchip',
        B: 'Whether a machine\'s behavior is indistinguishable from human intelligence',
        C: 'The mathematical accuracy of a sorting algorithm',
        D: 'The power consumption of a neural network',
      },
      correct_answer: 'B',
      explanation: 'Alan Turing proposed the imitation game to test if a machine can converse indistinguishably from a human.',
      concept: 'Foundations of AI',
      difficulty: 'basic',
    },
    {
      question: 'Which search algorithm explores all neighboring nodes at the present depth before moving deeper?',
      options: {
        A: 'Depth-First Search (DFS)',
        B: 'Breadth-First Search (BFS)',
        C: 'Binary Search',
        D: 'Genetic Search',
      },
      correct_answer: 'B',
      explanation: 'BFS uses a FIFO queue to explore nodes layer by layer, guaranteeing shortest paths on unweighted graphs.',
      concept: 'Search Algorithms',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'In the A* search algorithm, what does the property of "Admissibility" require of the heuristic function h(n)?',
      options: {
        A: 'h(n) must never overestimate the true minimum cost to reach the goal state',
        B: 'h(n) must always be equal to zero',
        C: 'h(n) must overestimate the cost by at least 10%',
        D: 'h(n) must be calculated in constant O(1) time',
      },
      correct_answer: 'A',
      explanation: 'An admissible heuristic never overestimates the true remaining cost, guaranteeing that A* finds the optimal path.',
      concept: 'Heuristic Search',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'How does Alpha-Beta pruning optimize the standard Minimax game tree search?',
      options: {
        A: 'By randomly picking moves to reduce tree depth',
        B: 'By pruning branches that demonstrably cannot influence the final minimax decision, without affecting the optimal outcome',
        C: 'By converting the tree into a neural network',
        D: 'By running games in parallel across multiple GPU cores',
      },
      correct_answer: 'B',
      explanation: 'Alpha-Beta pruning tracks the best alternatives found so far (alpha for max, beta for min), eliminating redundant subtrees.',
      concept: 'Adversarial Search',
      difficulty: 'advanced',
    },
  ],

  'Machine Learning': [
    // BASIC
    {
      question: 'What is the defining characteristic of Supervised Learning?',
      options: {
        A: 'Algorithms learn from unlabelled data without feedback',
        B: 'The training dataset includes input features paired with correct target labels',
        C: 'Models can only process image pixels',
        D: 'Humans manually program every decision rule',
      },
      correct_answer: 'B',
      explanation: 'Supervised learning trains models on labeled datasets consisting of input features and ground-truth targets.',
      concept: 'Supervised Learning',
      difficulty: 'basic',
    },
    {
      question: 'What occurs when a machine learning model exhibits "Overfitting"?',
      options: {
        A: 'The model performs poorly on training data and test data alike',
        B: 'The model memorizes noise in the training set and generalizes poorly to unseen data',
        C: 'The model trains in fewer than 10 iterations',
        D: 'The model loses all weights during evaluation',
      },
      correct_answer: 'B',
      explanation: 'Overfitting occurs when a model captures random noise in training data rather than underlying patterns.',
      concept: 'Model Generalization',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'In the Bias-Variance Tradeoff, what is typically associated with high model variance?',
      options: {
        A: 'Underfitting and excessive simplification',
        B: 'Overfitting and high sensitivity to fluctuations in the training dataset',
        C: 'Low accuracy on the training data',
        D: 'Constant prediction of a single class',
      },
      correct_answer: 'B',
      explanation: 'High variance indicates the model learned idiosyncrasies of the training sample, yielding unstable test performance.',
      concept: 'Bias-Variance Tradeoff',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'What distinguishes L1 Regularization (Lasso) from L2 Regularization (Ridge)?',
      options: {
        A: 'L1 adds the sum of absolute weight values to the loss, driving non-informative coefficients to exactly zero (feature selection)',
        B: 'L2 adds the sum of squared weights and eliminates features completely',
        C: 'L1 only works on decision trees',
        D: 'L2 increases the learning rate automatically',
      },
      correct_answer: 'A',
      explanation: 'Lasso (L1) penalizes absolute values and encourages sparsity, effectively serving as an automatic feature selection mechanism.',
      concept: 'Regularization',
      difficulty: 'advanced',
    },
  ],

  'Advanced AI': [
    // BASIC
    {
      question: 'Which neural network architecture introduced in 2017 forms the foundation for modern LLMs like GPT and Gemini?',
      options: { A: 'Recurrent Neural Network (RNN)', B: 'Transformer', C: 'Markov Chain', D: 'Perceptron' },
      correct_answer: 'B',
      explanation: 'The Transformer architecture (Vaswani et al.) replaced sequential RNNs with parallelized self-attention mechanisms.',
      concept: 'Transformer Architecture',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What is the role of Positional Encodings in Transformer architectures?',
      options: {
        A: 'To compress token embeddings to smaller dimensions',
        B: 'To inject sequence order information, since self-attention operations are inherently permutation invariant',
        C: 'To delete punctuation tokens from prompts',
        D: 'To encrypt sensitive prompts on the server',
      },
      correct_answer: 'B',
      explanation: 'Because attention calculates interactions without inherent order, positional encodings provide spatial sequence knowledge.',
      concept: 'Attention & Encodings',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'In Parameter-Efficient Fine-Tuning (PEFT) methods like LoRA (Low-Rank Adaptation), how are model weights updated?',
      options: {
        A: 'All pre-trained foundation weights are updated with a high learning rate',
        B: 'Pre-trained weights are frozen, and low-rank decomposition matrices are injected into attention layers to train significantly fewer parameters',
        C: 'The model architecture is pruned by 90%',
        D: 'Random noise is added to the vocabulary embeddings',
      },
      correct_answer: 'B',
      explanation: 'LoRA freezes foundation parameters and trains low-rank matrix pairs (A and B), drastically cutting compute and storage needs.',
      concept: 'PEFT & Fine-Tuning',
      difficulty: 'advanced',
    },
  ],

  'Deep Learning': [
    // BASIC
    {
      question: 'What mathematical function does the ReLU (Rectified Linear Unit) activation calculate for input x?',
      options: { A: 'f(x) = x^2', B: 'f(x) = max(0, x)', C: 'f(x) = 1 / (1 + e^-x)', D: 'f(x) = sin(x)' },
      correct_answer: 'B',
      explanation: 'ReLU outputs x if positive, and 0 otherwise: max(0, x). It helps mitigate vanishing gradients.',
      concept: 'Activation Functions',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What is the primary architectural feature of Residual Networks (ResNets) that enables training of very deep networks?',
      options: {
        A: 'Fully connected linear layers without activation',
        B: 'Skip (shortcut) connections that bypass one or more layers, allowing gradients to flow directly during backpropagation',
        C: 'Removing all convolutional filters',
        D: 'Using only binary weights (0 or 1)',
      },
      correct_answer: 'B',
      explanation: 'Residual skip connections let gradients propagate directly through the identity mapping, resolving degradation problems in deep models.',
      concept: 'Network Architectures',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'How does Batch Normalization accelerate neural network training and improve stability?',
      options: {
        A: 'By quantizing weights from 32-bit floats to 8-bit integers',
        B: 'By normalizing layer inputs across mini-batch statistics (mean and variance) to stabilize internal covariate shift',
        C: 'By removing all bias terms from convolutional filters',
        D: 'By executing forward passes in reverse order',
      },
      correct_answer: 'B',
      explanation: 'Batch Normalization standardizes intermediate activations, enabling higher learning rates and serving as slight regularization.',
      concept: 'Optimization & Normalization',
      difficulty: 'advanced',
    },
  ],

  'Problem Solving': [
    // BASIC
    {
      question: 'What is the time complexity of looking up a key in a well-distributed Hash Table on average?',
      options: { A: 'O(n)', B: 'O(1)', C: 'O(log n)', D: 'O(n^2)' },
      correct_answer: 'B',
      explanation: 'Hash tables compute bucket indices in O(1) constant time on average.',
      concept: 'Data Structures',
      difficulty: 'basic',
    },
    {
      question: 'What is a necessary precondition before Binary Search can be applied to search for a target value?',
      options: {
        A: 'The array must contain only prime numbers',
        B: 'The elements in the array must be sorted in order',
        C: 'The array must have an odd number of items',
        D: 'The array must be stored as a linked list',
      },
      correct_answer: 'B',
      explanation: 'Binary Search repeatedly halves the search space, requiring that elements are sorted.',
      concept: 'Binary Search',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What is the difference between Tabulation and Memoization in Dynamic Programming?',
      options: {
        A: 'Memoization is bottom-up iterative; Tabulation is top-down recursive',
        B: 'Memoization is top-down recursive using a cache; Tabulation is bottom-up iterative building a table from base cases',
        C: 'Tabulation does not use any additional memory',
        D: 'Memoization cannot be used on graph algorithms',
      },
      correct_answer: 'B',
      explanation: 'Memoization caches recursive call results; Tabulation iteratively fills a DP table starting from the smallest subproblems.',
      concept: 'Dynamic Programming',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'What data structure enables finding and unioning connected components in near-constant amortized time O(α(N))?',
      options: {
        A: 'Binary Search Tree',
        B: 'Disjoint Set Union (Union-Find) with path compression and union by rank',
        C: 'Circular Linked List',
        D: 'Adjacency Matrix',
      },
      correct_answer: 'B',
      explanation: 'Union-Find with path compression and union by rank achieves near O(1) operations bounded by the Inverse Ackermann function α(N).',
      concept: 'Advanced Graph Structures',
      difficulty: 'advanced',
    },
  ],

  'Pattern Recognition': [
    // BASIC
    {
      question: 'What is a "Feature Vector" in pattern recognition?',
      options: {
        A: 'A directional arrow drawn on a computer screen',
        B: 'An ordered list of measurable numerical properties representing an observation',
        C: 'A list of syntax errors in a program',
        D: 'A pointer storing hard drive sectors',
      },
      correct_answer: 'B',
      explanation: 'A feature vector quantifies numerical attributes (e.g. height, color histogram, weight) describing an observation.',
      concept: 'Feature Representation',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What is the objective of the Kernel Trick in Support Vector Machines (SVM)?',
      options: {
        A: 'To compress images before training',
        B: 'To map non-linearly separable input data into higher-dimensional feature space where it becomes linearly separable, without explicit coordinate calculation',
        C: 'To delete support vectors that lie on the margin',
        D: 'To convert SVM into a decision tree',
      },
      correct_answer: 'B',
      explanation: 'The kernel trick computes inner products in high-dimensional Hilbert space, enabling non-linear classification without dimensional explosion.',
      concept: 'Kernel Methods',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'How does t-SNE (t-Distributed Stochastic Neighbor Embedding) differ from PCA in high-dimensional data visualization?',
      options: {
        A: 'PCA preserves non-linear local neighborhood manifolds; t-SNE only preserves global linear variance',
        B: 't-SNE is a non-linear probabilistic technique that preserves local pairwise similarities; PCA is a linear orthogonal projection',
        C: 't-SNE cannot be applied to continuous variables',
        D: 'PCA is an iterative gradient algorithm while t-SNE is an exact matrix inversion',
      },
      correct_answer: 'B',
      explanation: 't-SNE models local similarities using Student-t distributions, effectively revealing non-linear cluster structures in 2D/3D projections.',
      concept: 'Manifold Learning',
      difficulty: 'advanced',
    },
  ],

  'HTML/CSS': [
    // BASIC
    {
      question: 'Which HTML5 element represents the primary navigation links of a website?',
      options: { A: '<menu>', B: '<nav>', C: '<navigate>', D: '<links>' },
      correct_answer: 'B',
      explanation: 'The <nav> tag is the semantic HTML5 element designating major navigation links.',
      concept: 'Semantic HTML',
      difficulty: 'basic',
    },
    {
      question: 'What are the four layers of the standard CSS Box Model, from inside out?',
      options: {
        A: 'Border, Margin, Padding, Content',
        B: 'Content, Padding, Border, Margin',
        C: 'Content, Border, Padding, Margin',
        D: 'Margin, Border, Padding, Content',
      },
      correct_answer: 'B',
      explanation: 'The CSS Box Model consists of Content at the core, surrounded by Padding, Border, and Margin.',
      concept: 'CSS Box Model',
      difficulty: 'basic',
    },
    // INTERMEDIATE
    {
      question: 'What is the key difference between CSS Flexbox and CSS Grid?',
      options: {
        A: 'Flexbox is one-dimensional (row OR column); Grid is two-dimensional (simultaneous rows AND columns)',
        B: 'Flexbox only works for text; Grid only works for images',
        C: 'Grid cannot be used with media queries',
        D: 'Flexbox cannot align items vertically',
      },
      correct_answer: 'A',
      explanation: 'Flexbox aligns items primarily along a single axis; CSS Grid manages two-dimensional row-and-column layout structures.',
      concept: 'CSS Layout',
      difficulty: 'intermediate',
    },
    // ADVANCED
    {
      question: 'What establishes a new Stacking Context in CSS?',
      options: {
        A: 'Any element with display: block',
        B: 'An element with position: relative/absolute and z-index other than auto, or opacity < 1, or transform/filter applied',
        C: 'An element with color: black',
        D: 'Any <section> tag',
      },
      correct_answer: 'B',
      explanation: 'Stacking contexts isolate 3D z-index layering; they are triggered by positioned z-indexed items, transforms, opacities, or will-change.',
      concept: 'Stacking Context & Rendering',
      difficulty: 'advanced',
    },
  ],
};

/**
 * Fallback generator for gatekeeper: 3 basic questions
 */
function generateFallbackQuestions(skill, seenQuestionTexts = []) {
  const pool = dynamicSkillPools[skill] || dynamicSkillPools['Problem Solving'];
  const basicPool = pool.filter((q) => q.difficulty === 'basic');
  const seenSet = new Set((seenQuestionTexts || []).map((t) => String(t).trim().toLowerCase()));

  const unseen = basicPool.filter((q) => !seenSet.has(q.question.trim().toLowerCase()));
  const candidate = unseen.length >= 3 ? unseen : (basicPool.length >= 3 ? basicPool : pool);

  const shuffled = shuffleArray(candidate);
  return shuffled.slice(0, 3).map(normalizeQuestion);
}

/**
 * Gatekeeper Question Generator (Generates exactly 3 basic questions)
 */
async function generateQuestionsForSkill(skill, seenQuestionTexts = []) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AI Generator] Requesting Gatekeeper questions for "${skill}" (Attempt ${attempt}/${maxRetries})...`);
        const data = await callGeminiGatekeeperAPI(skill, apiKey, seenQuestionTexts);

        const validation = validateQuestionsResponse(data, skill);
        if (validation.valid) {
          console.log(`[AI Generator] Successfully validated Gatekeeper AI questions for "${skill}".`);
          return data.questions.map(normalizeQuestion);
        } else {
          console.warn(`[AI Generator] Validation failed on attempt ${attempt}: ${validation.reason}`);
        }
      } catch (err) {
        console.warn(`[AI Generator] Attempt ${attempt} failed: ${err.message}`);
      }
    }
  }

  return generateFallbackQuestions(skill, seenQuestionTexts);
}

/**
 * Calls Gemini API for 3 Basic Gatekeeper Questions
 */
async function callGeminiGatekeeperAPI(skill, apiKey, seenQuestionTexts = []) {
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const seenNotice =
    seenQuestionTexts && seenQuestionTexts.length > 0
      ? `Do NOT ask questions about these recently seen prompts:\n- ${seenQuestionTexts.slice(-6).join('\n- ')}\n`
      : '';

  const prompt = `
You are an expert technical interviewer for Cognify.
Generate exactly 3 foundational multiple-choice questions for the skill: "${skill}".

Requirements:
1. Difficulty is strictly "basic" level (core syntax, fundamental keywords, primary concepts).
2. Exactly 4 distinct options labeled A, B, C, and D for each question.
3. Exactly ONE unambiguous correct answer (A, B, C, or D).
4. Clear educational explanation.
5. Distinct concept name per question.
6. Set "difficulty" strictly to "basic".
${seenNotice}
Return ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "question": "Question text here",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct_answer": "B",
      "explanation": "...",
      "concept": "...",
      "difficulty": "basic"
    }
  ]
}
`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.75 },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini API.');
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Generates an AI-tailored starting recommendation when a student fails the gatekeeper
 */
async function generateGatekeeperRecommendation(skill, missedConcept, missedQuestion = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    try {
      const qText = missedQuestion.questionText || missedQuestion.question || '';
      const exp = missedQuestion.explanation || '';
      const prompt = `
A student was taking a basic skill gatekeeper assessment in "${skill}" and answered a question incorrectly on the concept "${missedConcept}".
Question: "${qText}"
Explanation: "${exp}"

Provide a concise, motivating, 2-sentence educational starting recommendation advising the student on specifically what foundational topics to review before attempting the full assessment again. Return plain text only without quotes.
`;
      const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 120 },
          }),
          signal: AbortSignal.timeout(6000),
        }
      );
      if (response.ok) {
        const json = await response.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text && text.length > 10) return text;
      }
    } catch (e) {
      console.warn('Gemini recommendation call failed, using domain fallback:', e.message);
    }
  }

  // Domain-specific tailored fallback recommendation
  const recommendations = {
    Python: `Focus on strengthening your foundational Python knowledge in "${missedConcept}". Review core data types, syntax conventions, and scoping before retaking the gatekeeper.`,
    JavaScript: `Review modern JavaScript fundamentals regarding "${missedConcept}". Familiarize yourself with variable declarations, strict equality, and runtime behavior.`,
    SQL: `Review basic relational database principles around "${missedConcept}". Practice writing basic SELECT queries, condition filters, and sorting expressions.`,
    'HTML/CSS': `Review foundational web structure and styling in "${missedConcept}". Focus on standard HTML5 semantics and the core CSS box model.`,
    'C++': `Review basic C++ memory semantics and language primitives regarding "${missedConcept}". Pay close attention to pointers, references, and standard I/O streams.`,
    Java: `Strengthen your understanding of Java fundamentals around "${missedConcept}". Focus on OOP principles, JVM compilation, and class mechanics.`,
    'Node.js': `Review core Node.js architecture regarding "${missedConcept}". Focus on the asynchronous event loop, built-in modules, and module exports.`,
    'Python Django': `Revisit the Django framework basics concerning "${missedConcept}". Practice with MVT request handling, models, and migrations.`,
    'Basic AI': `Study fundamental artificial intelligence paradigms covering "${missedConcept}". Review state-space search algorithms and heuristic evaluations.`,
    'Machine Learning': `Review core machine learning concepts regarding "${missedConcept}". Focus on the difference between supervised tasks, loss functions, and data splitting.`,
    'Advanced AI': `Strengthen your understanding of modern AI architectures regarding "${missedConcept}". Review transformer mechanisms, tokenization, and context windows.`,
    'Deep Learning': `Review neural network fundamentals in "${missedConcept}". Focus on feedforward layer operations, activation functions, and backpropagation.`,
    'Problem Solving': `Practice fundamental algorithmic thinking in "${missedConcept}". Review Big-O time complexity and basic data structure traversal.`,
    'Pattern Recognition': `Review core pattern classification methods regarding "${missedConcept}". Focus on feature representations, distance metrics, and decision boundaries.`,
  };

  return (
    recommendations[skill] ||
    `Focus on mastering the core principles of "${missedConcept}" in ${skill} before retaking the gatekeeper assessment.`
  );
}

/**
 * Adaptive Decision Logic & Next Question Generator
 * Evaluates concept-wise history and dynamically generates the single next question.
 */
async function generateNextAdaptiveQuestion({ skill, history = [], previousQuestionTexts = [] }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  // Aggregate concept-wise performance
  const conceptStats = {};
  for (const h of history) {
    const c = h.concept || 'General';
    if (!conceptStats[c]) {
      conceptStats[c] = { total: 0, correct: 0, lastDifficulty: h.difficulty, history: [] };
    }
    conceptStats[c].total++;
    if (h.is_correct) conceptStats[c].correct++;
    conceptStats[c].lastDifficulty = h.difficulty;
    conceptStats[c].history.push({ difficulty: h.difficulty, is_correct: h.is_correct });
  }

  // Derive target concept & difficulty
  const lastItem = history.length > 0 ? history[history.length - 1] : null;
  let targetConcept = lastItem ? lastItem.concept : null;
  let targetDifficulty = 'basic';
  let adaptiveReasoning = '';

  if (lastItem) {
    const lastDiff = (lastItem.difficulty || 'basic').toLowerCase();
    if (lastItem.is_correct) {
      if (lastDiff === 'basic') {
        targetDifficulty = 'intermediate';
        adaptiveReasoning = `User mastered basic ${targetConcept}; advancing difficulty to Intermediate.`;
      } else if (lastDiff === 'intermediate') {
        targetDifficulty = 'advanced';
        adaptiveReasoning = `User performed strongly on intermediate ${targetConcept}; elevating to Advanced.`;
      } else {
        // Already at advanced and correct: branch to another concept at intermediate or advanced
        targetDifficulty = 'intermediate';
        targetConcept = null; // Will pick another concept
        adaptiveReasoning = `User demonstrated advanced mastery on ${lastItem.concept}; branching to assess a new technical concept.`;
      }
    } else {
      // User struggled
      if (lastDiff === 'advanced') {
        targetDifficulty = 'intermediate';
        adaptiveReasoning = `User struggled on advanced ${targetConcept}; adjusting difficulty back to Intermediate.`;
      } else if (lastDiff === 'intermediate') {
        targetDifficulty = 'basic';
        adaptiveReasoning = `User struggled on intermediate ${targetConcept}; adjusting difficulty back to Basic for reinforcement.`;
      } else {
        targetDifficulty = 'basic';
        targetConcept = null; // Pivot to another concept
        adaptiveReasoning = `User struggled on basic ${lastItem.concept}; adjusting focus to an alternative foundational concept.`;
      }
    }
  }

  // 1. Try Live Gemini API if key is configured
  if (apiKey) {
    try {
      console.log(`[Adaptive Engine] Requesting dynamic adaptive question for "${skill}" from Gemini API...`);
      const aiResult = await callGeminiAdaptiveAPI(
        skill,
        apiKey,
        history,
        conceptStats,
        targetConcept,
        targetDifficulty,
        previousQuestionTexts
      );

      const qVal = validateSingleQuestion(aiResult.question);
      if (qVal.valid && !isQuestionDuplicated(aiResult.question.question, previousQuestionTexts)) {
        console.log(`[Adaptive Engine] Live AI generated valid adaptive question [${aiResult.question.difficulty.toUpperCase()} - ${aiResult.question.concept}].`);
        const normalized = normalizeQuestion(aiResult.question);
        normalized.adaptiveReasoning = aiResult.adaptive_decision?.reasoning || adaptiveReasoning;
        return normalized;
      }
    } catch (err) {
      console.warn(`[Adaptive Engine] Live Gemini adaptive call failed (${err.message}). Using resilient domain engine.`);
    }
  }

  // 2. Resilient Concept-Wise Adaptive Engine (Fallback)
  return generateFallbackAdaptiveQuestion(skill, history, previousQuestionTexts, targetConcept, targetDifficulty, adaptiveReasoning);
}

/**
 * Calls Gemini API for a single concept-wise adaptive question
 */
async function callGeminiAdaptiveAPI(skill, apiKey, history, conceptStats, targetConcept, targetDifficulty, previousQuestionTexts) {
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const historySummary = history
    .slice(-5)
    .map((h, i) => `Q${i + 1}: Concept "${h.concept}", Difficulty: "${h.difficulty}", Correct: ${h.is_correct}`)
    .join('\n');

  const prevPrompts = previousQuestionTexts.slice(-8).map((p) => `- ${p}`).join('\n');

  const prompt = `
You are an expert adaptive assessment engine for Cognify.
Evaluate the user's skill performance in "${skill}" and generate the single NEXT adaptive question.

User's recent performance:
${historySummary}

Recommended target:
- Concept: ${targetConcept || 'Select a relevant unassessed core concept'}
- Target Difficulty: ${targetDifficulty}

Rules:
1. Difficulty MUST be exactly one of: "basic", "intermediate", "advanced".
2. Exactly 4 distinct options (A, B, C, D) and exactly ONE correct answer.
3. NEVER repeat or duplicate any of these previous questions:
${prevPrompts}
4. Return valid JSON only matching this schema:
{
  "adaptive_decision": {
    "next_concept": "Concept Name",
    "next_difficulty": "${targetDifficulty}",
    "reasoning": "1 sentence explaining why this concept and difficulty was selected"
  },
  "question": {
    "question": "Question text here",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct_answer": "B",
    "explanation": "Educational explanation of why the answer is right",
    "concept": "Concept Name",
    "difficulty": "${targetDifficulty}"
  }
}
`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini API.');
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Resilient Concept-Wise Adaptive Question Generator (Internal Fallback)
 */
function generateFallbackAdaptiveQuestion(skill, history, previousQuestionTexts, targetConcept, targetDifficulty, adaptiveReasoning) {
  const pool = dynamicSkillPools[skill] || dynamicSkillPools['Problem Solving'];
  const prevSet = new Set(previousQuestionTexts.map((p) => String(p).trim().toLowerCase()));

  // 1. Try to find an unseen question with exact concept AND exact difficulty
  let candidates = pool.filter(
    (q) =>
      !prevSet.has(q.question.trim().toLowerCase()) &&
      !isQuestionDuplicated(q.question, previousQuestionTexts) &&
      (targetConcept ? q.concept.toLowerCase() === targetConcept.toLowerCase() : true) &&
      q.difficulty.toLowerCase() === targetDifficulty.toLowerCase()
  );

  // 2. If no exact match, relax concept constraint but match difficulty
  if (candidates.length === 0) {
    candidates = pool.filter(
      (q) =>
        !prevSet.has(q.question.trim().toLowerCase()) &&
        !isQuestionDuplicated(q.question, previousQuestionTexts) &&
        q.difficulty.toLowerCase() === targetDifficulty.toLowerCase()
    );
  }

  // 3. If still no match, find any unseen question in the skill
  if (candidates.length === 0) {
    candidates = pool.filter(
      (q) =>
        !prevSet.has(q.question.trim().toLowerCase()) &&
        !isQuestionDuplicated(q.question, previousQuestionTexts)
    );
  }

  // 4. Absolute fallback if all questions seen: pick any non-duplicate
  if (candidates.length === 0) {
    candidates = pool;
  }

  const shuffled = shuffleArray(candidates);
  const selected = normalizeQuestion(shuffled[0]);
  selected.adaptiveReasoning = adaptiveReasoning || `Adaptive question selected at ${selected.difficulty.toUpperCase()} tier for ${selected.concept}.`;
  return selected;
}

// ==================== PHASE 4: PERSONALIZED LEARNING RECOMMENDATION ====================

/**
 * Validates the structured output schema for the personalized recommendation
 */
function validatePersonalizedRecommendation(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: 'Recommendation output must be an object.' };
  }

  if (typeof data.skill_level !== 'string' || data.skill_level.trim().length === 0) {
    return { valid: false, reason: 'Missing or invalid "skill_level" string.' };
  }

  if (!Array.isArray(data.strengths)) {
    return { valid: false, reason: 'Missing or invalid "strengths" array.' };
  }

  if (!Array.isArray(data.weaknesses)) {
    return { valid: false, reason: 'Missing or invalid "weaknesses" array.' };
  }

  if (typeof data.starting_point !== 'string' || data.starting_point.trim().length === 0) {
    return { valid: false, reason: 'Missing or invalid "starting_point" string.' };
  }

  if (!Array.isArray(data.next_topics) || data.next_topics.length === 0) {
    return { valid: false, reason: 'Missing or invalid "next_topics" array.' };
  }

  if (!Array.isArray(data.practice_recommendations) || data.practice_recommendations.length === 0) {
    return { valid: false, reason: 'Missing or invalid "practice_recommendations" array.' };
  }

  if (typeof data.summary !== 'string' || data.summary.trim().length < 15) {
    return { valid: false, reason: 'Missing or too short "summary" narrative.' };
  }

  return { valid: true };
}

/**
 * Domain curriculum roadmaps for all 14 technical skills
 */
const domainCurricula = {
  Python: {
    foundations: ['Syntax & Setup', 'Data Types & Variables', 'Operators & Expressions'],
    intermediate: ['Functions, *args & Scope', 'OOP & Classes', 'List Comprehensions & Iterators', 'Exception Handling'],
    advanced: ['Decorators & Generators', 'Context Managers & Dunder Methods', 'Concurrency (asyncio & threading)', 'Memory Management & Metaclasses'],
    practices: [
      'Refactor procedural scripts into modular functions with strict type hinting',
      'Implement an object-oriented inventory system utilizing inheritance and polymorphism',
      'Write custom context managers and decorators for performance profiling',
      'Build an asynchronous web scraper or API client using asyncio and aiohttp',
    ],
  },
  JavaScript: {
    foundations: ['Syntax & Data Types', 'Variables (let, const)', 'Basic Operators'],
    intermediate: ['Functions & Arrow Syntax', 'DOM Manipulation', 'Arrays & Array Methods', 'Promises & Async/Await'],
    advanced: ['Event Loop & Microtasks', 'Closures & Lexical Scope', 'Prototypes & Inheritance', 'Web Workers & Memory Optimization'],
    practices: [
      'Re-implement core array utilities (map, filter, reduce) from scratch',
      'Create a debounce and throttle utility function with closures',
      'Build an interactive Single Page Application without external frameworks',
      'Diagnose and resolve memory leaks using Chrome DevTools memory profiler',
    ],
  },
  SQL: {
    foundations: ['SELECT & WHERE Clauses', 'Basic Filtering & Sorting', 'Aggregate Functions (COUNT, SUM)'],
    intermediate: ['INNER, LEFT & FULL JOINs', 'GROUP BY & HAVING Clauses', 'Subqueries & Derived Tables', 'Transactions & ACID'],
    practices: [
      'Write complex multi-table analytical queries using window functions (ROW_NUMBER, RANK)',
      'Design and optimize database schemas with proper normalization and compound indexing',
      'Analyze slow queries using EXPLAIN plans and eliminate redundant table scans',
      'Implement stored procedures and transaction boundaries with rollbacks',
    ],
  },
  'HTML/CSS': {
    foundations: ['Semantic HTML Elements', 'Basic CSS Selectors', 'Color & Typography'],
    intermediate: ['Flexbox & Grid Layouts', 'Responsive Media Queries', 'CSS Transitions & Animations', 'Form Validation'],
    practices: [
      'Build responsive multi-column layouts adapting seamlessly between mobile and desktop',
      'Implement pure CSS accessible accordions, modals, and dropdown navigation',
      'Audit and optimize Core Web Vitals (LCP, CLS) and tap target accessibility',
      'Create custom reusable CSS component systems using CSS Variables',
    ],
  },
  'C++': {
    foundations: ['Syntax & Standard I/O', 'Data Types & Arrays', 'Control Flow & Loops'],
    intermediate: ['Pointers & References', 'Object-Oriented C++ (Classes & Structs)', 'Dynamic Memory (new/delete)', 'STL Containers (vector, map)'],
    advanced: ['Smart Pointers (unique_ptr, shared_ptr)', 'Move Semantics & Rvalue References', 'Templates & Metaprogramming', 'Multithreading & Mutexes'],
    practices: [
      'Build a custom dynamic array vector container with RAII and move constructors',
      'Implement a thread-safe producer-consumer queue using std::condition_variable',
      'Convert raw pointer legacy code to modern smart pointer abstractions',
      'Write template metaprogramming utilities evaluated at compile time',
    ],
  },
  Java: {
    foundations: ['Compilation & JVM Architecture', 'Basic Types & Control Flow', 'Entry Point & Main Method'],
    intermediate: ['OOP Principles (Inheritance & Interfaces)', 'Collections Framework (List, Map, Set)', 'Exception Handling (try-catch-finally)'],
    advanced: ['Streams API & Lambdas', 'Generics & Wildcards', 'Concurrency & Java Memory Model', 'JVM Garbage Collection Tuning'],
    practices: [
      'Refactor legacy collection loops to functional Streams with parallel collectors',
      'Implement a thread-safe caching system using ConcurrentHashMap and ReadWriteLock',
      'Design clean API contracts using abstract classes and default interface methods',
      'Profile memory allocations and optimize GC pause times with JConsole',
    ],
  },
  'Node.js': {
    foundations: ['Node Runtime Architecture', 'CommonJS & ES Modules', 'Global Objects & Process'],
    intermediate: ['File System (fs) & Path', 'HTTP Module & Express Basics', 'Event Emitter & Streams'],
    advanced: ['Event Loop & Libuv Internals', 'Cluster & Worker Threads', 'Buffer & Binary Data', 'Security & Rate Limiting'],
    practices: [
      'Build a streaming file processing pipeline handling large multi-gigabyte uploads',
      'Create a high-throughput REST API with Express, validation middleware, and connection pooling',
      'Implement microservice communication using worker threads and message ports',
      'Configure production security headers (Helmet) and JWT authentication flow',
    ],
  },
  'Python Django': {
    foundations: ['Django Architecture (MVT)', 'Settings & URL Routing', 'Basic Views'],
    intermediate: ['Django ORM & Models', 'Model Forms & Form Validation', 'Django Templates & Context'],
    advanced: ['Class-Based Views & Mixins', 'QuerySet Optimization (select_related, prefetch_related)', 'Django REST Framework & Serializers', 'Middleware & Caching'],
    practices: [
      'Build a complete CRUD API with Django REST Framework, serializers, and permissions',
      'Eliminate N+1 database queries using prefetch_related and select_related profiling',
      'Implement custom authentication middleware and session management',
      'Write automated unit and integration tests using Django TestCase',
    ],
  },
  'Basic AI': {
    foundations: ['Definition & Branches of AI', 'Turing Test & Intelligence Metrics', 'Rule-Based vs Learning Systems'],
    intermediate: ['Search Algorithms (BFS, DFS, A*)', 'Heuristics & State Spaces', 'Knowledge Representation'],
    advanced: ['Adversarial Search (Minimax & Alpha-Beta)', 'Propositional & First-Order Logic', 'Expert Systems & Inference Engines'],
    practices: [
      'Implement the A* pathfinding algorithm on grid graphs with Manhattan heuristic',
      'Build an adversarial Minimax game agent with alpha-beta pruning for Tic-Tac-Toe or Chess',
      'Construct a rule-based forward-chaining inference engine in code',
      'Compare breadth-first vs depth-first vs heuristic search on large state spaces',
    ],
  },
  'Machine Learning': {
    foundations: ['Supervised vs Unsupervised Learning', 'Features, Targets & Training Sets', 'Train/Test Split'],
    intermediate: ['Linear & Logistic Regression', 'Decision Trees & Random Forests', 'Evaluation Metrics (Precision, Recall, F1)', 'Cross-Validation & Regularization'],
    advanced: ['Gradient Boosting (XGBoost, LightGBM)', 'Clustering (K-Means, DBSCAN)', 'Dimensionality Reduction (PCA, t-SNE)', 'Hyperparameter Tuning & Pipelines'],
    practices: [
      'Build end-to-end scikit-learn pipelines with standard scalers, one-hot encoders, and estimators',
      'Perform hyperparameter tuning with GridSearchCV and cross-validated evaluation',
      'Diagnose overfitting using learning curves and apply L1/L2 regularization penalties',
      'Implement a customer segmentation pipeline combining PCA and K-Means clustering',
    ],
  },
  'Advanced AI': {
    foundations: ['Ensemble Methods', 'Prompt Engineering & Few-Shot Learning', 'Tokenization & Embeddings'],
    intermediate: ['Vector Databases & RAG Architecture', 'Fine-Tuning Techniques (LoRA, QLoRA)', 'Reinforcement Learning Basics (MDPs, Q-Learning)'],
    advanced: ['Multi-Agent Orchestration', 'Constitutional AI & Alignment (RLHF)', 'Diffusion Models & Latent Spaces', 'Autonomous Tool-Use Frameworks'],
    practices: [
      'Build a Retrieval-Augmented Generation (RAG) pipeline with semantic vector retrieval',
      'Fine-tune an open-weights model using parameter-efficient fine-tuning (LoRA)',
      'Construct a multi-agent debate workflow with autonomous tool-calling capabilities',
      'Implement Q-Learning with epsilon-greedy exploration in a discrete environment',
    ],
  },
  'Deep Learning': {
    foundations: ['Biological vs Artificial Neurons', 'Perceptrons & Activation Functions', 'Loss Functions & Gradients'],
    intermediate: ['Backpropagation & Gradient Descent', 'Convolutional Neural Networks (CNNs)', 'Recurrent Neural Networks (RNNs & LSTMs)', 'Regularization (Dropout & BatchNorm)'],
    advanced: ['Transformer Architecture & Self-Attention', 'Residual Networks & Skip Connections', 'Generative Adversarial Networks (GANs)', 'Model Quantization & Pruning'],
    practices: [
      'Build and train an image classification model using PyTorch or TensorFlow',
      'Implement scaled dot-product attention and multi-head attention from mathematical formulas',
      'Mitigate vanishing gradients in deep networks using residual blocks and batch normalization',
      'Quantize and export a pre-trained neural network for low-latency inference',
    ],
  },
  'Problem Solving': {
    foundations: ['Time & Space Complexity (Big O)', 'Array & String Manipulation', 'Basic Searching & Sorting'],
    intermediate: ['Two Pointers & Sliding Window', 'Recursion & Backtracking', 'Stacks, Queues & Hash Maps', 'Binary Search Variants'],
    advanced: ['Dynamic Programming (Memoization & Tabulation)', 'Graph Algorithms (Dijkstra, Topological Sort)', 'Tries & Disjoint Set Union (DSU)', 'Greedy Proofs & Interval Scheduling'],
    practices: [
      'Solve 15 classic dynamic programming problems (0/1 Knapsack, Coin Change, LCS)',
      'Implement graph traversal algorithms (Dijkstra shortest path, cycle detection)',
      'Master sliding window techniques for variable and fixed substring optimization',
      'Analyze worst-case and amortized time complexities for all algorithmic solutions',
    ],
  },
  'Pattern Recognition': {
    foundations: ['Feature Extraction & Normalization', 'Distance Metrics (Euclidean, Manhattan)', 'Nearest Neighbor Classification'],
    intermediate: ['K-Means & Hierarchical Clustering', 'Principal Component Analysis (PCA)', 'Curse of Dimensionality & Feature Selection', 'Bayesian Decision Theory'],
    advanced: ['Hidden Markov Models (HMMs)', 'Kernel Methods & Support Vector Machines', 'Non-linear Dimensionality Reduction (t-SNE, UMAP)', 'Expectation-Maximization Algorithm'],
    practices: [
      'Implement K-Means clustering from scratch with iterative centroid updates and inertia tracking',
      'Perform dimensionality reduction using PCA and visualize high-dimensional datasets',
      'Build a Bayesian classification model evaluating posterior probabilities from prior distributions',
      'Apply feature selection techniques to eliminate multicollinearity in high-dimensional feature spaces',
    ],
  },
};

/**
 * Generates an authentic, concept-grounded personalized learning recommendation
 * Calls Gemini API if available, with robust fallback strictly grounded in actual student assessment metrics.
 */
async function generatePersonalizedRecommendation({
  skill,
  overallStats,
  conceptAnalysis,
  userHistory = [],
  questionsReview = [],
}) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  if (GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 10) {
    try {
      const rec = await callGeminiForRecommendation(
        GEMINI_API_URL,
        skill,
        overallStats,
        conceptAnalysis,
        userHistory,
        questionsReview
      );
      const validation = validatePersonalizedRecommendation(rec);
      if (validation.valid) {
        return rec;
      }
      console.warn('Gemini recommendation failed validation:', validation.reason);
    } catch (err) {
      console.warn('Gemini recommendation call failed, using concept-grounded fallback:', err.message);
    }
  }

  // Authentic Concept-Grounded Fallback
  return generateFallbackPersonalizedRecommendation({
    skill,
    overallStats,
    conceptAnalysis,
    userHistory,
    questionsReview,
  });
}

async function callGeminiForRecommendation(url, skill, overallStats, conceptAnalysis, userHistory, questionsReview) {
  const conceptText = conceptAnalysis
    .map((c) => `- ${c.concept}: ${c.correct}/${c.attempted} correct (${c.accuracy}%) — Level: ${c.performanceLevel}`)
    .join('\n');

  const weakConcepts = conceptAnalysis.filter((c) => c.accuracy < 50 || c.performanceLevel === 'Needs Improvement').map((c) => c.concept);
  const strongConcepts = conceptAnalysis.filter((c) => c.accuracy >= 70 || c.performanceLevel === 'Strong').map((c) => c.concept);

  const historyText = userHistory && userHistory.length > 0
    ? userHistory.slice(-3).map((h) => `- Past ${h.skill}: Score ${h.score}/${h.total_questions} (${h.status})`).join('\n')
    : 'First recorded assessment for this student.';

  const prompt = `
You are an expert personalized tutor and learning strategist for Cognify.
Analyze the following student assessment data for the skill "${skill}" and produce a precise, structured learning roadmap.

ACTUAL STUDENT DATA:
Overall Performance:
- Total Questions: ${overallStats.totalQuestions}
- Correct Answers: ${overallStats.correctAnswers}
- Incorrect Answers: ${overallStats.incorrectAnswers}
- Overall Accuracy: ${overallStats.accuracy}%
- Highest Difficulty Reached: ${overallStats.highestDifficultyAchieved || 'Basic'}

Concept-Wise Breakdown:
${conceptText}

Identified Strong Concepts: ${strongConcepts.length > 0 ? strongConcepts.join(', ') : 'None demonstrated yet'}
Identified Weak Concepts: ${weakConcepts.length > 0 ? weakConcepts.join(', ') : 'None (strong overall baseline)'}

Assessment History:
${historyText}

CRITICAL INSTRUCTIONS:
1. Ground every recommendation STRICTLY in the student's actual performance above. DO NOT generate generic advice.
2. The recommendation MUST answer:
   a. What does the student already know? (populate "strengths")
   b. What are their weaknesses? (populate "weaknesses")
   c. Where should they start? (populate "starting_point")
   d. What should they learn next? (populate "next_topics")
   e. What should they practice? (populate "practice_recommendations")
   f. What level should they target next? (determine "skill_level" and mention target level in "summary")
3. Return valid JSON only adhering strictly to this schema:
{
  "skill_level": "Novice | Beginner | Intermediate | Advanced | Proficient",
  "strengths": [
    "Specific concept strength grounded in actual test data",
    "..."
  ],
  "weaknesses": [
    "Specific concept weakness grounded in actual test data",
    "..."
  ],
  "starting_point": "Immediate concrete topic or module to start with",
  "next_topics": [
    "Sequential topic 1 to learn next",
    "Sequential topic 2",
    "..."
  ],
  "practice_recommendations": [
    "Concrete hands-on coding drill or project 1",
    "Concrete hands-on coding drill or project 2"
  ],
  "summary": "Cohesive 2-4 sentence narrative explaining what the student knows, their specific weak areas, where to start, what to learn next, and what skill milestone they should target."
}
`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
    }),
    signal: AbortSignal.timeout(9000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini API.');
  const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Generates an authentic, deterministic, concept-grounded recommendation based directly on test telemetry
 */
function generateFallbackPersonalizedRecommendation({
  skill,
  overallStats,
  conceptAnalysis,
  userHistory = [],
  questionsReview = [],
}) {
  const curriculum = domainCurricula[skill] || domainCurricula['Problem Solving'];
  const accuracy = overallStats.accuracy || 0;
  const highestDiff = (overallStats.highestDifficultyAchieved || 'basic').toLowerCase();

  // 1. Determine Skill Level
  let skillLevel = 'Beginner';
  let targetNextLevel = 'Intermediate';

  if (accuracy >= 85 && highestDiff === 'advanced') {
    skillLevel = 'Advanced';
    targetNextLevel = 'Mastery / Production Specialist';
  } else if (accuracy >= 70) {
    skillLevel = 'Proficient';
    targetNextLevel = 'Advanced';
  } else if (accuracy >= 50) {
    skillLevel = 'Intermediate';
    targetNextLevel = 'Proficient';
  } else if (accuracy >= 30) {
    skillLevel = 'Beginner';
    targetNextLevel = 'Intermediate';
  } else {
    skillLevel = 'Novice';
    targetNextLevel = 'Beginner';
  }

  // 2. Identify Strengths & Weaknesses
  const strongConcepts = conceptAnalysis.filter((c) => c.accuracy >= 70 || c.performanceLevel === 'Strong');
  const weakConcepts = conceptAnalysis.filter((c) => c.accuracy < 50 || c.performanceLevel === 'Needs Improvement');
  const intermediateConcepts = conceptAnalysis.filter((c) => c.performanceLevel === 'Intermediate');

  const strengths = [];
  if (strongConcepts.length > 0) {
    strongConcepts.forEach((c) => {
      strengths.push(`Solid grasp of ${c.concept} with ${c.accuracy}% accuracy (${c.correct}/${c.attempted} correct).`);
    });
  } else if (overallStats.correctAnswers > 0) {
    strengths.push(`Successfully answered foundational questions at the ${highestDiff} tier.`);
  } else {
    strengths.push(`Familiarity with core terminology and introductory concepts in ${skill}.`);
  }

  const weaknesses = [];
  if (weakConcepts.length > 0) {
    weakConcepts.forEach((c) => {
      weaknesses.push(`Struggled with ${c.concept} (${c.accuracy}% accuracy, ${c.correct}/${c.attempted} correct).`);
    });
  } else if (intermediateConcepts.length > 0) {
    intermediateConcepts.forEach((c) => {
      weaknesses.push(`Inconsistent performance in ${c.concept} (${c.accuracy}% accuracy).`);
    });
  } else {
    weaknesses.push(`Minor edge-case optimizations and complex architectural patterns under strict time limits.`);
  }

  // 3. Where should they start?
  let startingPoint = '';
  if (weakConcepts.length > 0) {
    const primaryWeak = weakConcepts[0].concept;
    startingPoint = `Begin immediately with ${primaryWeak}, reviewing underlying syntax rules, parameter mechanics, and common error patterns.`;
  } else if (intermediateConcepts.length > 0) {
    const primaryMid = intermediateConcepts[0].concept;
    startingPoint = `Start by strengthening ${primaryMid} through targeted code walkthroughs before moving to higher-complexity topics.`;
  } else {
    startingPoint = `Start by exploring advanced real-world implementations and production performance patterns in ${skill}.`;
  }

  // 4. What should they learn next?
  let nextTopics = [];
  if (skillLevel === 'Novice' || skillLevel === 'Beginner') {
    nextTopics = [...curriculum.foundations, ...(curriculum.intermediate.slice(0, 2))];
  } else if (skillLevel === 'Intermediate' || skillLevel === 'Proficient') {
    nextTopics = [...(curriculum.intermediate.slice(1)), ...(curriculum.advanced.slice(0, 2))];
  } else {
    nextTopics = [...curriculum.advanced, 'Architectural Design Patterns & Production Scaling'];
  }

  // 5. What should they practice?
  const practiceRecommendations = curriculum.practices && curriculum.practices.length > 0
    ? curriculum.practices.slice(0, 3)
    : [
        `Implement small standalone scripts demonstrating each core concept in ${skill}`,
        `Write comprehensive unit tests covering edge cases and invalid inputs`,
        `Build a hands-on project integrating multiple concepts together`,
      ];

  // 6. Narrative Summary
  const strongNames = strongConcepts.map((c) => c.concept).join(', ');
  const weakNames = weakConcepts.map((c) => c.concept).join(', ');

  let summaryNarrative = '';
  if (strongNames && weakNames) {
    summaryNarrative = `Your ${skill} fundamentals in ${strongNames} are strong, but your understanding of ${weakNames} needs improvement. Start with ${startingPoint.toLowerCase()} Then advance to ${nextTopics.slice(0, 2).join(' and ')} to target ${targetNextLevel} proficiency.`;
  } else if (weakNames) {
    summaryNarrative = `Your assessment highlighted significant opportunities in ${weakNames}. ${startingPoint} Complete targeted practical exercises to solidify core concepts and aim for ${targetNextLevel} level next.`;
  } else {
    summaryNarrative = `Outstanding performance! You demonstrated comprehensive mastery across ${strongNames || 'all evaluated concepts'} with ${accuracy}% accuracy. Proceed directly to ${nextTopics[0]} and advanced production challenges to reach ${targetNextLevel} status.`;
  }

  return {
    skill_level: skillLevel,
    strengths,
    weaknesses,
    starting_point: startingPoint,
    next_topics: nextTopics,
    practice_recommendations: practiceRecommendations,
    summary: summaryNarrative,
  };
}

module.exports = {
  generateQuestionsForSkill,
  generateNextAdaptiveQuestion,
  generateGatekeeperRecommendation,
  generatePersonalizedRecommendation,
  validatePersonalizedRecommendation,
  validateQuestionsResponse,
  validateSingleQuestion,
  isQuestionDuplicated,
  normalizeQuestion,
  dynamicSkillPools,
  domainCurricula,
};

