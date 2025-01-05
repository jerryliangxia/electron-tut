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
