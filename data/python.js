const pythonQuestions = [

            {
                        id: 1,
                        question: "What is the key difference between a list and a tuple in Python?",
                        options: [
                                    "Lists are immutable while tuples are mutable",
                                    "Lists are mutable while tuples are immutable",
                                    "Both are immutable",
                                    "Both are mutable"
                        ],
                        answer: "Lists are mutable while tuples are immutable",
                        concept: "Data Structures"
            },

            {
                        id: 2,
                        question: "What does the Python GIL primarily affect?",
                        options: [
                                    "Database transactions",
                                    "Execution of Python bytecode by multiple threads in CPython",
                                    "Memory allocation in all Python implementations",
                                    "File permissions"
                        ],
                        answer: "Execution of Python bytecode by multiple threads in CPython",
                        concept: "Concurrency"
            },

            {
                        id: 3,
                        question: "What is a generator in Python?",
                        options: [
                                    "A class that creates objects",
                                    "A function that yields values lazily",
                                    "A database connector",
                                    "A compiled module"
                        ],
                        answer: "A function that yields values lazily",
                        concept: "Generators"
            },

            {
                        id: 4,
                        question: "What is the purpose of __init__() in a Python class?",
                        options: [
                                    "Destroy an object",
                                    "Initialize an instance",
                                    "Create a module",
                                    "Handle exceptions globally"
                        ],
                        answer: "Initialize an instance",
                        concept: "OOP"
            },

            {
                        id: 5,
                        question: "What is a decorator in Python primarily used for?",
                        options: [
                                    "Changing Python syntax",
                                    "Modifying or extending function/class behavior",
                                    "Creating database tables",
                                    "Managing memory manually"
                        ],
                        answer: "Modifying or extending function/class behavior",
                        concept: "Decorators"
            },

            {
                        id: 6,
                        question: "What does the with statement commonly provide in Python?",
                        options: [
                                    "Automatic resource management",
                                    "Automatic multithreading",
                                    "Automatic type conversion",
                                    "Automatic inheritance"
                        ],
                        answer: "Automatic resource management",
                        concept: "Context Managers"
            },

            {
                        id: 7,
                        question: "Which statement about shallow copy is correct?",
                        options: [
                                    "It recursively copies every nested object",
                                    "It copies the outer object but may share nested objects",
                                    "It always creates an immutable object",
                                    "It only works with strings"
                        ],
                        answer: "It copies the outer object but may share nested objects",
                        concept: "Copying"
            },

            {
                        id: 8,
                        question: "What does list comprehension primarily provide?",
                        options: [
                                    "A way to create lists using a concise expression",
                                    "A database query mechanism",
                                    "A multithreading mechanism",
                                    "A memory allocation API"
                        ],
                        answer: "A way to create lists using a concise expression",
                        concept: "Comprehensions"
            },

            {
                        id: 9,
                        question: "What is the purpose of __slots__ in Python classes?",
                        options: [
                                    "To force multiple inheritance",
                                    "To restrict instance attributes and potentially reduce memory usage",
                                    "To enable garbage collection",
                                    "To make every method static"
                        ],
                        answer: "To restrict instance attributes and potentially reduce memory usage",
                        concept: "Memory Optimization"
            },

            {
                        id: 10,
                        question: "What does Python's LEGB rule describe?",
                        options: [
                                    "How packages are installed",
                                    "How variable names are resolved",
                                    "How files are compiled",
                                    "How exceptions are inherited"
                        ],
                        answer: "How variable names are resolved",
                        concept: "Scope"
            }

];

window.pythonQuestions = pythonQuestions;