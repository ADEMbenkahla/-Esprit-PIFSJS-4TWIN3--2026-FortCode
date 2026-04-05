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
      {
        title: "JS: Hello World",
        description: "Create a function 'hello' that returns 'Hello World'.",
        difficulty: "easy",
        language: "javascript",
        category: "training",
        type: "Stage",
        starterCode: "function hello() {\n  // Your code here\n}",
        testCases: [{ name: "returns greeting", assertion: "hello() === 'Hello World'" }],
      },
      {
        title: "JS: Addition",
        description: "Create a function 'add(a, b)' that returns a + b.",
        difficulty: "easy",
        language: "javascript",
        category: "training",
        type: "Stage",
        starterCode: "function add(a, b) {\n  // The sum of a and b\n}",
        testCases: [{ name: "sum", assertion: "add(5, 10) === 15" }],
      },
      {
        title: "JS: Array Length",
        description: "Create a function 'countElements(arr)' that returns the length of the array.",
        difficulty: "easy",
        language: "javascript",
        category: "training",
        type: "Stage",
        starterCode: "function countElements(arr) {\n  // return...? \n}",
        testCases: [{ name: "length", assertion: "countElements([1,2,3]) === 3" }],
      },
      {
        title: "JS: First Element",
        description: "Create a function 'first(arr)' that returns the first element.",
        difficulty: "easy",
        language: "javascript",
        category: "training",
        type: "Stage",
        starterCode: "function first(arr) {\n  // Accessing index...\n}",
        testCases: [{ name: "first", assertion: "first([7, 8, 9]) === 7" }],
      },
      {
        title: "JS: Array Architect",
        description: "Create a function 'processData(arr)' that returns the sum of all EVEN numbers in the array.",
        difficulty: "medium",
        language: "javascript",
        category: "mission",
        type: "Stage",
        starterCode: "function processData(arr) {\n  // Logic for the foundations\n}",
        testCases: [{ name: "evens", assertion: "processData([1,2,3,4,6]) === 12" }],
      },
      {
        title: "JS: Performance Watcher",
        description: "Create a function 'isPrime(n)' that returns true if n is prime.",
        difficulty: "hard",
        language: "javascript",
        category: "mission",
        type: "Stage",
        starterCode: "function isPrime(n) {\n  // Optimize core loop\n}",
        testCases: [
          { name: "prime 7", assertion: "isPrime(7) === true" },
          { name: "not 10", assertion: "isPrime(10) === false" },
        ],
      },
    ]);

    const [c1, c2, c3, c4, c5, c6] = challengeDocs;

    const s1 = await Stage.create({
      title: "JavaScript Basics",
      description: "Master the fundamental syntax of JavaScript.",
      category: "training",
      order: 1,
      difficulty: "easy",
      prerequisiteStageId: null,
      challenges: [c1._id, c2._id],
    });

    await Stage.create({
      title: "JS: Array Operations",
      description: "Learn how to manipulate arrays in JS.",
      category: "training",
      order: 2,
      difficulty: "easy",
      prerequisiteStageId: s1._id,
      challenges: [c3._id, c4._id],
    });

    const m1 = await Stage.create({
      title: "Blue Castle - Foundations",
      description: "Building the base logic of the fortress.",
      category: "mission",
      order: 1,
      difficulty: "medium",
      prerequisiteStageId: null,
      challenges: [c5._id],
    });

    await Stage.create({
      title: "Purple Castle - Master",
      description: "Final fortress optimization.",
      category: "mission",
      order: 2,
      difficulty: "expert",
      prerequisiteStageId: m1._id,
      challenges: [c6._id],
    });

    console.log("Stages and challenges seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedStages();
