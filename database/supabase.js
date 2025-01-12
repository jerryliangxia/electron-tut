const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://qciyrtfoffuvludubhfw.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjaXlydGZvZmZ1dmx1ZHViaGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwNTE1NzMsImV4cCI6MjA1MTYyNzU3M30.iaL29PnHZEPL2HtA9wrH9R7yF2tri4BerdoAUbOBuFg";
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

module.exports = {
  supabase,
};
