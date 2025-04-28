// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const matchUrlInput = document.getElementById("match-url");
    const refreshRateSlider = document.getElementById("refresh-rate");
    const watchDurationSlider = document.getElementById("watch-duration");
    const refreshValueSpan = document.getElementById("refresh-value");
    const watchValueSpan = document.getElementById("watch-value");
    const startStopButton = document.getElementById("start-stop-button");
    const matchScoreDisplay = document.getElementById("match-score");
    const statusMessage = document.getElementById("status-message");
    const generateLinkButton = document.getElementById("generate-share-link");
    const shareLinkOutput = document.getElementById("share-link-output");
    const settingsFieldset = document.querySelector('fieldset:nth-of-type(2)');
    const matchDetailsFieldset = document.querySelector('fieldset:nth-of-type(1)');

    // --- State Variables ---
    let isMonitoringActive = false;
    let fetchIntervalId = null;
    let stopTimeoutId = null;
    let currentMatchUrl = '';

    // --- Core Functions ---

    async function fetchAndAnnounceScore() {
        // ... (fetch logic remains the same) ...
        if (!isMonitoringActive) {
            return;
        }
        updateStatus("Fetching score...", "info");
        try {
            if (typeof CONFIG === 'undefined' || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
                throw new Error("Configuration is missing. Cannot fetch score.");
            }
            const encodedUrl = encodeURIComponent(currentMatchUrl);
            const response = await fetch(`${CONFIG.SUPABASE_URL}?url=${encodedUrl}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                let errorMsg = `Failed to fetch score (Status: ${response.status})`;
                try { const errorData = await response.json(); errorMsg = errorData.error || errorData.message || errorMsg; } catch (e) { console.warn("Could not parse error response body."); }
                throw new Error(errorMsg);
            }
            const matchScore = await response.text();
            if ( !isMonitoringActive) return;
            matchScoreDisplay.innerText = matchScore || "Score data unavailable.";
            updateStatus("Score updated.", "success");
            speakScore(matchScore); // Call the modified speakScore function
        } catch (error) {
            console.error("Error fetching score:", error);
            matchScoreDisplay.innerText = "Error fetching score.";
            updateStatus(`Error: ${error.message}`, "error");
        }
    }

    /**
     * Uses the SpeechSynthesis API to announce the score.
     * Simplifed: Replaces '/' with ' runs for '.
     * @param {string} score The score text to speak.
     */
    function speakScore(score) {
        if (!score || typeof window.speechSynthesis === 'undefined') {
            console.warn("Speech synthesis not available or score is empty.");
            return;
        }

        let textToSpeak = score.trim(); // Start with the trimmed original score

        // If the text includes '/', replace the first '/' with ' runs for '
        if (textToSpeak.includes('/')) {
            textToSpeak = textToSpeak.replace('/', ' runs for ');
        }
        // Otherwise, textToSpeak remains the original trimmed score

        try {
            window.speechSynthesis.cancel(); // Stop previous speech
            const utterance = new SpeechSynthesisUtterance(textToSpeak); // Use the potentially modified text
            utterance.lang = 'en-US'; // Or 'en-IN', 'en-GB' as preferred
            utterance.pitch = 1;
            utterance.rate = 1;
            utterance.volume = 1;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("Speech synthesis error:", error);
            updateStatus("Speech synthesis failed.", "error");
        }
    }

    // --- startMonitoring, stopMonitoring,functions remain the same ---
    function startMonitoring() {
        currentMatchUrl = matchUrlInput.value.trim();
        const refreshRate = parseInt(refreshRateSlider.value, 10) * 1000;
        const watchDuration = parseInt(watchDurationSlider.value, 10) * 60 * 1000;
        if (!currentMatchUrl) { updateStatus("Please enter a CricClubs match URL.", "error"); return; }
        try { new URL(currentMatchUrl); } catch (_) { updateStatus("Invalid URL format.", "error"); return; }
        isMonitoringActive = true; isPaused = false;
        updateButtonStates(); disableSettings(true);
        updateStatus("Monitoring started...", "info");
        matchScoreDisplay.innerText = "Fetching initial score...";
        fetchAndAnnounceScore();
        clearInterval(fetchIntervalId);
        fetchIntervalId = setInterval(fetchAndAnnounceScore, refreshRate);
        clearTimeout(stopTimeoutId);
        if (watchDuration > 0) {
            stopTimeoutId = setTimeout(() => { if (isMonitoringActive) { stopMonitoring("Monitoring duration ended."); } }, watchDuration);
        }
    }
    function stopMonitoring(reason = "Monitoring stopped.") {
        clearInterval(fetchIntervalId); clearTimeout(stopTimeoutId);
        fetchIntervalId = null; stopTimeoutId = null;
        isMonitoringActive = false; isPaused = false;
        if (typeof window.speechSynthesis !== 'undefined') { window.speechSynthesis.cancel(); }
        updateButtonStates(); disableSettings(false); updateStatus(reason, "info");
    }

    // --- UI Update Functions: updateButtonStates, disableSettings, updateStatus remain the same ---
    function updateButtonStates() {
        if (isMonitoringActive) {
            startStopButton.textContent = "Stop Monitoring 🛑";
        } else {
            startStopButton.textContent = "Start Monitoring";
        }
    }
    function disableSettings(disable) {
        if (settingsFieldset) settingsFieldset.disabled = disable;
        if (matchDetailsFieldset) matchDetailsFieldset.disabled = disable;
    }
    function updateStatus(message, type = "info") {
        statusMessage.textContent = message; statusMessage.className = '';
        if (type === 'error' || type === 'success') { statusMessage.classList.add(type); }
        else if (type === 'info') { statusMessage.classList.add(type); }
    }


   // --- Shareable Link Function (Corrected) ---
    /**
     * Generates a shareable link based on current settings and copies it to the clipboard.
     * (No longer displays the link in an input field)
     */
    function generateShareLink() {
        // Check if elements required for *generating* the link exist
        // Removed shareLinkOutput from this check
        if (!matchUrlInput || !refreshRateSlider || !watchDurationSlider || typeof updateStatus !== 'function') {
             console.error("Required elements (inputs, sliders, status func) for generating share link are missing.");
             if (typeof updateStatus === 'function') { updateStatus("Cannot generate link: Missing required page elements.", "error"); }
             return;
        }

        const url = matchUrlInput.value.trim(); const refresh = refreshRateSlider.value; const duration = watchDurationSlider.value;
        const params = new URLSearchParams();
        if (url) { params.set('url', url); }
        params.set('refresh', refresh); params.set('duration', duration);
        const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

        // --- REMOVED: No longer displaying the link ---

        // --- Clipboard API for Copying ---
        if (!navigator.clipboard) {
            updateStatus("Clipboard API unavailable. Cannot copy link.", "error");
            console.warn("Clipboard API not available.");
            return;
        }

        navigator.clipboard.writeText(shareUrl).then(() => {
            updateStatus("Link copied to clipboard!", "success");
            // Optional: visual feedback on the button
             const copyButton = document.getElementById("generate-share-link"); // Use the correct button ID
             if (copyButton) {
                 const originalText = copyButton.textContent;
                 copyButton.disabled = true; // Briefly disable
                 copyButton.textContent = 'Copied!';
                 setTimeout(() => {
                     copyButton.textContent = originalText;
                     copyButton.disabled = false;
                  }, 1500);
             }

        }).catch(err => {
            console.error('Failed to copy link to clipboard: ', err);
            updateStatus("Failed to copy link automatically.", "error");
            // REMOVED: No input field to select as fallback
        });
    }

    function applySettingsFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const url = params.get('url'); const refresh = params.get('refresh'); const duration = params.get('duration');
        let settingsLoaded = false;
        if (url) { matchUrlInput.value = url; settingsLoaded = true; }
        if (refresh && !isNaN(parseInt(refresh, 10))) {
            const refreshVal = parseInt(refresh, 10); refreshRateSlider.value = Math.min(Math.max(refreshVal, refreshRateSlider.min), refreshRateSlider.max);
            refreshValueSpan.textContent = refreshRateSlider.value; settingsLoaded = true;
        }
        if (duration && !isNaN(parseInt(duration, 10))) {
            const durationVal = parseInt(duration, 10); watchDurationSlider.value = Math.min(Math.max(durationVal, watchDurationSlider.min), watchDurationSlider.max);
            watchValueSpan.textContent = watchDurationSlider.value; settingsLoaded = true;
        }
        if (settingsLoaded) { updateStatus("Settings loaded from URL.", "info"); }
    }


    // --- Event Listeners remain the same ---
    refreshRateSlider.addEventListener("input", (e) => { refreshValueSpan.textContent = e.target.value; });
    watchDurationSlider.addEventListener("input", (e) => { watchValueSpan.textContent = e.target.value; });
    startStopButton.addEventListener("click", () => { if (isMonitoringActive) { stopMonitoring(); } else { startMonitoring(); } });
    
    generateLinkButton.addEventListener("click", generateShareLink);


    // --- Initialization remains the same ---
    if (typeof CONFIG === 'undefined' || typeof CONFIG.SUPABASE_URL !== 'string' || typeof CONFIG.SUPABASE_ANON_KEY !== 'string' || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
        console.error("FATAL ERROR: Configuration file (config.js) not loaded correctly or variables missing/invalid!");
        updateStatus("Configuration Error - App cannot run.", "error");
        if (startStopButton) startStopButton.disabled = true; if (generateLinkButton) generateLinkButton.disabled = true;
        disableSettings(true); return;
    }
    applySettingsFromUrl();
    updateButtonStates();
    disableSettings(false);
    updateStatus("Ready. Enter URL and settings.");

}); // End DOMContentLoaded