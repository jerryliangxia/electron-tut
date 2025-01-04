const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  // we can also expose variables, not just functions
});

contextBridge.exposeInMainWorld("electronAPI", {
  setTitle: (title) => ipcRenderer.send("set-title", title),
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  onUpdateCounter: (callback) =>
    ipcRenderer.on("update-counter", (_event, value) => callback(value)),
  // expose/define function
  counterValue: (value) => ipcRenderer.send("counter-value", value),
});

// // Alternative for calling ipcRenderer from within the preload script
// // Isn't ideal since it can't interact with renderer code
// window.addEventListener("DOMContentLoaded", () => {
//   const counter = document.getElementById("counter");
//   ipcRenderer.on("update-counter", (_event, value) => {
//     const oldValue = Number(counter.innerText);
//     const newValue = oldValue + value;
//     counter.innerText = newValue;
//   });
// });
