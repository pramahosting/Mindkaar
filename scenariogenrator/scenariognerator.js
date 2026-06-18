import { GoogleGenAI } from "@google/genai";
import {createMentalHealthPrompt, geminiPrompt} from "./Prompts/prompt1.js"
const fs = require('fs');

function getRandomItem(arr) {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const MOODS = ["😊 Great", "🙂 Good", "😐 Okay", "😔 Low", "😞 Struggling"];
const supportOptions = ["Therapy", "Medication", "Support group", "Friends & family", "None currently"];
const goalOptions = ["Reduce anxiety", "Better sleep", "Manage stress", "Build resilience", "Improve mood", "Find purpose"];
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

const payload = {
        age:         `${getRandomInt(14,80)}`,
        // Mental health baseline
        mood:        `${getRandomItem(MOODS)}`,
        sleepHours:  `${getRandomInt(2,10)}`,
        stressLevel: `${getRandomInt(1,10)}`,
        support:     `${getRandomItem(supportOptions)}`,
        goals:       `${getRandomItem(goalOptions)}`,
      };

async function getScenarios(prompt) {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
  });

  console.log(response.text);
}

for (let i = 0; i < 5; i++) {
  const prompt = createMentalHealthPrompt(payload);
  getScenarios(prompt);
  console.log(prompt)
  

}


