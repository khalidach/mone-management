const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const Database = require("./database");

let mainWindow;
const db = new Database();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: "hiddenInset",
    icon: path.join(__dirname, "../assets/icon.png"),
  });

  mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC handlers

// أضف هذا السطر مع الـ IPC handlers الأخرى
ipcMain.handle("get-categories", async (event, type) => {
  return await db.getCategories(type);
});
ipcMain.handle("get-transactions", async () => {
  return await db.getTransactions();
});

ipcMain.handle("add-transaction", async (event, transaction) => {
  return await db.addTransaction(transaction);
});

ipcMain.handle("get-summary", async () => {
  return await db.getSummary();
});

ipcMain.handle("get-sources", async () => {
  return await db.getSources();
});

ipcMain.handle("get-expense-categories", async () => {
  return await db.getExpenseCategories();
});

ipcMain.handle("export-data", async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `MoneyManager_${new Date().toISOString().split("T")[0]}.json`,
    filters: [{ name: "JSON Files", extensions: ["json"] }],
  });

  if (!result.canceled) {
    const data = await db.exportData();
    require("fs").writeFileSync(result.filePath, JSON.stringify(data, null, 2));
  }
});
// أضف هذه الأسطر مع الـ IPC handlers الأخرى
ipcMain.handle("update-transaction", async (event, id, transaction) => {
  return await db.updateTransaction(id, transaction);
});

ipcMain.handle("delete-transaction", async (event, id) => {
  return await db.deleteTransaction(id);
});

ipcMain.handle("get-transaction", async (event, id) => {
  return await db.getTransaction(id);
});
