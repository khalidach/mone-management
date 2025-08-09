const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getTransactions: () => ipcRenderer.invoke("get-transactions"),
  addTransaction: (t) => ipcRenderer.invoke("add-transaction", t),
  getSummary: () => ipcRenderer.invoke("get-summary"),
  getCategories: (t) => ipcRenderer.invoke("get-categories", t),
  updateTransaction: (i, t) => ipcRenderer.invoke("update-transaction", i, t),
  deleteTransaction: (i) => ipcRenderer.invoke("delete-transaction", i),
  getTransaction: (i) => ipcRenderer.invoke("get-transaction", i),
  exportData: () => ipcRenderer.invoke("export-data"),
  getMonthlyReport: (y, m) => ipcRenderer.invoke("get-monthly-report", y, m),
  getYearlyReport: (y) => ipcRenderer.invoke("get-yearly-report", y),
  // --- NEW CATEGORY MANAGEMENT METHODS ---
  getAllCustomCategories: () => ipcRenderer.invoke("get-all-custom-categories"),
  addCategory: (c) => ipcRenderer.invoke("add-category", c),
  deleteCategory: (i) => ipcRenderer.invoke("delete-category", i),
});
