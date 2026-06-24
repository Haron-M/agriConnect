let weatherDataSet = null;
let lineChartPointsArray = [];

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const loader = document.getElementById('sys-loader');
        if (loader) loader.style.opacity = '0';
        setTimeout(() => { if (loader) loader.style.display = 'none'; }, 400);
    }, 600);
});

const OPENWEATHER_API_KEY = "e61cf80734ae1e65c736d627e755ea6f";

const cdnAssetIcons = {
    sunny: "https://cdn-icons-png.flaticon.com/512/869/869869.png",
    mostlySunny: "https://cdn-icons-png.flaticon.com/512/1163/1163765.png",
    cloudy: "https://cdn-icons-png.flaticon.com/512/414/414805.png",
    showers: "https://cdn-icons-png.flaticon.com/512/3351/3351979.png",
    thunderstorm: "https://cdn-icons-png.flaticon.com/512/1779/1779940.png"
};

/* ==========================================================================
   AUTHENTICATED BOOTSTRAP PIPELINE
   ========================================================================== */
async function bootstrapPipeline() {
    // 1. Establish smart fallback coordinates (Default: Bungoma)
    let fallbackLat = 0.5636;
    let fallbackLon = 34.5606;

    // 2. Scan Supabase authentication cache layer for registered account metadata
    try {
        if (typeof supabaseClient !== 'undefined') {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.user?.user_metadata) {
                const metadata = session.user.user_metadata;
                // If the user has specific coordinates saved in metadata, map them here
                if (metadata.latitude && metadata.longitude) {
                    fallbackLat = parseFloat(metadata.latitude);
                    fallbackLon = parseFloat(metadata.longitude);
                }
            }
        }
    } catch (authErr) {
        console.warn("Could not reference user session bounds during bootstrap:", authErr);
    }

    // 3. Request native browser geolocation telemetry
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                fetchWeatherTelemetry(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
                console.log(`Using fallback regional coordinates: [${fallbackLat}, ${fallbackLon}]`);
                fetchWeatherTelemetry(fallbackLat, fallbackLon);
            },
            { timeout: 5000 }
        );
    } else {
        fetchWeatherTelemetry(fallbackLat, fallbackLon);
    }
}

async function fetchWeatherTelemetry(lat, lon) {
    try {
        // 1. Dual fetch payload streams concurrently to maximize loading speed
        const weatherPromise = fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`);
        const geoPromise = fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`);

        const [weatherRes, geoRes] = await Promise.all([weatherPromise, geoPromise]);
        const payload = await weatherRes.json();
        const geoData = await geoRes.json();

        // 2. Extract precision administrative layers matching reverse geocode layout
        let structuralLocationName = payload.city.name;
        let structuralLocation = payload.city.name;
        if (geoData && geoData.length > 0) {
            const details = geoData[0];
            const localizedArea = details.local_names?.en || details.name;
            const countyOrState = details.state ? `, ${details.state},KE` : '';
            const county = details.state ? ` ${details.state}, KE` : '';
            structuralLocationName = `${localizedArea}${countyOrState}`;
            structuralLocation = `${county} 📍`;
        }

        // 3. Mount text string components across layout anchors safely
        const locDisplayNode = document.getElementById('loc-name-display');
        const dashLocationNode = document.getElementById('dashLocationName');
        const dashLocationN = document.getElementById('dashLocation');

        if (locDisplayNode) locDisplayNode.innerText = structuralLocationName + " ";
        if (dashLocationNode) dashLocationNode.innerText = structuralLocationName;
        if (dashLocationN) dashLocationN.innerText = structuralLocation;

        // 4. Map data arrays seamlessly into downstream visualization targets
        weatherDataSet = {
            timeline: payload.list.map(item => {
                const d = new Date(item.dt * 1000);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:00`;
            }),
            temperature: payload.list.map(item => item.main.temp),
            humidity: payload.list.map(item => item.main.humidity),
            pop: payload.list.map(item => Math.round((item.pop || 0) * 100)),
            rainVolume: payload.list.map(item => item.rain ? (item.rain['3h'] || 0) : 0),
            description: payload.list.map(item => item.weather[0].description)
        };

        // 5. Fire core UI engine updates
        renderNaturalLanguageBanners();
        syncSidebarDisplayMetrics(0);
        buildWeeklyStripDeck();
        startSystemClockLoop();
        animateMultiAxisLineGraph();
        renderRainfallBarChart();

        const loader = document.getElementById('sys-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 400);
        }
    } catch (error) {
        console.error("Critical failure parsing live metrics telemetry:", error);
    }
}

function startSystemClockLoop() {
    const clockNode = document.getElementById('live-timestamp-clock');
    if (!clockNode) return;
    const run = () => {
        const now = new Date();
        clockNode.innerText = `${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} | ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    };
    run();
    setInterval(run, 60000);
}
// Add these global placeholder variables at the top of your script
let rainAlertMessage = "Clear skies projected for the next 24 hours.";
let isRainExpectedActive = false;

function renderNaturalLanguageBanners() {
    const container = document.getElementById('nlp-alert-box');
    const titleNode = document.getElementById('nlp-alert-title');
    const bodyNode = document.getElementById('nlp-alert-body');

    if (!container || !titleNode || !bodyNode || !weatherDataSet || !weatherDataSet.timeline.length) return;

    let rainStartIndex = -1;
    let rainEndIndex = -1;
    const lookaheadSteps = Math.min(8, weatherDataSet.pop.length);

    for (let i = 0; i < lookaheadSteps; i++) {
        const hasRain = weatherDataSet.pop[i] >= 40 || weatherDataSet.rainVolume[i] > 0;
        if (hasRain && rainStartIndex === -1) {
            rainStartIndex = i;
        }
        if (!hasRain && rainStartIndex !== -1 && rainEndIndex === -1) {
            rainEndIndex = i;
            break;
        }
    }

    if (rainStartIndex !== -1 && rainEndIndex === -1) {
        rainEndIndex = lookaheadSteps;
    }

    container.style.display = "block";

    // References to your new navbar notification items
    const bellBadge = document.getElementById('notification-badge');
    const panelContent = document.getElementById('notification-panel-content');

    if (rainStartIndex !== -1) {
        // === STATE 1: RAIN PREDICTED ===
        const startTimeStr = weatherDataSet.timeline[rainStartIndex];
        const startDate = new Date(startTimeStr);
        const startHour = startDate.getHours();
        const durationHours = (rainEndIndex - rainStartIndex) * 3;

        let timePeriod = "this afternoon";
        if (startHour < 12) timePeriod = "this morning";
        else if (startHour >= 18) timePeriod = "tonight";

        const format12h = (dateObj) => {
            return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        };

        const displayStartTime = format12h(startDate);
        const endDate = new Date(weatherDataSet.timeline[Math.min(rainEndIndex, weatherDataSet.timeline.length - 1)]);

        if (rainEndIndex >= weatherDataSet.timeline.length) {
            endDate.setTime(startDate.getTime() + (durationHours * 60 * 60 * 1000));
        }
        const displayEndTime = format12h(endDate);

        titleNode.innerText = `Rain expected ${timePeriod}`;
        bodyNode.innerText = `Intermittent showers are possible between ${displayStartTime} and ${displayEndTime} (a ${durationHours}-hour window).`;
        
        // 🔔 UPDATE NOTIFICATION ARCHITECTURE
        isRainExpectedActive = true;
        rainAlertMessage = `⚠️ <strong>Rain Alert:</strong> Showers expected ${timePeriod} between <strong>${displayStartTime}</strong> and <strong>${displayEndTime}</strong>.`;
        
        if (bellBadge) {
            bellBadge.style.display = "block";
            bellBadge.classList.add("pulse"); // Triggers the dynamic CSS pulse ring
        }

    } else {
        // === STATE 2: NO RAIN PREDICTED ===
        titleNode.innerText = "No rain expected today";
        bodyNode.innerText = "Clear skies or stable conditions are projected for the next 24 hours. Enjoy your day!";
        
        // 🔔 SYSTEM RESET CLEAR STATE
        isRainExpectedActive = false;
        rainAlertMessage = "☀️ Stable weather conditions window. No rain expected within the next 24 hours.";
        
        if (bellBadge) {
            bellBadge.style.display = "none";
            bellBadge.classList.remove("pulse");
        }
    }

    // Assign the built text message inside the panel element safely
    if (panelContent) {
        panelContent.innerHTML = rainAlertMessage;
    }
}
function syncSidebarDisplayMetrics(index) {
    const m = weatherDataSet;
    if (!m) return;

    const currentTemp = m.temperature[index];
    const currentPop = m.pop[index];
    const currentHumidity = m.humidity[index];
    const currentRainVol = m.rainVolume[index];
    const rawDescription = m.description[index].toLowerCase();

    const tempNode = document.getElementById('hero-temp-val');
    const popNode = document.getElementById('lbl-pop');
    const humidNode = document.getElementById('lbl-humidity');
    const soilNode = document.getElementById('lbl-soil');
    const descNode = document.getElementById('lbl-desc');
    const iconMountNode = document.getElementById('hero-icon-mount');

    if (tempNode) tempNode.innerText = currentTemp.toFixed(1);
    if (popNode) popNode.innerText = currentPop + "%";
    if (humidNode) humidNode.innerText = currentHumidity + "%";
    if (soilNode) soilNode.innerText = (0.22).toFixed(2) + " m³/m³";

    let dynamicProfileText = "Cloudy";

    if ((currentRainVol > 0.2) || (rawDescription.includes("rain") && currentPop > 50)) {
        if (currentRainVol >= 7.6) {
            dynamicProfileText = "heavy rain";
        } else if (currentRainVol >= 2.6) {
            dynamicProfileText = "moderate rain";
        } else {
            dynamicProfileText = "light rain";
        }
    } else if (rawDescription.includes("thunderstorm")) {
        dynamicProfileText = "thunderstorm";
    } else if (rawDescription.includes("cloud") || rawDescription.includes("overcast") || (rawDescription.includes("rain") && currentRainVol <= 0.2)) {
        if (rawDescription.includes("broken") || rawDescription.includes("scattered") || rawDescription.includes("few")) {
            dynamicProfileText = "mostly cloudy";
        } else {
            dynamicProfileText = "cloudy";
        }
    } else if (rawDescription.includes("clear") || rawDescription.includes("sunny")) {
        dynamicProfileText = "sunny";
    }

    if (descNode) descNode.innerText = dynamicProfileText;

    let iconUrl = cdnAssetIcons.cloudy;

    if (dynamicProfileText.includes("rain")) {
        iconUrl = cdnAssetIcons.showers;
    } else if (dynamicProfileText === "thunderstorm") {
        iconUrl = cdnAssetIcons.thunderstorm;
    } else if (dynamicProfileText === "cloudy") {
        iconUrl = cdnAssetIcons.cloudy;
    } else if (dynamicProfileText === "mostly cloudy") {
        iconUrl = cdnAssetIcons.mostlySunny;
    } else if (dynamicProfileText === "sunny") {
        iconUrl = cdnAssetIcons.sunny;
    }

    if (iconMountNode) {
        iconMountNode.innerHTML = `<img src="${iconUrl}" class="main-icon" alt="${dynamicProfileText}">`;
    }
}

function animateMultiAxisLineGraph() {
    const svg = document.getElementById('svg-line-canvas');
    if (!svg) return;
    const grids = document.getElementById('line-gridlines-group');
    if (!grids) return;

    const totalWidth = svg.parentElement.getBoundingClientRect().width || 800;
    svg.setAttribute('width', totalWidth);

    const canvasHeight = 230;
    const pad = { top: 25, right: 20, bottom: 35, left: 45 };
    const mainWidth = totalWidth - pad.left - pad.right;
    const mainHeight = canvasHeight - pad.top - pad.bottom;

    const sampleWindow = 8;
    const subsetTemps = weatherDataSet.temperature.slice(0, sampleWindow);
    const subsetHumids = weatherDataSet.humidity.slice(0, sampleWindow);
    const subsetTimes = weatherDataSet.timeline.slice(0, sampleWindow);

    grids.innerHTML = '';
    lineChartPointsArray = [];

    // Define a clear, unified chart ceiling max (100 accommodates 0-100% humidity perfectly)
    const chartYMax = 100;

    // Shared conversion formula: converts any raw value (temp or humidity) to exact SVG pixel heights
    function valueToSvgY(val) {
        const ratio = val / chartYMax;
        return pad.top + mainHeight - (ratio * mainHeight);
    }

    // Render Y-Axis labels dynamically based on our unified max (0 to 100)
    const verticalTicks = [0, 20, 40, 60, 80, 100];
    verticalTicks.forEach(tick => {
        const yPos = valueToSvgY(tick);
        grids.innerHTML += `<line class="grid-line-dashed" x1="${pad.left}" y1="${yPos}" x2="${totalWidth - pad.right}" y2="${yPos}" />`;
        grids.innerHTML += `<text class="axis-text" x="${pad.left - 12}" y="${yPos + 4}" text-anchor="end">${tick}</text>`;
    });

    const deltaStepX = mainWidth / (sampleWindow - 1);

    // Calculate line coordinates using the shared valueToSvgY scaler
    subsetTimes.forEach((timeStr, i) => {
        const x = pad.left + (i * deltaStepX);

        // BOTH profiles now map directly to their true numeric positions on the 0-100 grid space
        const yTemp = valueToSvgY(subsetTemps[i]);
        const yHumid = valueToSvgY(subsetHumids[i]);

        lineChartPointsArray.push({ x, yTemp, yHumid, temp: subsetTemps[i], humid: subsetHumids[i], time: timeStr });
        const labelHour = timeStr.split('T')[1].substring(0, 5);
        grids.innerHTML += `<text class="axis-text" x="${x}" y="${canvasHeight - 12}" text-anchor="middle">${i === 0 ? 'Now' : labelHour}</text>`;
    });

    let pathT = `M ${lineChartPointsArray[0].x} ${lineChartPointsArray[0].yTemp}`;
    let pathH = `M ${lineChartPointsArray[0].x} ${lineChartPointsArray[0].yHumid}`;

    lineChartPointsArray.forEach((pt, i) => {
        if (i > 0) {
            pathT += ` L ${pt.x} ${pt.yTemp}`;
            pathH += ` L ${pt.x} ${pt.yHumid}`;
        }
    });

    let fillT = `M ${lineChartPointsArray[0].x} ${pad.top + mainHeight}`;
    lineChartPointsArray.forEach(pt => fillT += ` L ${pt.x} ${pt.yTemp}`);
    fillT += ` L ${lineChartPointsArray[lineChartPointsArray.length - 1].x} ${pad.top + mainHeight} Z`;

    // Shading adjustment: Fill area expands clean between temperature line and humidity line bounds
    let fillH = `M ${lineChartPointsArray[0].x} ${lineChartPointsArray[0].yTemp}`;
    lineChartPointsArray.forEach(pt => fillH += ` L ${pt.x} ${pt.yHumid}`);
    for (let i = lineChartPointsArray.length - 1; i >= 0; i--) {
        fillH += ` L ${lineChartPointsArray[i].x} ${lineChartPointsArray[i].yTemp}`;
    }
    fillH += ` Z`;

    const nodeT = document.getElementById('path-temp-curve');
    const nodeH = document.getElementById('path-humidity-curve');
    const fillNodeT = document.getElementById('path-temp-shading');
    const fillNodeH = document.getElementById('path-humidity-shading');

    if (nodeT) nodeT.setAttribute('d', pathT);
    if (nodeH) nodeH.setAttribute('d', pathH);
    if (fillNodeT) fillNodeT.setAttribute('d', fillT);
    if (fillNodeH) fillNodeH.setAttribute('d', fillH);

    [nodeT, nodeH].forEach(path => {
        if (!path) return;
        const len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        path.style.transition = 'none';
        path.getBoundingClientRect();
        path.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)';
        path.style.strokeDashoffset = '0';
    });

    [fillNodeT, fillNodeH].forEach(fill => {
        if (!fill) return;
        fill.style.opacity = '0';
        fill.style.transition = 'none';
        fill.getBoundingClientRect();
        fill.style.transition = 'opacity 2s cubic-bezier(0.4, 0, 0.2, 1)';
        fill.style.opacity = '1';
    });

    const interceptor = document.getElementById('rect-line-interceptor');
    const crosshair = document.getElementById('line-crosshair-track');
    const anchorT = document.getElementById('dot-temp-anchor');
    const anchorH = document.getElementById('dot-humidity-anchor');
    const bubble = document.getElementById('tooltip-line-graph');

    if (crosshair) {
        crosshair.setAttribute('y1', pad.top);
        crosshair.setAttribute('y2', pad.top + mainHeight);
    }

    const handleTrackingMovement = (e) => {
        const boundingBox = svg.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const pointerX = clientX - boundingBox.left;
        let idx = Math.round((pointerX - pad.left) / deltaStepX);
        idx = Math.max(0, Math.min(sampleWindow - 1, idx));
        const coords = lineChartPointsArray[idx];

        if (!coords) return;

        if (crosshair) {
            crosshair.setAttribute('x1', coords.x);
            crosshair.setAttribute('x2', coords.x);
            crosshair.style.display = "block";
        }

        if (anchorT) {
            anchorT.setAttribute('cx', coords.x);
            anchorT.setAttribute('cy', coords.yTemp);
            anchorT.style.display = "block";
        }

        if (anchorH) {
            anchorH.setAttribute('cx', coords.x);
            anchorH.setAttribute('cy', coords.yHumid);
            anchorH.style.display = "block";
        }

        if (bubble) {
            bubble.innerHTML = `
                <div style="font-weight:700; color:#ffffff; margin-bottom:4px;">Time: ${coords.time.split('T')[1].substring(0, 5)}</div>
                <div style="color:var(--temp-color); font-weight:600;">Temp: ${coords.temp.toFixed(1)}°C</div>
                <div style="color:var(--humidity-color); font-weight:600;">Humidity: ${coords.humid}%</div>
            `;
            bubble.style.display = "block";
            bubble.style.left = `${coords.x + 16}px`;
            bubble.style.top = `${coords.yTemp - 20}px`;
        }
        syncSidebarDisplayMetrics(idx);
    };

    const handleTrackingBreak = () => {
        if (crosshair) crosshair.style.display = "none";
        if (anchorT) anchorT.style.display = "none";
        if (anchorH) anchorH.style.display = "none";
        if (bubble) bubble.style.display = "none";
        syncSidebarDisplayMetrics(0);
    };

    if (interceptor) {
        interceptor.addEventListener('mousemove', handleTrackingMovement);
        interceptor.addEventListener('touchmove', handleTrackingMovement);
        interceptor.addEventListener('mouseleave', handleTrackingBreak);
        interceptor.addEventListener('touchend', handleTrackingBreak);
    }
}

function renderRainfallBarChart() {
    const svg = document.getElementById('svg-bar-canvas');
    if (!svg) return;
    const grids = document.getElementById('bar-gridlines-group');
    const barsContainer = document.getElementById('bars-graphic-nodes-container');
    if (!grids || !barsContainer) return;

    const width = svg.parentElement.getBoundingClientRect().width || 800;
    svg.setAttribute('width', width);
    const height = 230;

    const pad = { top: 25, right: 20, bottom: 35, left: 55 }; // Left pad widened to clear decimals
    const graphWidth = width - pad.left - pad.right;
    const graphHeight = height - pad.top - pad.bottom;

    grids.innerHTML = '';
    barsContainer.innerHTML = '';

    // 1. Group raw timeline entries into daily rainfall totals
    let groupedSlots = {};
    weatherDataSet.timeline.forEach((timeStr, idx) => {
        const dateKey = timeStr.split('T')[0];
        if (!groupedSlots[dateKey]) groupedSlots[dateKey] = [];
        groupedSlots[dateKey].push(weatherDataSet.rainVolume[idx]);
    });

    const keys = Object.keys(groupedSlots).slice(0, 7);

    // 2. Find the highest aggregate volume among the 7 days
    let maxRainfallValue = 0;
    keys.forEach(key => {
        const dailyTotal = groupedSlots[key].reduce((a, b) => a + b, 0);
        if (dailyTotal > maxRainfallValue) {
            maxRainfallValue = dailyTotal;
        }
    });

    // Fallback default frame space limit if there is no rain expected at all
    if (maxRainfallValue === 0) {
        maxRainfallValue = 10;
    }

    // 3. Establish upper boundary cap exactly 0.3% higher than peak value
    const dynamicYMax = maxRainfallValue * 1.003;

    // 4. Generate dynamic linear ticks split evenly across 4 layout references
    const ticksCount = 4;
    for (let i = 0; i <= ticksCount; i++) {
        const currentTickVal = (dynamicYMax / ticksCount) * i;
        const ratio = currentTickVal / dynamicYMax;
        const y = pad.top + graphHeight - (ratio * graphHeight);

        // Draw path grids
        grids.innerHTML += `<line class="grid-line-dashed" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" />`;
        // Draw text data scale markings (Formatted cleanly to 1 decimal place)
        grids.innerHTML += `<text class="axis-text" x="${pad.left - 12}" y="${y + 4}" text-anchor="end">${currentTickVal.toFixed(1)} mm</text>`;
    }

    const columnWidth = graphWidth / keys.length;
    const bubble = document.getElementById('tooltip-bar-chart');

    // 5. Construct Vector columns using scaled calculations
    keys.forEach((key, i) => {
        const totalRainVolume = groupedSlots[key].reduce((a, b) => a + b, 0);
        const dayLabel = new Date(key).toLocaleDateString('en-US', { weekday: 'short' });

        // Calculate heights precisely relative to the customized dynamic ceiling
        const barHeight = (totalRainVolume / dynamicYMax) * graphHeight;

        const barWidth = columnWidth - 8;
        const x = pad.left + (i * columnWidth) + 4;
        const y = pad.top + graphHeight - barHeight;

        barsContainer.innerHTML += `
            <rect class="bar-rect-node" data-index="${i}" x="${x}" y="${pad.top + graphHeight}" width="${barWidth}" height="0" rx="3">
                <animate attributeName="y" from="${pad.top + graphHeight}" to="${y}" dur="2s" cubic-bezier(0.4, 0, 0.2, 1) fill="freeze" />
                <animate attributeName="height" from="0" to="${barHeight}" dur="2s" cubic-bezier(0.4, 0, 0.2, 1) fill="freeze" />
            </rect>
            <text class="axis-text" x="${x + (barWidth / 2)}" y="${height - 12}" text-anchor="middle">${dayLabel}</text>
        `;

        // Safely map hover interactive hooks right after vectors finish rendering animations
        setTimeout(() => {
            const elements = barsContainer.querySelectorAll('.bar-rect-node');
            elements.forEach(bar => {
                if (parseInt(bar.getAttribute('data-index')) === i) {
                    bar.addEventListener('mouseenter', () => {
                        elements.forEach(b => b.classList.add('muted'));
                        bar.classList.remove('muted');
                        if (bubble) {
                            bubble.innerHTML = `<strong>${dayLabel} Volume</strong><br/><span style="color:var(--humidity-color);">${totalRainVolume.toFixed(1)} mm</span>`;
                            bubble.style.display = "block";
                            bubble.style.left = `${x}px`;
                            bubble.style.top = `${y - 45}px`;
                        }
                    });
                    bar.addEventListener('mouseleave', () => {
                        elements.forEach(b => b.classList.remove('muted'));
                        if (bubble) bubble.style.display = "none";
                    });
                }
            });
        }, 2050);
    });
}

function buildWeeklyStripDeck() {
    const container = document.getElementById('weekly-forecast-strip');
    if (!container) return;
    container.innerHTML = '';

    let dailyGroups = {};
    let dailyDescriptions = {};

    weatherDataSet.timeline.forEach((timeStr, idx) => {
        const dateKey = timeStr.split('T')[0];
        if (!dailyGroups[dateKey]) {
            dailyGroups[dateKey] = [];
            dailyDescriptions[dateKey] = [];
        }
        dailyGroups[dateKey].push(weatherDataSet.temperature[idx]);
        dailyDescriptions[dateKey].push({
            desc: weatherDataSet.description[idx].toLowerCase(),
            vol: weatherDataSet.rainVolume[idx]
        });
    });

    Object.keys(dailyGroups).slice(0, 7).forEach((key, i) => {
        const dayLabel = new Date(key).toLocaleDateString('en-US', { weekday: 'short' });
        const high = Math.round(Math.max(...dailyGroups[key]));
        const low = Math.round(Math.min(...dailyGroups[key]));

        const primeMetrics = dailyDescriptions[key][0];
        let dayIconUrl = cdnAssetIcons.mostlySunny;

        if (primeMetrics.vol > 0 || primeMetrics.desc.includes("rain")) {
            dayIconUrl = cdnAssetIcons.showers;
        } else if (primeMetrics.desc.includes("thunderstorm")) {
            dayIconUrl = cdnAssetIcons.thunderstorm;
        } else if (primeMetrics.desc.includes("cloud")) {
            if (primeMetrics.desc.includes("broken") || primeMetrics.desc.includes("scattered")) {
                dayIconUrl = cdnAssetIcons.mostlySunny;
            } else {
                dayIconUrl = cdnAssetIcons.cloudy;
            }
        } else if (primeMetrics.desc.includes("clear") || primeMetrics.desc.includes("sunny")) {
            dayIconUrl = cdnAssetIcons.sunny;
        }

        container.innerHTML += `
            <div class="forecast-strip-card ${i === 0 ? 'active' : ''}">
                <div class="forecast-day-txt">${dayLabel}</div>
                <img src="${dayIconUrl}" class="forecast-strip-icon" alt="Deck Asset">
                <div class="forecast-range-txt">${high}°<span class="low-bound">${low}°</span></div>
            </div>
        `;
    });
}

// Fire the initialize loop
bootstrapPipeline();
// Notification Bell Dropdown Panel Toggle Mechanics
document.addEventListener('DOMContentLoaded', () => {
    const bellBtn = document.getElementById('notification-bell-btn');
    const dropPanel = document.getElementById('notification-drop-panel');
    const bellBadge = document.getElementById('notification-badge');

    if (bellBtn && dropPanel) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stops event bubbles so window listener doesn't instantly close it
            
            const isHidden = dropPanel.style.display === 'none';
            dropPanel.style.display = isHidden ? 'block' : 'none';

            // Optional: Remove the pulsing alert badge once the user has acknowledged the warning panel click
            if (isHidden && bellBadge) {
                bellBadge.classList.remove('pulse');
            }
        });
    }

    // Close open panel context if user clicks anywhere outside on the screen background
    window.addEventListener('click', (e) => {
        if (dropPanel && dropPanel.style.display === 'block') {
            if (!dropPanel.contains(e.target) && !bellBtn.contains(e.target)) {
                dropPanel.style.display = 'none';
            }
        }
    });
});
window.addEventListener('resize', () => {
    if (weatherDataSet) {
        animateMultiAxisLineGraph();
        renderRainfallBarChart();
    }
});