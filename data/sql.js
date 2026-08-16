const sqlQuestions = [

            {
                        id: 1,
                        question: "Which SQL clause is used to filter groups after GROUP BY?",
                        options: [
                                    "WHERE",
                                    "HAVING",
                                    "FILTER",
                                    "ORDER BY"
                        ],
                        answer: "HAVING",
                        concept: "Aggregation"
            },

            {
                        id: 2,
                        question: "What is the primary difference between WHERE and HAVING?",
                        options: [
                                    "WHERE filters rows before grouping, HAVING filters groups after grouping",
                                    "WHERE filters groups while HAVING filters rows",
                                    "They are always identical",
                                    "WHERE is only used with INSERT"
                        ],
                        answer: "WHERE filters rows before grouping, HAVING filters groups after grouping",
                        concept: "Query Processing"
            },

            {
                        id: 3,
                        question: "Which JOIN returns all rows from the left table and matching rows from the right table?",
                        options: [
                                    "INNER JOIN",
                                    "RIGHT JOIN",
                                    "LEFT JOIN",
                                    "CROSS JOIN"
                        ],
                        answer: "LEFT JOIN",
                        concept: "Joins"
            },

            {
                        id: 4,
                        question: "What is normalization primarily intended to reduce?",
                        options: [
                                    "Query syntax",
                                    "Data redundancy and update anomalies",
                                    "Number of indexes",
                                    "Number of users"
                        ],
                        answer: "Data redundancy and update anomalies",
                        concept: "Normalization"
            },

            {
                        id: 5,
                        question: "Which normal form removes partial dependency on a composite key?",
                        options: [
                                    "1NF",
                                    "2NF",
                                    "3NF",
                                    "BCNF"
                        ],
                        answer: "2NF",
                        concept: "Normalization"
            },

            {
                        id: 6,
                        question: "What does an index primarily improve?",
                        options: [
                                    "INSERT correctness",
                                    "Data retrieval performance",
                                    "Database normalization",
                                    "Table size in every case"
                        ],
                        answer: "Data retrieval performance",
                        concept: "Indexing"
            },

            {
                        id: 7,
                        question: "Which transaction property guarantees that committed changes survive system failure?",
                        options: [
                                    "Atomicity",
                                    "Consistency",
                                    "Isolation",
                                    "Durability"
                        ],
                        answer: "Durability",
                        concept: "ACID"
            },

            {
                        id: 8,
                        question: "What can a deadlock occur from in a database system?",
                        options: [
                                    "Two transactions waiting indefinitely for resources held by each other",
                                    "Two SELECT queries running together",
                                    "Using a primary key",
                                    "Creating an index"
                        ],
                        answer: "Two transactions waiting indefinitely for resources held by each other",
                        concept: "Transactions"
            },

            {
                        id: 9,
                        question: "Which window function assigns a sequential number to rows within a partition?",
                        options: [
                                    "COUNT()",
                                    "ROW_NUMBER()",
                                    "GROUP_NUMBER()",
                                    "SEQUENCE()"
                        ],
                        answer: "ROW_NUMBER()",
                        concept: "Window Functions"
            },

            {
                        id: 10,
                        question: "What is the purpose of a database transaction?",
                        options: [
                                    "To combine multiple operations into a controlled atomic unit",
                                    "To permanently delete tables",
                                    "To create indexes automatically",
                                    "To replace primary keys"
                        ],
                        answer: "To combine multiple operations into a controlled atomic unit",
                        concept: "Transactions"
            }

];

window.sqlQuestions = sqlQuestions;