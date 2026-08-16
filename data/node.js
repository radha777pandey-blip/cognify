const nodeQuestions = [

            {
                        id: 1,
                        question: "What runtime engine does Node.js use to execute JavaScript?",
                        options: [
                                    "SpiderMonkey",
                                    "V8",
                                    "JavaScriptCore",
                                    "Chakra"
                        ],
                        answer: "V8",
                        concept: "Node.js Runtime"
            },

            {
                        id: 2,
                        question: "Why is Node.js well suited for I/O-heavy applications?",
                        options: [
                                    "It creates a new thread for every request",
                                    "It uses an event-driven, non-blocking I/O model",
                                    "It does not support asynchronous operations",
                                    "It executes all requests sequentially"
                        ],
                        answer: "It uses an event-driven, non-blocking I/O model",
                        concept: "Event Loop"
            },

            {
                        id: 3,
                        question: "What is the purpose of package.json in a Node.js project?",
                        options: [
                                    "It stores only HTML",
                                    "It describes project metadata, scripts, and dependencies",
                                    "It replaces server.js",
                                    "It stores database records"
                        ],
                        answer: "It describes project metadata, scripts, and dependencies",
                        concept: "NPM"
            },

            {
                        id: 4,
                        question: "What is middleware in Express.js?",
                        options: [
                                    "A database table",
                                    "A function that can access the request, response, and next middleware",
                                    "A frontend CSS file",
                                    "A Node.js compiler"
                        ],
                        answer: "A function that can access the request, response, and next middleware",
                        concept: "Express.js"
            },

            {
                        id: 5,
                        question: "What does the next() function typically do in Express middleware?",
                        options: [
                                    "Stops the server",
                                    "Passes control to the next middleware or route handler",
                                    "Restarts Node.js",
                                    "Creates a new database"
                        ],
                        answer: "Passes control to the next middleware or route handler",
                        concept: "Express Middleware"
            },

            {
                        id: 6,
                        question: "What is the purpose of process.nextTick()?",
                        options: [
                                    "To execute a callback after the entire application terminates",
                                    "To schedule a callback to run before the event loop continues to later phases",
                                    "To create a new process",
                                    "To block the event loop"
                        ],
                        answer: "To schedule a callback to run before the event loop continues to later phases",
                        concept: "Event Loop"
            },

            {
                        id: 7,
                        question: "What is a Buffer in Node.js primarily used for?",
                        options: [
                                    "Representing raw binary data",
                                    "Creating HTML pages",
                                    "Storing CSS rules",
                                    "Managing database schemas"
                        ],
                        answer: "Representing raw binary data",
                        concept: "Buffers"
            },

            {
                        id: 8,
                        question: "What is the purpose of streams in Node.js?",
                        options: [
                                    "To process data incrementally instead of loading everything into memory",
                                    "To disable asynchronous operations",
                                    "To replace JavaScript functions",
                                    "To create CSS animations"
                        ],
                        answer: "To process data incrementally instead of loading everything into memory",
                        concept: "Streams"
            },

            {
                        id: 9,
                        question: "Which module is commonly used to create an HTTP server without Express?",
                        options: [
                                    "fs",
                                    "http",
                                    "path",
                                    "events"
                        ],
                        answer: "http",
                        concept: "HTTP"
            },

            {
                        id: 10,
                        question: "What is the primary benefit of clustering in Node.js?",
                        options: [
                                    "To eliminate JavaScript",
                                    "To utilize multiple CPU cores by running multiple Node.js processes",
                                    "To make synchronous I/O faster",
                                    "To replace the event loop"
                        ],
                        answer: "To utilize multiple CPU cores by running multiple Node.js processes",
                        concept: "Scalability"
            }

];

window.nodeQuestions = nodeQuestions;