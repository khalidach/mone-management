const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getTransactions: () => ipcRenderer.invoke("get-transactions"),
  addTransaction: (transaction) =>
    ipcRenderer.invoke("add-transaction", transaction),
  getSummary: () => ipcRenderer.invoke("get-summary"),
  getSources: () => ipcRenderer.invoke("get-sources"),
  getExpenseCategories: () => ipcRenderer.invoke("get-expense-categories"),
  exportData: () => ipcRenderer.invoke("export-data"),
  // أضف هذا السطر في exposeInMainWorld
  getCategories: (type) => ipcRenderer.invoke("get-categories", type),
  // أضف هذه الأسطر في exposeInMainWorld
  updateTransaction: (id, transaction) =>
    ipcRenderer.invoke("update-transaction", id, transaction),
  deleteTransaction: (id) => ipcRenderer.invoke("delete-transaction", id),
  getTransaction: (id) => ipcRenderer.invoke("get-transaction", id),
});
