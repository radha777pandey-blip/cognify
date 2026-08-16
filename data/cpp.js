const cppQuestions = [

            {
                        id: 1,
                        question: "What is the purpose of a virtual destructor in C++?",
                        options: [
                                    "To prevent object creation",
                                    "To ensure the derived destructor is called through a base pointer",
                                    "To make the destructor static",
                                    "To prevent inheritance"
                        ],
                        answer: "To ensure the derived destructor is called through a base pointer",
                        concept: "Polymorphism"
            },

            {
                        id: 2,
                        question: "What does std::move actually do in C++?",
                        options: [
                                    "It physically moves an object to another memory location",
                                    "It converts an expression into an rvalue reference",
                                    "It copies the object into another object",
                                    "It automatically allocates heap memory"
                        ],
                        answer: "It converts an expression into an rvalue reference",
                        concept: "Move Semantics"
            },

            {
                        id: 3,
                        question: "Which feature allows a class to have multiple functions with the same name but different parameters?",
                        options: [
                                    "Overriding",
                                    "Overloading",
                                    "Encapsulation",
                                    "Abstraction"
                        ],
                        answer: "Overloading",
                        concept: "Polymorphism"
            },

            {
                        id: 4,
                        question: "What is the Rule of Five related to?",
                        options: [
                                    "Five types of inheritance",
                                    "Five special member functions associated with resource management",
                                    "Five access specifiers",
                                    "Five types of constructors"
                        ],
                        answer: "Five special member functions associated with resource management",
                        concept: "Resource Management"
            },

            {
                        id: 5,
                        question: "Which smart pointer provides exclusive ownership of a dynamically allocated object?",
                        options: [
                                    "shared_ptr",
                                    "weak_ptr",
                                    "unique_ptr",
                                    "auto_ptr"
                        ],
                        answer: "unique_ptr",
                        concept: "Smart Pointers"
            },

            {
                        id: 6,
                        question: "What happens when a std::shared_ptr reference count reaches zero?",
                        options: [
                                    "The object becomes static",
                                    "The managed object is destroyed",
                                    "The pointer becomes a raw pointer",
                                    "The object is moved to the stack"
                        ],
                        answer: "The managed object is destroyed",
                        concept: "Smart Pointers"
            },

            {
                        id: 7,
                        question: "Which mechanism is used to enable runtime polymorphism in C++?",
                        options: [
                                    "Templates only",
                                    "Virtual functions",
                                    "Macros",
                                    "Namespaces"
                        ],
                        answer: "Virtual functions",
                        concept: "Runtime Polymorphism"
            },

            {
                        id: 8,
                        question: "What is object slicing in C++?",
                        options: [
                                    "Deleting part of an object",
                                    "Copying a derived object into a base object and losing derived-specific state",
                                    "Splitting a class into multiple classes",
                                    "Removing virtual functions"
                        ],
                        answer: "Copying a derived object into a base object and losing derived-specific state",
                        concept: "Inheritance"
            },

            {
                        id: 9,
                        question: "What is the main advantage of templates in C++?",
                        options: [
                                    "They provide runtime type checking",
                                    "They enable generic programming",
                                    "They eliminate all memory allocation",
                                    "They replace inheritance completely"
                        ],
                        answer: "They enable generic programming",
                        concept: "Templates"
            },

            {
                        id: 10,
                        question: "Which cast is specifically designed for safe downcasting in polymorphic class hierarchies?",
                        options: [
                                    "static_cast",
                                    "reinterpret_cast",
                                    "dynamic_cast",
                                    "const_cast"
                        ],
                        answer: "dynamic_cast",
                        concept: "Type Casting"
            }

];

window.cppQuestions = cppQuestions;