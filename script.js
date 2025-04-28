// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const matchUrlInput = document.getElementById("match-url");
    const refreshRateSlider = document.getElementById("refresh-rate");
    const watchDurationSlider = document.getElementById("watch-duration");
    const refreshValueSpan = document.getElementById("refresh-value");
    const watchValueSpan = document.getElementById("watch-value");
    const startStopButton = document.getElementById("start-stop-button");
    const pauseResumeButton = document.getElementById("pause-resume-button");
    const matchScoreDisplay = document.getElementById("match-score");
    const statusMessage = document.getElementById("status-message");
    const generateLinkButton = document.getElementById("generate-share-link");
    const shareLinkOutput = document.getElementById("share-link-output");
    // Get fieldsets to disable/enable them easily
    const settingsFieldset = document.querySelector('fieldset:nth-of-type(2)'); // Contains sliders
    const matchDetailsFieldset = document.querySelector('fieldset:nth-of-type(1)'); // Contains URL input

    // --- State Variables ---
    let isMonitoringActive = false;
    let isPaused = false;
    let fetchIntervalId = null;
    let stopTimeoutId = null;
    let currentMatchUrl = ''; // Store the URL being monitored

    // --- Core Functions ---

    /**
     * Fetches the score from the backend and updates the display/speech.
     */
    async function fetchAndAnnounceScore() {
        if (isPaused || !isMonitoringActive) {
            // console.log("Skipping fetch: Paused or Inactive.");
            return;
        }

        updateStatus("Fetching score...", "info");

        try {
            // Ensure CONFIG is available before trying to use it
            if (typeof CONFIG === 'undefined' || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
                 throw new Error("Configuration is missing. Cannot fetch score.");
            }

            const encodedUrl = encodeURIComponent(currentMatchUrl); // Use stored URL
            const response = await fetch(`${CONFIG.SUPABASE_URL}?url=${encodedUrl}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json' // Optional
                }
            });

            if (!response.ok) {
                let errorMsg = `Failed to fetch score (Status: ${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorData.message || errorMsg;
                } catch (e) {
                    console.warn("Could not parse error response body.");
                }
                 throw new Error(errorMsg);
            }

            const matchScore = await response.text();

            if (isPaused || !isMonitoringActive) return; // Check state again after await

            matchScoreDisplay.innerText = matchScore || "Score data unavailable.";
            updateStatus("Score updated.", "success");
            speakScore(matchScore);

        } catch (error) {
            console.error("Error fetching score:", error);
            matchScoreDisplay.innerText = "Error fetching score.";
            updateStatus(`Error: ${error.message}`, "error");
            // Consider stopping monitoring on fetch errors if desired
            // stopMonitoring(`Error fetching score: ${error.message}`);
        }
    }

    /**
     * Uses the SpeechSynthesis API to announce the score.
     * @param {string} score The score text to speak.
     */
    function speakScore(score) {
        if (!score || typeof window.speechSynthesis === 'undefined') {
            console.warn("Speech synthesis not available or score is empty.");
            return;
        }
        try {
            window.speechSynthesis.cancel(); // Stop previous speech
            const utterance = new SpeechSynthesisUtterance(score);
            utterance.lang = 'en-US';
            utterance.pitch = 1;
            utterance.rate = 1;
            utterance.volume = 1;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("Speech synthesis error:", error);
            updateStatus("Speech synthesis failed.", "error");
        }
    }

    /**
     * Starts the monitoring process.
     */
    function startMonitoring() {
        currentMatchUrl = matchUrlInput.value.trim();
        const refreshRate = parseInt(refreshRateSlider.value, 10) * 1000;
        const watchDuration = parseInt(watchDurationSlider.value, 10) * 60 * 1000;

        if (!currentMatchUrl) {
            updateStatus("Please enter a CricClubs match URL.", "error");
            // alert("Please enter a CricClubs match URL."); // Alert can be annoying
            return;
        }
        try {
             new URL(currentMatchUrl); // Basic URL validation
        } catch (_) {
             updateStatus("Invalid URL format.", "error");
             return;
        }

        isMonitoringActive = true;
        isPaused = false;
        updateButtonStates();
        disableSettings(true);
        updateStatus("Monitoring started...", "info");
        matchScoreDisplay.innerText = "Fetching initial score...";

        fetchAndAnnounceScore(); // Fetch immediately

        clearInterval(fetchIntervalId); // Clear any previous interval
        fetchIntervalId = setInterval(fetchAndAnnounceScore, refreshRate);

        clearTimeout(stopTimeoutId); // Clear any previous timeout
        if (watchDuration > 0) {
            stopTimeoutId = setTimeout(() => {
                if (isMonitoringActive) {
                   stopMonitoring("Monitoring duration ended.");
                   // alert("Finished monitoring the match for the set duration."); // Alert can be annoying
                }
            }, watchDuration);
        }
    }

    /**
     * Stops the monitoring process completely.
     * @param {string} reason Message to display in status.
     */
    function stopMonitoring(reason = "Monitoring stopped.") {
        clearInterval(fetchIntervalId);
        clearTimeout(stopTimeoutId);
        fetchIntervalId = null;
        stopTimeoutId = null;
        isMonitoringActive = false;
        isPaused = false;
        if (typeof window.speechSynthesis !== 'undefined') {
            window.speechSynthesis.cancel(); // Stop speech
        }
        updateButtonStates();
        disableSettings(false);
        updateStatus(reason, "info");
    }

    /**
     * Pauses the score fetching and announcement.
     */
    function pauseMonitoring() {
        if (!isMonitoringActive || isPaused) return;
        isPaused = true;
        // Fetching stops within fetchAndAnnounceScore based on isPaused flag
        if (typeof window.speechSynthesis !== 'undefined') {
             window.speechSynthesis.cancel(); // Stop current speech
        }
        updateButtonStates();
        updateStatus("Monitoring paused.", "info");
    }

    /**
     * Resumes the score fetching and announcement.
     */
    function resumeMonitoring() {
        if (!isMonitoringActive || !isPaused) return;
        isPaused = false;
        updateButtonStates();
        updateStatus("Monitoring resumed.", "info");
        // Fetch immediately on resume for quicker update
        fetchAndAnnounceScore();
    }


    // --- UI Update Functions ---

    /**
     * Updates the text and disabled state of control buttons.
     */
    function updateButtonStates() {
        if (isMonitoringActive) {
            startStopButton.textContent = "Stop Monitoring";
            pauseResumeButton.disabled = false;
            pauseResumeButton.textContent = isPaused ? "Resume" : "Pause";
        } else {
            startStopButton.textContent = "Start Monitoring";
            pauseResumeButton.disabled = true;
            pauseResumeButton.textContent = "Pause";
        }
    }

    /**
     * Enables or disables the settings input fields (using fieldsets).
     * @param {boolean} disable True to disable, false to enable.
     */
    function disableSettings(disable) {
         // Disable fieldsets which contain the inputs/sliders
         if(settingsFieldset) settingsFieldset.disabled = disable;
         if(matchDetailsFieldset) matchDetailsFieldset.disabled = disable;
    }

    /**
     * Updates the status message area.
     * @param {string} message The text to display.
     * @param {'info' | 'success' | 'error'} type The type of message for styling.
     */
    function updateStatus(message, type = "info") {
        statusMessage.textContent = message;
        statusMessage.className = ''; // Clear previous classes
        if (type === 'error' || type === 'success') {
            statusMessage.classList.add(type);
        } else if (type === 'info') {
             statusMessage.classList.add(type); // Add info class if you have styles for it
        }
    }

    // --- Shareable Link Functions ---

    /**
     * Generates a shareable link based on current settings.
     */
    function generateShareLink() {
        const url = matchUrlInput.value.trim();
        const refresh = refreshRateSlider.value;
        const duration = watchDurationSlider.value;

        const params = new URLSearchParams();
        // Only add url param if it's not empty
        if (url) {
             params.set('url', url); // URLSearchParams handles encoding
        }
        params.set('refresh', refresh);
        params.set('duration', duration);

        // Construct URL relative to current page
        const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

        shareLinkOutput.value = shareUrl;
        shareLinkOutput.select(); // Select text for easy copying
        updateStatus("Shareable link generated and copied to input!", "success");
        // Optional: try to copy to clipboard (might require user interaction/permission)
        /*
        try {
            navigator.clipboard.writeText(shareUrl)
                .then(() => updateStatus("Shareable link generated and copied to clipboard!", "success"))
                .catch(err => console.warn("Could not copy to clipboard:", err));
        } catch (err) {
            console.warn("Clipboard API not available or failed:", err);
        }
        */
    }

    /**
     * Reads URL parameters on page load and applies them to the settings.
     */
    function applySettingsFromUrl() { // <<<< DEFINITION IS HERE
        const params = new URLSearchParams(window.location.search);

        const url = params.get('url');
        const refresh = params.get('refresh');
        const duration = params.get('duration');
        let settingsLoaded = false;

        if (url) {
            matchUrlInput.value = url;
            settingsLoaded = true;
        }
        if (refresh && !isNaN(parseInt(refresh, 10))) {
            const refreshVal = parseInt(refresh, 10);
            // Clamp value between slider's min and max
            refreshRateSlider.value = Math.min(Math.max(refreshVal, refreshRateSlider.min), refreshRateSlider.max);
            refreshValueSpan.textContent = refreshRateSlider.value; // Update display span
            settingsLoaded = true;
        }
        if (duration && !isNaN(parseInt(duration, 10))) {
             const durationVal = parseInt(duration, 10);
             // Clamp value between slider's min and max
            watchDurationSlider.value = Math.min(Math.max(durationVal, watchDurationSlider.min), watchDurationSlider.max);
            watchValueSpan.textContent = watchDurationSlider.value; // Update display span
            settingsLoaded = true;
        }
        // Update status only if some settings were actually loaded from URL
        if (settingsLoaded) {
             updateStatus("Settings loaded from URL.", "info");
        }
    }


    // --- Event Listeners ---

    // Slider value updates
    refreshRateSlider.addEventListener("input", (e) => {
        refreshValueSpan.textContent = e.target.value;
    });

    watchDurationSlider.addEventListener("input", (e) => {
        watchValueSpan.textContent = e.target.value;
    });

    // Control buttons
    startStopButton.addEventListener("click", () => {
        if (isMonitoringActive) {
            stopMonitoring();
        } else {
            startMonitoring();
        }
    });

    pauseResumeButton.addEventListener("click", () => {
        if (!isMonitoringActive) return; // Should be disabled, but double-check
        if (isPaused) {
            resumeMonitoring();
        } else {
            pauseMonitoring();
        }
    });

    // Share link button
    generateLinkButton.addEventListener("click", generateShareLink);


    // --- Initialization ---

    // IMPORTANT: Check if CONFIG object from config.js is loaded
    if (typeof CONFIG === 'undefined' || typeof CONFIG.SUPABASE_URL !== 'string' || typeof CONFIG.SUPABASE_ANON_KEY !== 'string' || !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY ) {
        console.error("FATAL ERROR: Configuration file (config.js) not loaded correctly or variables missing/invalid!");
        updateStatus("Configuration Error - App cannot run.", "error");
        // Disable critical parts of the UI
        if(startStopButton) startStopButton.disabled = true;
        if(generateLinkButton) generateLinkButton.disabled = true;
        disableSettings(true); // Disable all settings fields
        return; // Stop further initialization
    }

    applySettingsFromUrl(); // <<<< FUNCTION IS CALLED HERE (after definition)

    updateButtonStates(); // Set initial button states
    disableSettings(false); // Ensure settings are enabled initially
    updateStatus("Ready. Enter URL and settings."); // Initial status

}); // End DOMContentLoaded