// ==========================================
// 1. GLOBAL STATE & CORE PIPELINE LOGIC
// ==========================================
let selectedFileHandle = null;

// Dictionary mapping official Pl@ntNet item response 'name' fields to crisp English labels
const EPPO_DISEASE_MAP = {
    "PHMOCH": "Phomopsis Cane and Leaf Spot",
    "USTIMA": "Corn Smut",
    "PUCCRE": "Brown Rust",
    "VENTIN": "Apple Scab",
    "BOTRCI": "Botrytis Bunch Rot / Gray Mold",
    "ELSIAM": "Grapevine Anthracnose",
    "APHISP": "Aphid Infestation"
};

function processLocalImage(event) {
    const file = event.target.files[0] || (event.target && event.target.files ? event.target.files[0] : null);
    if (!file) return;

    selectedFileHandle = file;

    const reader = new FileReader();
    reader.onload = function (e) {
        const previewElement = document.getElementById('imagePreview');
        if (previewElement) {
            previewElement.src = e.target.result;
            const previewContainer = document.getElementById('previewContainer');
            if (previewContainer) previewContainer.style.display = 'block';
        }

        // --- UPDATED LOGIC TO DISAPPEAR UPLOAD ELEMENTS ---
        const uploadPrompt = document.getElementById('uploadPrompt');
        if (uploadPrompt) uploadPrompt.style.display = 'none';

        // Completely hide the instructions/tips or sub-labels inside the drop area if present
        const dropzone = document.getElementById('dropzone');
        if (dropzone) {
            const photoTips = dropzone.querySelector('.photo-tips') || document.getElementById('photoTips');
            if (photoTips) photoTips.style.display = 'none';

            const uploadIcon = dropzone.querySelector('.upload-icon');
            if (uploadIcon) uploadIcon.style.display = 'none';
        }

        const actionBtn = document.getElementById('actionBtn') || document.getElementById('analyseBtn');
        if (actionBtn) actionBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

async function runAutomatedPipeline() {
    const statusMessage = document.getElementById("statusMessage");
    const resultSection = document.getElementById("resultSection");
    const emptyState = document.getElementById("emptyState");
    const actionBtn = document.getElementById("actionBtn");

    if (statusMessage) statusMessage.style.display = "block";
    if (resultSection) resultSection.style.display = "none";
    if (emptyState) emptyState.style.display = "none";

    if (actionBtn) {
        actionBtn.disabled = true;
        actionBtn.innerHTML = '<span class="spinner"></span> Analyzing...';
    }

    try {
        if (!selectedFileHandle) {
            throw new Error("No usable image binary resource loaded.");
        }

        if (statusMessage) {
            statusMessage.textContent = "Step 1: Uploading leaf sample to Pl@ntNet engine for botanical identification...";
        }

        const formData = new FormData();
        formData.append("image", selectedFileHandle);

        // --- 1. RUN DETECT (PL@NTNET ENGAGEMENT) ---
        const response = await fetch('/detect', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `API Pipeline breakdown status: ${response.status}`);
        }

        const combinedData = await response.json();
        const identity = combinedData.identity;

        const rawCode = identity.name || "";
        let mappedName = EPPO_DISEASE_MAP[rawCode] || identity.description || identity.name;
        const confidencePercentage = (identity.score * 100).toFixed(1) + "%";

        // Display basic disease identity specs instantly
        document.getElementById("detectedName").textContent = mappedName;
        document.getElementById("detectedConfidence").textContent = confidencePercentage;

        // --- 2. DYNAMICALLY INFER CROP GROUP TYPE ---
        let inferredCrop = "Crop";
        const upperName = mappedName.toUpperCase();
        if (upperName.includes("CORN") || upperName.includes("MAIZE") || upperName.includes("USTIMA")) inferredCrop = "Maize";
        else if (upperName.includes("TOMATO")) inferredCrop = "Tomato";
        else if (upperName.includes("APPLE") || upperName.includes("VENTIN")) inferredCrop = "Apple";
        else if (upperName.includes("GRAPE") || upperName.includes("ELSIAM") || upperName.includes("BOTRCI")) inferredCrop = "Grapevine";

        if (statusMessage) {
            statusMessage.textContent = `Step 2: Pl@ntNet matched "${mappedName}". Calling AgriBot AI for recommendations...`;
        }

        // Target outputs elements and show a loading placeholder state for text generation
        const symptomsElem = document.getElementById("libSymptoms");
        const controlsElem = document.getElementById("libControls");
        const descElem = document.getElementById("libDescription");

        if (symptomsElem) symptomsElem.innerHTML = "Generating clinical symptoms...";
        if (controlsElem) controlsElem.innerHTML = "Calculating structural control methods...";
        if (descElem) descElem.textContent = "AgriBot AI Engine generating specific treatment profiling data...";

        // Reveal the result container now so the user can watch the stream render
        if (statusMessage) statusMessage.style.display = "none";
        if (resultSection) resultSection.style.display = "block";

        // --- 3. FETCH STREAMING RECOVERY MATRIX FROM AGRIBOT ---
        const aiResponse = await fetch('/api/agribot/diagnose', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                diseaseName: mappedName,
                speciesName: inferredCrop
            })
        });

        if (!aiResponse.ok) throw new Error("AI Recommendation engine processing breakdown.");

        const reader = aiResponse.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let fullAiText = "";

        // Reset elements before writing text stream chunks
        if (symptomsElem) symptomsElem.textContent = "";
        if (controlsElem) controlsElem.textContent = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                const cleanedLine = line.trim();
                if (!cleanedLine || cleanedLine === "data: [DONE]") continue;

                if (cleanedLine.startsWith("data: ")) {
                    try {
                        const parsedData = JSON.parse(cleanedLine.replace(/^data: /, ""));
                        const deltaText = parsedData.choices[0]?.delta?.content;

                        if (deltaText) {
                            fullAiText += deltaText;

                            // Parse out text content into your layout sections organically
                            // If the response uses your markdown headers, we split or map them here.
                            // To keep it perfectly clean, we append the accumulating stream text.
                            // Alternative: parse full text at the end, or stream into unified content:
                            symptomsElem.textContent = fullAiText;
                        }
                    } catch (e) {
                        // Suppress parsing fragment noise
                    }
                }
            }
        }

        // Final cleanup of formatting layout sections after stream completes
        if (fullAiText.includes("### 🌿 Treatment")) {
            const parts = fullAiText.split(/### 🌿 Treatment & Controls|### 🛡️ Preventative Measures/i);
            if (symptomsElem) symptomsElem.textContent = parts[0].replace(/### 🔍 Observed Symptoms/i, "").trim();
            if (controlsElem) controlsElem.textContent = ((parts[1] || "") + "\n\n" + (parts[2] || "")).trim();
        }

        // ==========================================================================
        // CROSS-DOMAIN DATA TRANSIT BRIDGE (Sends Data up to Dashboard)
        // ==========================================================================
        if (window.parent !== window) {
            window.parent.postMessage({
                type: "NEW_DISEASE_SCAN",
                diseaseName: mappedName,
                cropType: inferredCrop,
                confidenceValue: confidencePercentage
            }, "*");
            console.log("Pipeline result successfully broadcasted to parent dashboard window context.");
        }

    } catch (error) {
        console.error("Pipeline tracer error summary:", error);
        if (statusMessage) {
            statusMessage.style.display = "block";
            statusMessage.textContent = "Process stopped: " + error.message;
        }
    } finally {
        if (actionBtn) {
            actionBtn.disabled = false;
            actionBtn.innerHTML = 'Analyze Leaf';
        }
    }
}

// Keeping your fallback map helper for background logging stability
function PlayNetResultsExtraction(results) {
    const topMatch = results[0];
    const rawCode = topMatch.name || "";
    let diseaseLabel = EPPO_DISEASE_MAP[rawCode] || topMatch.description;

    if (!diseaseLabel) {
        diseaseLabel = rawCode ? `${rawCode} Pathology` : "Identified Crop Disease";
    }

    const confidenceScore = (topMatch.score * 100).toFixed(1) + "%";
    document.getElementById("detectedName").textContent = diseaseLabel;
    document.getElementById("detectedConfidence").textContent = confidenceScore;

    return { label: diseaseLabel, code: rawCode };
}

// ==========================================
// 2. ADDITIONAL LAYOUT & DOM INTERACTIONS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Crop Filtering Chips Toggle
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });

    const dropzone = document.getElementById('dropzone');
    if (dropzone) {
        ['dragover', 'dragenter'].forEach(ev => {
            dropzone.addEventListener(ev, (e) => {
                e.preventDefault();
                dropzone.classList.add('dragging');
            });
        });

        ['dragleave', 'drop'].forEach(ev => {
            dropzone.addEventListener(ev, (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragging');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const fileInput = document.getElementById('fileInput');
            if (e.dataTransfer.files.length && fileInput) {
                fileInput.files = e.dataTransfer.files;
                processLocalImage({ target: fileInput });
            }
        });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.value = '';

            selectedFileHandle = null;

            const previewContainer = document.getElementById('previewContainer');
            const imagePreview = document.getElementById('imagePreview');
            const uploadPrompt = document.getElementById('uploadPrompt');
            const actionBtn = document.getElementById('actionBtn');
            const emptyState = document.getElementById('emptyState');
            const resultSection = document.getElementById('resultSection');
            const statusMessage = document.getElementById('statusMessage');

            if (previewContainer) previewContainer.style.display = 'none';
            if (imagePreview) imagePreview.src = '';
            if (uploadPrompt) uploadPrompt.style.display = 'block';
            if (actionBtn) actionBtn.disabled = true;
            if (emptyState) emptyState.style.display = 'block';
            if (resultSection) resultSection.style.display = 'none';
            if (statusMessage) statusMessage.style.display = 'none';
        });
    }
});