require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON request bodies safely
app.use(express.json());

// Serve static frontend files (make sure this points to your directory containing dash.html/dash.js)
app.use(express.static(__dirname + '/public'));

// Secure Server Configurations 
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY; // Keep your secret key safe here!
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";


/**
 * Endpoint to securely proxy and stream chat completions from NVIDIA NIM to the browser
 */
app.post('/api/agribot/chat', async (req, res) => {
    try {
        const { message, cropsCount, tasksCount } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Missing required chat message parameter." });
        }

        // Configure system rules context natively on your server
        const systemPrompt = `You are AgriBot, an expert AI agricultural consultant embedded inside a custom dashboard system. 
The user currently has exactly ${cropsCount || 0} active growing crop cycles and exactly ${tasksCount || 0} pending tasks in their activity queue.
Provide highly practical guidance. Respond in a natural, warm, human-like writing tone with proper punctuation and word spacing. Keep explanations short and concise.`;

        // Set up specific Server-Sent Events headers for immediate streaming back to frontend
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Outbound transaction package to NVIDIA
        const response = await fetch(NVIDIA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NVIDIA_API_KEY}`
            },
            body: JSON.stringify({
                model: "meta/llama-3.3-70b-instruct",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                temperature: 0.6,
                max_tokens: 1024,
                stream: true // Instructs NVIDIA to stream token-by-token
            })
        });

        if (!response.ok) {
            res.write(`data: ${JSON.stringify({ error: "Failed connecting upstream to NVIDIA engine" })}\n\n`);
            return res.end();
        }

        // Connect the server streams: pipe incoming data directly down to the response channel
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // Forward the raw chunk instantly to the client's browser
            res.write(chunk);
        }

        res.end();

    } catch (error) {
        console.error("Critical server endpoint failure:", error);
        res.write(`data: ${JSON.stringify({ error: "Internal Server Processing Error" })}\n\n`);
        res.end();
    }
});

/**
 * Secure proxy endpoint for fetching regional weather and geolocation metrics
 */
app.post('/api/weather', async (req, res) => {
    try {
        const { lat, lon } = req.body;

        if (!lat || !lon) {
            return res.status(400).json({ error: "Missing latitude or longitude parameters." });
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;

        // Construct backend OpenWeather strings securely
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const geoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;

        // Fire both operations in a fast, parallel pipeline
        const [forecastRes, geoRes] = await Promise.all([
            fetch(forecastUrl),
            fetch(geoUrl)
        ]);

        if (!forecastRes.ok || !geoRes.ok) {
            return res.status(500).json({ error: "Failed fetching data from OpenWeather upstream channels." });
        }

        const forecastData = await forecastRes.json();
        const geoData = await geoRes.json();

        // Send back a clean object containing both items to your frontend weather.js
        res.json({
            forecast: forecastData,
            geo: geoData
        });

    } catch (error) {
        console.error("Weather routing crash error:", error);
        res.status(500).json({ error: "Internal Server Weather Processing Error" });
    }
});
// Fire up the Node.js development server
app.listen(PORT, () => {
    console.log(`🚀 AgriBot Node Backend running securely at http://localhost:${PORT}`);
});