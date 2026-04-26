const mongoose = require("mongoose");
const path = require("path");
const Stage = require("../models/Stage");
const Challenge = require("../models/Challenge");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const seedStages = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI not found");

    await mongoose.connect(mongoUri);
    await Challenge.deleteMany({ type: "Stage" });
    await Stage.deleteMany({});

    const challengeDocs = await Challenge.insertMany([
      // --- TRAINING (BASICS) ---
      {
        title: "JS: Greet Function",
        description: "Create a function 'greet' that returns 'Hello World'.",
        difficulty: "easy",
        language: "javascript",
        category: "training",
        type: "Stage",
        starterCode: "function greet() {\n  // Your code here\n}",
        testCases: [{ name: "returns greeting", assertion: "greet() === 'Hello World'" }],
      },
      {
        title: "JS: Sum Function",
        description: "Create a function 'sum(a, b)' that returns the sum of a and b.",
        difficulty: "easy",
        language: "javascript",
        category: "training",
        type: "Stage",
        starterCode: "function sum(a, b) {\n  // Your code here\n}",
        testCases: [{ name: "sum valid", assertion: "sum(5, 10) === 15" }],
      },
      {
        title: "PY: Hello Python",
        description: "Create a function 'hello' that returns 'Python is cool'.",
        difficulty: "easy",
        language: "python",
        category: "training",
        type: "Stage",
        starterCode: "def hello():\n    # Your code here\n    pass",
        testCases: [{ name: "hello check", assertion: "hello() == 'Python is cool'" }],
      },
      {
        title: "PY: Square Number",
        description: "Create a function 'square(n)' that returns n * n.",
        difficulty: "easy",
        language: "python",
        category: "training",
        type: "Stage",
        starterCode: "def square(n):\n    # Your code here\n    pass",
        testCases: [{ name: "square valid", assertion: "square(4) == 16" }],
      },

      // --- MISSIONS (STAGES/MAP) ---
      {
        title: "JS: Array Processor",
        description: "Filter even numbers and return their sum.\n\nExample Output:\n[1,2,3,4,6] => 12",
        difficulty: "medium",
        language: "javascript",
        category: "mission",
        type: "Stage",
        starterCode: "function processData(arr) {\n  // Your code here\n}",
        testCases: [{ name: "evens sum", assertion: "processData([1,2,3,4,6]) === 12" }],
      },
      {
        title: "PY: Deep Square",
        description: "Implement a square function for the Red Castle defenses.",
        difficulty: "medium",
        language: "python",
        category: "mission",
        type: "Stage",
        starterCode: "def square(n):\n    # Your code here\n    pass",
        testCases: [{ name: "square mission", assertion: "square(10) == 100" }],
      },
      {
        title: "JS: Prime Sentinel",
        description: "Verify if a number is prime using optimized algorithms.",
        difficulty: "hard",
        language: "javascript",
        category: "mission",
        type: "Stage",
        starterCode: "function isPrime(n) {\n  // Your code here\n}",
        testCases: [
          { name: "prime 7", assertion: "isPrime(7) === true" },
          { name: "not prime 10", assertion: "isPrime(10) === false" }
        ],
      },
    ]);

    const [c1, c2, c3, c4, c5, c6, c7] = challengeDocs;

    // --- TRAINING STAGES ---
    const t1 = await Stage.create({
      title: "JavaScript Basics",
      description: "Fundamental syntax of JavaScript.",
      category: "training",
      order: 1,
      difficulty: "easy",
      challenges: [c1._id, c2._id],
    });

    const t2 = await Stage.create({
      title: "Python 101",
      description: "Introduction to Python programming.",
      category: "training",
      order: 2,
      difficulty: "easy",
      prerequisiteStageId: t1._id,
      challenges: [c3._id, c4._id],
    });

    // --- MISSION STAGES (MAP) ---
    const m1 = await Stage.create({
      title: "Blue Castle - Foundations",
      description: "Building the base logic of the fortress.",
      category: "mission",
      order: 1,
      difficulty: "medium",
      prerequisiteStageId: null,
      challenges: [c5._id],
    });

    const m2 = await Stage.create({
      title: "Red Castle - Intermediate",
      description: "Intermediate challenges for brave souls.",
      category: "mission",
      order: 2,
      difficulty: "medium",
      prerequisiteStageId: m1._id,
      challenges: [c6._id],
    });

    await Stage.create({
      title: "Purple Castle - Master",
      description: "Final fortress optimization and prime verification.",
      category: "mission",
      order: 3,
      difficulty: "hard",
      prerequisiteStageId: m2._id,
      challenges: [c7._id],
    });

    console.log("Stages and challenges seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedStages();
