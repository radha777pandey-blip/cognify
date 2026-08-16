const javascriptQuestions = [

            {
                        id: 1,
                        question: "What is a closure in JavaScript?",
                        options: [
                                    "A function that has access to its lexical environment even after the outer function returns",
                                    "A function without parameters",
                                    "A class constructor",
                                    "A special type of loop"
                        ],
                        answer: "A function that has access to its lexical environment even after the outer function returns",
                        concept: "Closures"
            },

            {
                        id: 2,
                        question: "What is the difference between == and ===?",
                        options: [
                                    "They are identical",
                                    "== performs type coercion while === performs strict comparison",
                                    "=== performs type coercion while == does not",
                                    "Both compare only object references"
                        ],
                        answer: "== performs type coercion while === performs strict comparison",
                        concept: "Type Coercion"
            },

            {
                        id: 3,
                        question: "What is the event loop responsible for?",
                        options: [
                                    "Compiling JavaScript",
                                    "Coordinating asynchronous callbacks and the call stack",
                                    "Creating HTML elements only",
                                    "Managing CSS"
                        ],
                        answer: "Coordinating asynchronous callbacks and the call stack",
                        concept: "Asynchronous JavaScript"
            },

            {
                        id: 4,
                        question: "Which keyword creates a block-scoped variable that cannot be reassigned?",
                        options: [
                                    "var",
                                    "let",
                                    "const",
                                    "static"
                        ],
                        answer: "const",
                        concept: "Variables"
            },

            {
                        id: 5,
                        question: "What does Promise.all() do?",
                        options: [
                                    "Executes promises sequentially",
                                    "Waits for all promises to fulfill or rejects when one rejects",
                                    "Only executes the first promise",
                                    "Converts promises into callbacks"
                        ],
                        answer: "Waits for all promises to fulfill or rejects when one rejects",
                        concept: "Promises"
            },

            {
                        id: 6,
                        question: "What is hoisting in JavaScript?",
                        options: [
                                    "Moving all code physically to the top",
                                    "The behavior where declarations are processed before execution within their scope",
                                    "Converting JavaScript to HTML",
                                    "Moving variables to heap memory"
                        ],
                        answer: "The behavior where declarations are processed before execution within their scope",
                        concept: "Execution Context"
            },

            {
                        id: 7,
                        question: "What does the spread operator (...) do when used with an array?",
                        options: [
                                    "Deletes the array",
                                    "Expands iterable elements into individual elements",
                                    "Freezes the array",
                                    "Converts the array into a string"
                        ],
                        answer: "Expands iterable elements into individual elements",
                        concept: "ES6"
            },

            {
                        id: 8,
                        question: "What is event delegation?",
                        options: [
                                    "Assigning separate listeners to every child",
                                    "Handling events on a common ancestor using event bubbling",
                                    "Preventing all browser events",
                                    "Creating custom HTML events only"
                        ],
                        answer: "Handling events on a common ancestor using event bubbling",
                        concept: "DOM Events"
            },

            {
                        id: 9,
                        question: "What is the purpose of async/await?",
                        options: [
                                    "To make synchronous code execute faster",
                                    "To simplify handling of asynchronous Promises",
                                    "To eliminate Promises",
                                    "To create multiple JavaScript engines"
                        ],
                        answer: "To simplify handling of asynchronous Promises",
                        concept: "Asynchronous JavaScript"
            },

            {
                        id: 10,
                        question: "What is the Temporal Dead Zone associated with?",
                        options: [
                                    "var variables",
                                    "let and const declarations before initialization",
                                    "Functions only",
                                    "Objects created with new"
                        ],
                        answer: "let and const declarations before initialization",
                        concept: "Scope"
            }

];

window.javascriptQuestions = javascriptQuestions;