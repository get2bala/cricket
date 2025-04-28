let intervalId;
let stopTimeoutId;

async function fetchAndDisplayScore(url) {
  try {
    const encodedUrl = encodeURIComponent(url);

    const response = await fetch(`https://your-supabase-project-id.functions.supabase.co/fetch-match-score?url=${encodedUrl}`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch match score");
    }

    const matchScore = await response.text();

    document.getElementById("match-score").innerText = matchScore;

    // Speak the score
    speakScore(matchScore);
  } catch (error) {
    console.error("Error fetching score:", error);
    document.getElementById("match-score").innerText = "Error fetching score.";
  }
}

function speakScore(score) {
  const utterance = new SpeechSynthesisUtterance(score);
  utterance.lang = 'en-US';
  utterance.pitch = 1;
  utterance.rate = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function startAnnouncing() {
  clearInterval(intervalId);
  clearTimeout(stopTimeoutId);

  const url = document.getElementById("match-url").value.trim();
  const refreshRate = parseInt(document.getElementById("refresh-rate").value, 10) * 1000;
  const watchDuration = parseInt(document.getElementById("watch-duration").value, 10) * 60 * 1000;

  if (!url) {
    alert("Please enter a CricClubs match URL.");
    return;
  }

  // Fetch immediately
  fetchAndDisplayScore(url);

  // Set interval
  intervalId = setInterval(() => {
    fetchAndDisplayScore(url);
  }, refreshRate);

  // Stop after watchDuration
  stopTimeoutId = setTimeout(() => {
    clearInterval(intervalId);
    alert("Finished watching the match for the set time.");
  }, watchDuration);
}

// Update slider values live
document.getElementById("refresh-rate").addEventListener("input", (e) => {
  document.getElementById("refresh-value").innerText = e.target.value;
});

document.getElementById("watch-duration").addEventListener("input", (e) => {
  document.getElementById("watch-value").innerText = e.target.value;
});

// Start button click
document.getElementById("start-button").addEventListener("click", startAnnouncing);
