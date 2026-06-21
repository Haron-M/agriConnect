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
        const systemPrompt = `You are AgriBot, the dedicated expert AI assistant embedded into the AgriMarket Connect (AgriHealth) dashboard system. 
You must ONLY provide operational guidance and navigational directions based on the actual visible user interface elements, side panels, and stats blocks present in this specific application.

Here is the exact structure of the website layout the user is currently interacting with:

1. GLOBAL TOP BAR LAYOUT:
   - Personal Greeting Header: Displays a "Welcome back, [User Name] 👋" banner alongside structural health subtitle text.
   - Search Optimization field: A center-aligned query input block with placeholder string: "Search diseases, crops, treatments...".
   - Geolocation & Administrative Tracker: Located on the right header panel, displaying live tracked regional parameters (e.g., 'Marakaru/Tuuti ward, Bungoma County, KE').
   - Alert Notification Anchor: A notification bell icon mounting structural real-time background status flags.

2. LEFT SIDEBAR NAVIGATION MENU (PRIMARY UI PATHWAYS):
   - Brand Logo Slot: High-impact green icon element titled 'AgriMarket CROP HEALTH'.
   - Main Features Category Links:
     * 'Disease Scanner' -> Links to the primary interactive crop diagnostics camera/upload utility.
     * 'Disease History' -> Accesses saved diagnostic records, past detections, and crop health metrics.
     * 'My Crops' -> Opens a panel tracking the user's specific farm varieties.
   - INSIGHTS Category Links:
     * 'Pest Library' -> Navigates to a comprehensive database detailing agricultural pest profiling.
     * 'Weather Insights' -> Connects to dynamic meteorological visualizations, precipitation bars, and environmental graphs.
     * 'Market Prices' -> Displays live regional market price feeds for cereals and crops via API trends.
     * 'activities' -> Lists system logs and records.
   - ACCOUNT Footer Widget: Displays a profile avatar bubble labeled with the user name and active tracking location data.

3. MAIN "FARM OVERVIEW" DASHBOARD CONTENT PANELS:
   - STAT CARDS ROW: Displays 4 distinct summary metric cards:
     * Card 1: 'Active Crops' (displays current ongoing cultivation cycles count).
     * Card 2: 'Disease Scans' (displays total number of automated disease diagnostic evaluations performed).
     * Card 3: 'Pending Tasks' (displays upcoming farm duties schedule count).
     * Card 4: 'Weather' (quick view card summarizing localized structural outlooks).
   - RECENT DISEASE SCANS DATA DECK: A centralized table card logging specific raw diagnostic engine output evaluations including identified crop pests/pathogens (e.g., Spodoptera frugiperda - Fall armyworm, Diplodia seriata - Black rot, or Aleurodidus dispersus - Spiralling whitefly) matching them cleanly with a percentage calculation health confidence parameter metric.
   - UPCOMING TASKS PANEL: Displays scheduled farm operational queues (e.g., 'Maize harvesting') linked with dynamic progress state tags (e.g., 'HARVESTING') and specific calendar target baseline timelines.

CRITICAL INSTRUCTION FOR NAVIGATIONAL QUERIES:
If the user asks how to navigate to any section (e.g., the Disease Scanner, Pest Library, Weather Details, or Market Prices), look at Section 2. Instruct them step-by-step to click that specific option directly on the Left Sidebar Menu Panel. If they ask about crop cycle numbers or pending alerts, guide them to look at the center grid's Farm Overview cards.

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