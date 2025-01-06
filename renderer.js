const updateOnlineStatus = () => {
  document.getElementById("status").innerHTML = navigator.onLine
    ? "online"
    : "offline";
};

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

updateOnlineStatus();

// const NOTIFICATION_TITLE = "Title";
// const NOTIFICATION_BODY =
//   "Notification from the Renderer process. Click to log to console.";
// const CLICK_MESSAGE = "Notification clicked";

// console.log("Hello");

// new window.Notification(NOTIFICATION_TITLE, {
//   body: NOTIFICATION_BODY,
// }).onclick = () => {
//   document.getElementById("output").innerText = CLICK_MESSAGE;
// };

const notifyButton = document.getElementById("notifyButton");
const outputElement = document.getElementById("output");

notifyButton.addEventListener("click", () => {
  window.electronAPI.showNotification();
});

// Listen for notification click event
window.electronAPI.on("notification-clicked", () => {
  outputElement.innerText = "Notification was clicked!";
});

// Add this function to update stats
async function updateUserStats() {
  const stats = await window.electronAPI.getUserStats();
  if (!stats) return;

  const statsElement = document.getElementById("stats");
  if (!statsElement) {
    console.log("Stats element not found, retrying...");
    // If element doesn't exist yet, try again in 100ms
    setTimeout(updateUserStats, 100);
    return;
  }

  const statsHtml = `
    <div>
      <h2>User Statistics</h2>
      <p>Username: ${stats.username}</p>
      <p>Status: ${stats.is_online ? "Online" : "Offline"}</p>
      <p>Today's Score: ${stats.daily_score}</p>
      
      <h3>Scores</h3>
      <p>Today: ${stats.scores.today}</p>
      <p>Week: ${stats.scores.week}</p>
      <p>Month: ${stats.scores.month}</p>
      <p>Year: ${stats.scores.year}</p>
      
      <h3>Hours</h3>
      <p>Today: ${stats.hours.today}</p>
      <p>Week: ${stats.hours.week}</p>
      <p>Month: ${stats.hours.month}</p>
      <p>Year: ${stats.hours.year}</p>
    </div>
  `;

  statsElement.innerHTML = statsHtml;
}

// Call updateUserStats initially and set up periodic updates
updateUserStats();
setInterval(updateUserStats, 60000); // Update every minute
