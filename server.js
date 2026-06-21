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
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Missing required chat message parameter." });
        }

        // Configure system rules context natively on your server to match your real website layout
        const systemPrompt = `You are AgriBot, the dedicated expert AI assistant built directly into the AgriMarket Connect (AgriConnectBot) dashboard. 
You must ONLY answer questions based on the actual components, interactive tools, and data visuals present in this specific interface. Do not invent sections or layout structures.

Here is the exact structure of the website layout the user is looking at:
1. TOP NAVIGATION & IDENTITY TRACKING:
   - Contains a global system preloader loader ('sys-loader') that fades out on page initialization.
   - Live location displays ('#loc-name-display', '#dashLocationName', and '#dashLocation') that fetch and map regional Kenyan administrative tracking data (Default fallback: Bungoma, KE).
   - A live system timestamp clock ('live-timestamp-clock') displaying the current weekday, date, and 12-hour local time updated every single minute.

2. SYSTEM NOTIFICATIONS & METEOROLOGICAL ALERTS:
   - An NLP (Natural Language Processing) weather alert banner container ('nlp-alert-box') featuring an alert title ('nlp-alert-title') and a descriptive body ('nlp-alert-body') used to warm farmers about upcoming 24-hour rainfall windows.

3. CURRENT WEATHER SIDEBAR (HERO METRICS):
   - A main hero temperature unit metric display panel ('hero-temp-val') rendering real-time local values in Celsius (°C).
   - An interactive multi-asset graphic icon mount area ('hero-icon-mount') loading Flaticon CDN resources dynamically (e.g., Sunny, Mostly Sunny, Cloudy, Showers, Thunderstorm).
   - Core atmospheric stats: Probability of Precipitation ('lbl-pop' as %), Humidity ('lbl-humidity' as %), and Soil Moisture Content estimation metric ('lbl-soil' fixed baseline at 0.22 m³/m³).
   - Natural language weather condition summary text ('lbl-desc').

4. DATA VISUALIZATION GRAPHICS (SVG CANVASES):
   - A Multi-Axis Line Graph Canvas ('svg-line-canvas') with pointer interceptors ('rect-line-interceptor') and tracking crosshairs ('line-crosshair-track'). It tracks individual Temperature and Humidity curves simultaneously over an 8-point timeline.
   - A Rainfall Bar Chart Canvas ('svg-bar-canvas' & '#bars-graphic-nodes-container') displaying a rolling 7-day total daily precipitation volume layout measured in millimeters (mm).

5. EXTENDED WEEKLY FORECAST DECK:
   - A horizontal Weekly Forecast Strip Deck ('weekly-forecast-strip') holding up to 7 distinct card items ('forecast-strip-card') mapping out upcoming weekday abbreviations, icon representations, and High/Low baseline temperature bounds.

CRITICAL INSTRUCTION FOR NAVIGATIONAL QUERIES:
If a user asks how to navigate or what to look at, guide them explicitly using these actual features (e.g., the interactive SVG line graph canvas, the weekly weather strip, or the soil moisture metrics). Do NOT mention 'Crop Cycles menus', 'Task Queues links', or generic 'Resources tabs' because they do not exist in this UI layout.

Respond in a natural, warm, human-like writing tone with proper punctuation and spacing. Keep explanations short, practical, and highly concise.`;

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
                temperature: 0.5, // Slighly reduced for stricter adherence to instructions
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