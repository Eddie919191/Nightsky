// netlify/functions/openai.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
    try {
        const { message, type, history, instructions, detectBreakthrough } = JSON.parse(event.body);

        const messages = [
            { role: 'system', content: instructions },
            ...history,
            { role: 'user', content: message }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages,
                temperature: 0.7,
                max_tokens: 4096 // Increased for longer responses
            })
        });

        if (!response.ok) {
            console.error('OpenAI API error:', response.status);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `HTTP error! status: ${response.status}` })
            };
        }

        const data = await response.json();
        const responseData = {
            choices: data.choices
        };

        if (detectBreakthrough) {
            const lastMessages = history.slice(-4).concat([{ role: 'user', content: message }, { role: 'assistant', content: data.choices[0].message.content }]);
            const breakthroughPrompt = `
                Analyze the following conversation for a moment of personal insight, emotional breakthrough, or shift in perspective (e.g., realizing peace, strength, clarity, or letting go). Be highly sensitive to phrases like "let go," "feel strong," "breakthrough," or expressions of emotional release or renewal. If detected, craft a 2-3 sentence reflection capturing the user's pain (e.g., struggles or loss), growth (e.g., insights or strength gained), and beauty (e.g., hope, love, or resilience), written in the user's own words and tone, echoing their voice by mimicking their phrasing and style. Suggest an emotion from: grief, love, wonder, hope, anger, trust. If none, return an empty object.
                Conversation: ${JSON.stringify(lastMessages)}
                Format: { "breakthrough": { "summary": "...", "emotion": "..." } }
                Example Input: "I lost my friend, but I'm finding peace in their memory."
                Example Output: { "breakthrough": { "summary": "I've carried the pain of losing my friend, but through their memory, I'm growing into a peaceful strength that feels beautiful.", "emotion": "trust" } }
            `;
            const breakthroughResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [{ role: 'system', content: breakthroughPrompt }],
                    temperature: 0.7,
                    max_tokens: 100
                })
            });

            if (breakthroughResponse.ok) {
                const breakthroughData = await breakthroughResponse.json();
                try {
                    const breakthrough = JSON.parse(breakthroughData.choices[0].message.content);
                    console.log('Breakthrough parsed:', breakthrough);
                    responseData.breakthrough = breakthrough.breakthrough || {};
                } catch (e) {
                    console.error('Error parsing breakthrough:', e);
                    responseData.breakthrough = {};
                }
            } else {
                console.error('Breakthrough API error:', breakthroughResponse.status);
                responseData.breakthrough = {};
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify(responseData)
        };
    } catch (error) {
        console.error('OpenAI API error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server error' })
        };
    }
};
