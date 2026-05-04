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
      // --- TRAINING EXERCISES (CONCEPTS ÉDUCATIFS) ---
      {
        title: "Training: JS String Reverser",
        description: "Create a function 'reverseString(str)' that returns the string reversed.",
        difficulty: "easy",
        language: "javascript",
        category: "training",
        type: "Stage",
        starterCode: "function reverseString(str) {\n  // Reverse the string\n}",
        testCases: [{ name: "reverse test", assertion: "reverseString('hello') === 'olleh'" }],
      },
      {
        title: "Training: JS Array Length Finder",
        description: "Create a function 'getLength(arr)' that returns the length of an array.",
        difficulty: "easy",
        language: "javascript",
        category: "training",
        type: "Stage",
        starterCode: "function getLength(arr) {\n  // Get array length\n}",
        testCases: [{ name: "length test", assertion: "getLength([1,2,3]) === 3" }],
      },
      {
        title: "Training: Python Number Checker",
        description: "Create a function 'isPositive(n)' that returns True if n > 0, False otherwise.",
        difficulty: "easy",
        language: "python",
        category: "training",
        type: "Stage",
        starterCode: "def isPositive(n):\n    # Check if positive\n    pass",
        testCases: [{ name: "positive test", assertion: "isPositive(5) == True" }],
      },
      {
        title: "Training: Python List Max Finder",
        description: "Create a function 'findMax(lst)' that returns the maximum value in a list.",
        difficulty: "easy",
        language: "python",
        category: "training",
        type: "Stage",
        starterCode: "def findMax(lst):\n    # Find maximum value\n    pass",
        testCases: [{ name: "max test", assertion: "findMax([1,5,3]) == 5" }],
      },

      // --- MAP MISSION EXERCISES (DÉFIS AVANCÉS) ---
      {
        title: "Mission: Dragon Fire Calculator",
        description: "Calculate dragon damage: multiply all numbers in array.\nExample: [2,3,4] => 24",
        difficulty: "medium",
        language: "javascript",
        category: "mission",
        type: "Stage",
        starterCode: "function calculateDragonDamage(arr) {\n  // Calculate dragon fire damage\n}",
        testCases: [{ name: "dragon damage", assertion: "calculateDragonDamage([2,3,4]) === 24" }],
      },
      {
        title: "Mission: Magic Spell Power",
        description: "Calculate spell power using fibonacci sequence: nth fibonacci number.",
        difficulty: "medium",
        language: "python",
        category: "mission",
        type: "Stage",
        starterCode: "def calculateSpellPower(n):\n    # Calculate fibonacci number\n    pass",
        testCases: [{ name: "spell power", assertion: "calculateSpellPower(7) == 13" }],
      },
      {
        title: "Mission: Portal Energy Generator",
        description: "Generate portal energy using prime number summation: sum of first n primes.",
        difficulty: "hard",
        language: "javascript",
        category: "mission",
        type: "Stage",
        starterCode: "function generatePortalEnergy(n) {\n  // Sum first n prime numbers\n}",
        testCases: [
          { name: "portal 3", assertion: "generatePortalEnergy(3) === 10" }, // 2+3+5
          { name: "portal 1", assertion: "generatePortalEnergy(1) === 2" }
        ],
      },
    ]);

    const [c1, c2, c3, c4, c5, c6, c7] = challengeDocs;

    // --- TRAINING STAGES (CONCEPTS ÉDUCATIFS) ---
    const t1 = await Stage.create({
      title: "JavaScript String Operations",
      description: "Master string manipulation and array basics with educational exercises.",
      category: "training",
      order: 1,
      difficulty: "easy",
      challenges: [c1._id, c2._id],
    });

    const t2 = await Stage.create({
      title: "Python Logic & Lists",
      description: "Learn conditional logic and list operations with fundamental programming concepts.",
      category: "training",
      order: 2,
      difficulty: "easy",
      prerequisiteStageId: null, // Pas de dépendance
      challenges: [c3._id, c4._id],
    });

    // --- MAP MISSION STAGES (DÉFIS FANTASTIQUES) ---
    const m1 = await Stage.create({
      title: "Dragon Valley - Fire Damage",
      description: "Calculate dragon fire damage using multiplication arrays for battle strategy.",
      category: "mission",
      order: 1,
      difficulty: "medium",
      prerequisiteStageId: null,
      challenges: [c5._id],
    });

    const m2 = await Stage.create({
      title: "Wizard Tower - Magic Spells",
      description: "Master fibonacci sequences to calculate magical spell power for wizard battles.",
      category: "mission",
      order: 2,
      difficulty: "medium",
      prerequisiteStageId: null, // Pas de dépendance
      challenges: [c6._id],
    });

    await Stage.create({
      title: "Portal Nexus - Energy Generation",
      description: "Generate portal energy using prime number summation for interdimensional travel.",
      category: "mission",
      order: 3,
      difficulty: "hard",
      prerequisiteStageId: null, // Pas de dépendance
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
