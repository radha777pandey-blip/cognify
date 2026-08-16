const cQuestions = [

            {
                        id: 1,
                        question: "What is the output of the following C code?\nint x = 10; printf(\"%d %d\", x++, ++x);",
                        options: [
                                    "10 12",
                                    "11 12",
                                    "Undefined behavior",
                                    "10 11"
                        ],
                        answer: "Undefined behavior",
                        concept: "Undefined Behavior"
            },

            {
                        id: 2,
                        question: "Which statement correctly describes a dangling pointer in C?",
                        options: [
                                    "A pointer that points to NULL",
                                    "A pointer that points to memory that has already been freed",
                                    "A pointer that points to a constant",
                                    "A pointer that has not been initialized"
                        ],
                        answer: "A pointer that points to memory that has already been freed",
                        concept: "Pointers"
            },

            {
                        id: 3,
                        question: "What does the static keyword on a local variable inside a function do?",
                        options: [
                                    "Allocates the variable on the stack every time",
                                    "Preserves the variable's value between function calls",
                                    "Makes the variable accessible globally",
                                    "Makes the variable constant"
                        ],
                        answer: "Preserves the variable's value between function calls",
                        concept: "Storage Classes"
            },

            {
                        id: 4,
                        question: "Which statement about realloc() is correct?",
                        options: [
                                    "It always preserves the original memory address",
                                    "It releases memory without allocating new memory",
                                    "It may move the allocated block to a new memory location",
                                    "It can only increase memory size"
                        ],
                        answer: "It may move the allocated block to a new memory location",
                        concept: "Dynamic Memory"
            },

            {
                        id: 5,
                        question: "What is the purpose of the volatile qualifier in C?",
                        options: [
                                    "It makes a variable immutable",
                                    "It prevents compiler optimization of accesses to the variable",
                                    "It allocates the variable in heap memory",
                                    "It makes access to the variable atomic"
                        ],
                        answer: "It prevents compiler optimization of accesses to the variable",
                        concept: "Volatile"
            },

            {
                        id: 6,
                        question: "What happens when a structure is passed to a function by value?",
                        options: [
                                    "Only its address is passed",
                                    "A complete copy of the structure is passed",
                                    "The structure becomes global",
                                    "The structure is automatically converted to a pointer"
                        ],
                        answer: "A complete copy of the structure is passed",
                        concept: "Structures"
            },

            {
                        id: 7,
                        question: "Which declaration represents a pointer to a function returning int and accepting two int arguments?",
                        options: [
                                    "int *f(int, int)",
                                    "int (*f)(int, int)",
                                    "int f*(int, int)",
                                    "(*int f)(int, int)"
                        ],
                        answer: "int (*f)(int, int)",
                        concept: "Function Pointers"
            },

            {
                        id: 8,
                        question: "What is the primary purpose of the restrict qualifier?",
                        options: [
                                    "To make a pointer constant",
                                    "To indicate that an object is accessed only through that pointer for optimization purposes",
                                    "To prevent dynamic allocation",
                                    "To convert a pointer into a reference"
                        ],
                        answer: "To indicate that an object is accessed only through that pointer for optimization purposes",
                        concept: "Pointers"
            },

            {
                        id: 9,
                        question: "Which memory area typically stores dynamically allocated memory using malloc()?",
                        options: [
                                    "Stack",
                                    "Heap",
                                    "Register",
                                    "Text segment"
                        ],
                        answer: "Heap",
                        concept: "Memory Management"
            },

            {
                        id: 10,
                        question: "What is the result of dereferencing a NULL pointer in C?",
                        options: [
                                    "It returns zero",
                                    "It automatically allocates memory",
                                    "It results in undefined behavior",
                                    "It throws a standard C exception"
                        ],
                        answer: "It results in undefined behavior",
                        concept: "Pointers"
            }

];

window.cQuestions = cQuestions;