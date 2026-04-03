const mongoose = require("mongoose");
const Stage = require("../models/Stage");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const seedStages = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) throw new Error("MONGO_URI not found");

        await mongoose.connect(mongoUri);
        await Stage.deleteMany({});

        const stages = [
            // --- TRAINING CATEGORY (Basic) ---
            {
                title: "JavaScript Basics",
                category: "training",
                level: 1,
                difficulty: "beginner",
                description: "Master the fundamental syntax of JavaScript.",
                challenges: [
                    {
                        id: 1,
                        title: "JS: Hello World",
                        description: "Create a function 'hello' that returns 'Hello World'.",
                        starterCode: "function hello() {\n  // Your code here\n}",
                        language: "javascript",
                        tests: "return hello() === 'Hello World';"
                    },
                    {
                        id: 2,
                        title: "JS: Addition",
                        description: "Create a function 'add(a, b)' that returns a + b.",
                        starterCode: "function add(a, b) {\n  // The sum of a and b\n}",
                        language: "javascript",
                        tests: "return add(5, 10) === 15;"
                    }
                ]
            },
            {
                title: "Python 101",
                category: "training",
                level: 2,
                difficulty: "beginner",
                description: "Introduction to Python programming.",
                challenges: [
                    {
                        id: 3,
                        title: "PY: Hello Python",
                        description: "Create a function 'hello' that returns 'Python is cool'.",
                        starterCode: "def hello():\n    # Your code here\n    pass",
                        language: "python",
                        tests: ""
                    },
                    {
                        id: 4,
                        title: "PY: Multiply",
                        description: "Create a function 'mult(a, b)' that returns a * b.",
                        starterCode: "def mult(a, b):\n    # Return the product\n    pass",
                        language: "python",
                        tests: ""
                    }
                ]
            },
            {
                title: "JS: Array Operations",
                category: "training",
                level: 3,
                difficulty: "beginner",
                description: "Learn how to manipulate arrays in JS.",
                challenges: [
                    {
                        id: 5,
                        title: "JS: Array Length",
                        description: "Create a function 'countElements(arr)' that returns the length of the array.",
                        starterCode: "function countElements(arr) {\n  // return...? \n}",
                        language: "javascript",
                        tests: "return countElements([1,2,3]) === 3;"
                    },
                    {
                        id: 6,
                        title: "JS: First Element",
                        description: "Create a function 'first(arr)' that returns the first element.",
                        starterCode: "function first(arr) {\n  // Accessing index...\n}",
                        language: "javascript",
                        tests: "return first([7, 8, 9]) === 7;"
                    }
                ]
            },
            {
                title: "PY: Data Types",
                category: "training",
                level: 4,
                difficulty: "beginner",
                description: "Understanding variables and types in Python.",
                challenges: [
                    {
                        id: 7,
                        title: "PY: Addition",
                        description: "Create a function 'add(a, b)' that returns the sum of a and b.",
                        starterCode: "def add(a, b):\n    # Python sum\n    pass",
                        language: "python",
                        tests: ""
                    },
                    {
                        id: 8,
                        title: "PY: String Concatenation",
                        description: "Create a function 'greet(name)' that returns 'Hello ' + name.",
                        starterCode: "def greet(name):\n    # Greeting logic\n    pass",
                        language: "python",
                        tests: ""
                    }
                ]
            },

            // --- MISSION CATEGORY (Harder) ---
            {
                title: "Blue Castle - Foundations",
                category: "mission",
                level: 1,
                difficulty: "intermediate",
                description: "Independent Stage: Building the base logic of the fortress.",
                challenges: [
                    {
                        id: 9,
                        title: "JS: Array Architect",
                        description: "Create a function 'processData(arr)' that returns the sum of all EVEN numbers in the array.",
                        starterCode: "function processData(arr) {\n  // Logic for the foundations\n}",
                        language: "javascript",
                        tests: "return processData([1,2,3,4,6]) === 12;"
                    }
                ]
            },
            {
                title: "Red Castle - Intermediate",
                category: "mission",
                level: 2,
                difficulty: "advanced",
                description: "Independent Stage: Securing the perimeter with Python algorithms.",
                challenges: [
                    {
                        id: 10,
                        title: "PY: Square Number",
                        description: "Create a function 'square(n)' that returns the square of n.",
                        starterCode: "def square(n):\n    # Perimeter calculation\n    pass",
                        language: "python",
                        tests: ""
                    }
                ]
            },
            {
                title: "Brown Castle - Advanced",
                category: "mission",
                level: 3,
                difficulty: "advanced",
                description: "Independent Stage: Complex defensive structures.",
                challenges: [
                    {
                        id: 11,
                        title: "PY: List Length",
                        description: "Create a function 'getLength(lst)' that returns the length of lst.",
                        starterCode: "def getLength(lst):\n    # Measuring defenses\n    pass",
                        language: "python",
                        tests: ""
                    }
                ]
            },
            {
                title: "Purple Castle - Master",
                category: "mission",
                level: 4,
                difficulty: "expert",
                description: "Independent Stage: Final fortress optimization.",
                challenges: [
                    {
                        id: 12,
                        title: "JS: Performance Watcher",
                        description: "Create a function 'isPrime(n)' that returns true if n is prime.",
                        starterCode: "function isPrime(n) {\n  // Optimize core loop\n}",
                        language: "javascript",
                        tests: "return isPrime(7) === true && isPrime(10) === false;"
                    }
                ]
            }
        ];

        await Stage.insertMany(stages);
        console.log("Database seeded successfully with EMPTY starters!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seedStages();
