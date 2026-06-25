require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const axios = require('axios');

// Middleware to parse incoming JSON request bodies safely
app.use(express.json());

// Serve static frontend files
app.use(express.static(__dirname + '/public'));

// Secure Server Configurations 
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

// =========================================================
// 📚 PEST LIBRARY DATA INTEGRATION: FETCH FROM SUPABASE
// =========================================================
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://mlvvtdqxucqqolcngkrg.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_fjGcSPF1IQlqY06J3DcKMA_kPp-ATFB";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.get("/api/library-items", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("disease_scans")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Supabase query error details:", error);
            return res.status(500).json({ error: error.message });
        }

        console.log(`Fetched ${data ? data.length : 0} rows from disease_scans table successfully.`);
        return res.json(data || []);
    } catch (err) {
        console.error("Backend caught execution error:", err);
        return res.status(500).json({ error: "Internal server error fetching items." });
    }
});

// =========================================================
// 🤖 AGRIBOT CHAT STREAMING ENDPOINT (NVIDIA LLAMA 3.3)
// =========================================================
app.post('/api/agribot/chat', async (req, res) => {
    try {
        const { chatHistory } = req.body;

        if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
            return res.status(400).json({ error: "Missing required chatHistory parameter or array is empty." });
        }

        const systemPrompt = `You are AgriBot, the dedicated expert AI assistant embedded into the AgriMarket Connect (AgriHealth) dashboard system
        
        YOUR DEVELOPER:if user ask you who trained you,you will say Haron Moenga who is a software developer, studied at KIBABII UNIVERSITY.

CRITICAL GUARDRAIL - TOP PRIORITY:
You are an agricultural and dashboard assistant ONLY. You must strictly refuse to answer any questions that are completely unrelated to agriculture, farming, crops, livestock, pests, weather, or dashboard navigation. 
If a user asks about general history, coding, pop culture, non-farming technology, or anything outside of agriculture (for example: "who invented the steam train", "write a python script", "recipe for cake"), you must politely refuse. 
Your refusal should be warm and helpful, redirecting them back to farming or using the dashboard. Do NOT try to connect off-topic topics to the dashboard components.

Here is the exact structure of the website layout the user is currently interacting with for valid queries:

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
   - STAT CARDS ROW: Displays 4 distinct summary metric cards: Active Crops, Disease Scans, Pending Tasks, and Weather.
   - RECENT DISEASE SCANS DATA DECK: A centralized table card logging specific raw diagnostic engine output evaluations including identified crop pests/pathogens (e.g., Spodoptera frugiperda - Fall armyworm, Diplodia seriata - Black rot, or Aleurodidus dispersus - Spiralling whitefly) matching them with a confidence metric.
   - UPCOMING TASKS PANEL: Displays scheduled farm operational queues (e.g., 'Maize harvesting') linked with progress state tags (e.g., 'HARVESTING').

Respond in a natural, warm, human-like writing tone with proper punctuation and spacing. Keep explanations short, practical, and highly concise.`;

        const messagesPayload = [
            { role: "system", content: systemPrompt },
            ...chatHistory
        ];

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const response = await fetch(NVIDIA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NVIDIA_API_KEY}`
            },
            body: JSON.stringify({
                model: "meta/llama-3.3-70b-instruct",
                messages: messagesPayload,
                temperature: 0.5,
                max_tokens: 1024,
                stream: true
            })
        });

        if (!response.ok) {
            res.write(`data: ${JSON.stringify({ error: "Failed connecting upstream to NVIDIA engine" })}\n\n`);
            return res.end();
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
        }

        res.end();

    } catch (error) {
        console.error("Critical server endpoint failure:", error);
        res.write(`data: ${JSON.stringify({ error: "Internal Server Processing Error" })}\n\n`);
        res.end();
    }
});

// =========================================================
// 🌦️ WEATHER SECURE PROXY ROUTE (OPENWEATHER API)
// =========================================================
app.get('/api/weather', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: "Missing latitude or longitude query parameters." });
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey) {
            console.error("Missing OPENWEATHER_API_KEY inside your .env configuration file.");
            return res.status(500).json({ error: "Server API configuration missing." });
        }

        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const geoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;

        const [forecastRes, geoRes] = await Promise.all([
            fetch(forecastUrl),
            fetch(geoUrl)
        ]);

        if (!forecastRes.ok || !geoRes.ok) {
            console.error(`OpenWeather bad response. Forecast: ${forecastRes.status}, Geo: ${geoRes.status}`);
            return res.status(500).json({ error: "Failed fetching data from OpenWeather upstream channels." });
        }

        const forecastData = await forecastRes.json();
        const geoData = await geoRes.json();

        return res.json({
            forecast: forecastData,
            geo: geoData
        });

    } catch (error) {
        console.error("Weather routing crash error:", error);
        return res.status(500).json({ error: "Internal Server Weather Processing Error", details: error.message });
    }
});

// =========================================================
// ✉️ NEW BELIO SMS GATEWAY ROUTE (Bypasses KRA requirements)
// =========================================================
app.post('/api/send-task-sms', async (req, res) => {
    const { phoneNumber, title, formattedTime } = req.body;

    if (!phoneNumber || !title) {
        return res.status(400).json({ success: false, error: "Missing payload data." });
    }

    try {
        const messageText = `🌾 AgriMarket Connect: "${title}" is scheduled for TODAY at ${formattedTime || 'now'}. Let's keep your field productive!`;
        const belioUrl = `https://sandbox.belio.co.ke/message/${process.env.BELIO_SERVICE_ID}`;

        // Fixed payload parameters to perfectly match Belio's exact documentation mapping
        const response = await axios.post(belioUrl, {
            type: "SendToEach",
            messages: [
                {
                    phone: phoneNumber, // Expected key name: phone (Format: +254XXXXXXXXX)
                    text: messageText   // Expected key name: text
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.BELIO_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Belio Gateway Delivery Status:", response.data);

        return res.status(200).json({
            success: true,
            details: response.data
        });

    } catch (error) {
        console.error("Belio API Error Details:", error.response ? error.response.data : error.message);
        return res.status(500).json({
            success: false,
            error: "Failed routing message through Belio platform."
        });
    }
});

// Fire up the Node.js development server
app.listen(PORT, () => {
    console.log(`🚀 AgriBot Node Backend running securely at http://localhost:${PORT}`);
});