const javaQuestions = [

            {
                        id: 1,
                        question: "Which keyword is used for inheritance?",
                        options: [
                                    "extends",
                                    "implements",
                                    "inherits",
                                    "super"
                        ],
                        answer: "extends",
                        concept: "OOP"
            },

            {
                        id: 2,
                        question: "Which collection stores duplicate elements?",
                        options: [
                                    "HashSet",
                                    "TreeSet",
                                    "ArrayList",
                                    "Set"
                        ],
                        answer: "ArrayList",
                        concept: "Collections"
            },

            {
                        id: 3,
                        question: "Which exception is unchecked?",
                        options: [
                                    "IOException",
                                    "SQLException",
                                    "NullPointerException",
                                    "FileNotFoundException"
                        ],
                        answer: "NullPointerException",
                        concept: "Exception"
            },

            {
                        id: 4,
                        question: "Which statement about HashMap is correct?",
                        options: [
                                    "It guarantees insertion order",
                                    "It allows one null key",
                                    "It is synchronized by default",
                                    "It sorts keys automatically"
                        ],
                        answer: "It allows one null key",
                        concept: "Collections"
            },

            {
                        id: 5,
                        question: "What happens when an unchecked exception is not handled?",
                        options: [
                                    "The compiler automatically handles it",
                                    "The JVM terminates the current thread if it propagates uncaught",
                                    "It becomes a checked exception",
                                    "It is ignored"
                        ],
                        answer: "The JVM terminates the current thread if it propagates uncaught",
                        concept: "Exception Handling"
            },

            {
                        id: 6,
                        question: "Which principle allows an interface to contain default method implementations?",
                        options: [
                                    "Default methods",
                                    "Static inheritance",
                                    "Constructor inheritance",
                                    "Multiple class inheritance"
                        ],
                        answer: "Default methods",
                        concept: "Interfaces"
            },

            {
                        id: 7,
                        question: "What is the main difference between == and equals() for objects?",
                        options: [
                                    "Both always compare object content",
                                    "== compares references while equals() can compare logical content",
                                    "equals() compares references only",
                                    "== cannot be used with objects"
                        ],
                        answer: "== compares references while equals() can compare logical content",
                        concept: "Object Comparison"
            },

            {
                        id: 8,
                        question: "Which garbage collector concept identifies objects that can no longer be reached from GC roots?",
                        options: [
                                    "Method overloading",
                                    "Reachability analysis",
                                    "Encapsulation",
                                    "Bytecode verification"
                        ],
                        answer: "Reachability analysis",
                        concept: "Garbage Collection"
            },

            {
                        id: 9,
                        question: "What problem can occur when two threads acquire two locks in opposite order?",
                        options: [
                                    "Starvation only",
                                    "Deadlock",
                                    "Compilation error",
                                    "Garbage collection"
                        ],
                        answer: "Deadlock",
                        concept: "Concurrency"
            },

            {
                        id: 10,
                        question: "Which Java feature allows a method to execute different implementations depending on the runtime object?",
                        options: [
                                    "Compile-time constants",
                                    "Runtime polymorphism",
                                    "Packages",
                                    "Primitive casting"
                        ],
                        answer: "Runtime polymorphism",
                        concept: "OOP"
            }

];


window.javaQuestions = javaQuestions;