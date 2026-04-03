const mongoose = require('mongoose');
const BattleChallenge = require('../models/BattleChallenge');
require('dotenv').config();

const challenges = [
    {
        title: "The Fibonacci Sequence",
        description: "Write a function that returns the n-th number in the Fibonacci sequence. The sequence starts with 0, 1, 1, 2, 3, 5, 8, 13, 21, 34...",
        difficulty: "Easy",
        languages: {
            javascript: {
                starterCode: "function fibonacci(n) {\n  // Your code here\n}",
                tests: "return fibonacci(6) === 8 && fibonacci(10) === 55;"
            },
            python: {
                starterCode: "def fibonacci(n):\n    # Your code here\n    pass",
                tests: "assert fibonacci(6) == 8\nassert fibonacci(10) == 55"
            }
        }
    },
    {
        title: "Palindrome Checker",
        description: "Return true if the given string is a palindrome. Otherwise, return false. A palindrome is a word or sentence that's spelled the same way both forward and backward, ignoring punctuation, case, and spacing.",
        difficulty: "Medium",
        languages: {
            javascript: {
                starterCode: "function isPalindrome(str) {\n  // Your code here\n}",
                tests: "return isPalindrome('eye') === true && isPalindrome('race car') === true && isPalindrome('nope') === false;"
            },
            python: {
                starterCode: "def is_palindrome(s):\n    # Your code here\n    pass",
                tests: "assert is_palindrome('eye') == True\nassert is_palindrome('race car') == True\nassert is_palindrome('nope') == False"
            }
        }
    },
    {
        title: "Merge Sorted Arrays",
        description: "Given two sorted arrays, merge them into a single sorted array. Do not use built-in sort methods.",
        difficulty: "Hard",
        languages: {
            javascript: {
                starterCode: "function mergeSortedArrays(arr1, arr2) {\n  // Your code here\n}",
                tests: "return JSON.stringify(mergeSortedArrays([0,3,4,31], [4,6,30])) === '[0,3,4,4,6,30,31]';"
            },
            python: {
                starterCode: "def merge_sorted_arrays(arr1, arr2):\n    # Your code here\n    pass",
                tests: "assert merge_sorted_arrays([0,3,4,31], [4,6,30]) == [0,3,4,4,6,30,31]"
            }
        }
    }
];

const seedBattleChallenges = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding battles...');

        await BattleChallenge.deleteMany({});
        await BattleChallenge.insertMany(challenges);

        console.log('Successfully seeded 1v1 Battle Challenges!');
        process.exit();
    } catch (error) {
        console.error('Error seeding battle challenges:', error);
        process.exit(1);
    }
};

seedBattleChallenges();
