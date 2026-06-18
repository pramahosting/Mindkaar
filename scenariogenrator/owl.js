import { OpenRouter } from "@openrouter/sdk";
import { createMentalHealthPrompt, geminiPrompt } from "./Prompts/prompt1.js"
import fs from 'fs';


const MOODS = ["😊 Great", "🙂 Good", "😐 Okay", "😔 Low", "😞 Struggling"];
const supportOptions = ["Therapy", "Medication", "Support group", "Friends & family", "None currently"];
const goalOptions = ["Reduce anxiety", "Better sleep", "Manage stress", "Build resilience", "Improve mood", "Find purpose"];

const openrouter = new OpenRouter({
    apiKey: process.env.OWL_API_KEY
});

function getRandomItem(arr) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function saveToFile(folderpath,profileText, responseText, i) {
    try {
        if (responseText.startsWith("```")) {
            responseText = responseText
                .replace(/^```json\s*/, "") 
                .replace(/^```\s*/, "")     
                .replace(/\s*```\$/, ""); 
        }
        // //const profile = JSON.parse(profileText)
        // const response = JSON.parse(responseText);
        const combinedJsonObject = {
            profile: profileText,
            response: responseText
        }
        const jsonString = JSON.stringify(combinedJsonObject, null, 2);

        fs.writeFileSync(folderpath + `response_data_${i}.json`, jsonString, 'utf-8');
        console.log('File successfully saved!');

    } catch (error) {
        console.error('Failed to save file. Ensure response.text is valid JSON:', error);
    }
}


for (let i = 0; i < 20; i++) {
    let profile = {
        age: `${getRandomInt(14, 80)}`,
        // Mental health baseline
        mood: `${getRandomItem(MOODS)}`,
        sleepHours: `${getRandomInt(2, 10)}`,
        stressLevel: `${getRandomInt(1, 10)}`,
        support: `${getRandomItem(supportOptions)}`,
        goals: `${getRandomItem(goalOptions)}`,
    };

    const prompt = geminiPrompt(profile);
    //console.log(prompt)

    const response = await openrouter.chat.send({
        chatRequest: {
            model: 'openrouter/owl-alpha',
            messages: [
                { role: 'user', content: prompt }
            ]
        }
    });
    //console.log(response.choices[0].message.content);
    saveToFile("scenarios/", JSON.stringify(profile, null, 2), response.choices[0].message.content, i )
}






