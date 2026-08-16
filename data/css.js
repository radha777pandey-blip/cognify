const cssQuestions = [

            {
                        id: 1,
                        question: "Which CSS layout system is specifically designed for two-dimensional layouts?",
                        options: [
                                    "Flexbox",
                                    "Grid",
                                    "Float",
                                    "Inline-block"
                        ],
                        answer: "Grid",
                        concept: "CSS Grid"
            },

            {
                        id: 2,
                        question: "What does box-sizing: border-box do?",
                        options: [
                                    "It excludes padding from width calculation",
                                    "It includes padding and border within the declared width and height",
                                    "It removes the border",
                                    "It disables the box model"
                        ],
                        answer: "It includes padding and border within the declared width and height",
                        concept: "Box Model"
            },

            {
                        id: 3,
                        question: "Which selector has the highest specificity?",
                        options: [
                                    ".container",
                                    "#header",
                                    "div",
                                    "*"
                        ],
                        answer: "#header",
                        concept: "Specificity"
            },

            {
                        id: 4,
                        question: "What is the purpose of z-index?",
                        options: [
                                    "Control horizontal spacing",
                                    "Control stacking order of positioned elements",
                                    "Change font size",
                                    "Control grid columns"
                        ],
                        answer: "Control stacking order of positioned elements",
                        concept: "Positioning"
            },

            {
                        id: 5,
                        question: "What is the difference between em and rem?",
                        options: [
                                    "em is relative to root font size and rem to parent",
                                    "rem is relative to root font size while em can depend on the parent",
                                    "Both are always equal",
                                    "Both are absolute units"
                        ],
                        answer: "rem is relative to root font size while em can depend on the parent",
                        concept: "CSS Units"
            },

            {
                        id: 6,
                        question: "Which Flexbox property controls alignment along the main axis?",
                        options: [
                                    "align-items",
                                    "justify-content",
                                    "align-content",
                                    "place-items"
                        ],
                        answer: "justify-content",
                        concept: "Flexbox"
            },

            {
                        id: 7,
                        question: "What does position: absolute position an element relative to?",
                        options: [
                                    "Always the viewport",
                                    "The nearest positioned ancestor",
                                    "Always the body",
                                    "The nearest flex container only"
                        ],
                        answer: "The nearest positioned ancestor",
                        concept: "Positioning"
            },

            {
                        id: 8,
                        question: "What does the CSS pseudo-class :nth-child(2) select?",
                        options: [
                                    "The second element of every class",
                                    "An element that is the second child of its parent",
                                    "The second occurrence of a CSS rule",
                                    "All even elements"
                        ],
                        answer: "An element that is the second child of its parent",
                        concept: "Selectors"
            },

            {
                        id: 9,
                        question: "Which CSS feature allows custom reusable properties?",
                        options: [
                                    "Variables using --property-name",
                                    "Macros",
                                    "Constants using const",
                                    "CSS functions only"
                        ],
                        answer: "Variables using --property-name",
                        concept: "CSS Variables"
            },

            {
                        id: 10,
                        question: "What is the main purpose of a media query?",
                        options: [
                                    "To query a database",
                                    "To apply CSS based on device or viewport conditions",
                                    "To load JavaScript",
                                    "To create animations"
                        ],
                        answer: "To apply CSS based on device or viewport conditions",
                        concept: "Responsive Design"
            }

];

window.cssQuestions = cssQuestions;