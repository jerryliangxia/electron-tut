const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  showNotification: () => ipcRenderer.invoke("show-notification"),
  getUserStats: () => ipcRenderer.invoke("get-user-stats"),
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
});
