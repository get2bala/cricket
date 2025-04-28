// config.js

// WARNING: These values are still accessible in the browser's developer tools.
// This organizes the code but does NOT provide true security for the API key.

const CONFIG = {
    SUPABASE_URL: 'https://azfipkxegjydpalygjxx.supabase.co/functions/v1/get-cricket-score',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6Zmlwa3hlZ2p5ZHBhbHlnanh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNTQ4OTgsImV4cCI6MjA2MDczMDg5OH0.u_itSrBff5Y5jtT8ozPWGmsLF9Zq3aCXBtwiMPVIOvQ'
    // Add any other configuration values here if needed
};

// Make CONFIG globally accessible (freeze to prevent accidental changes)
Object.freeze(CONFIG);