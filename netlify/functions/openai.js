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
                max_tokens: 500
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
                Analyze the following conversation for a moment of personal insight or emotional breakthrough. If detected, provide a 2-3 sentence summary of the insight in a "breakthrough" object. If none, return an empty object.
                Conversation: ${JSON.stringify(lastMessages)}
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
                    responseData.breakthrough = breakthrough.breakthrough || {};
                } catch (e) {
                    responseData.breakthrough = {};
                }
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
