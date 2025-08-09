const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const Database = require("./database");
const fs = require("fs");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow;
const db = new Database();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Vite dev server URL
  const VITE_DEV_SERVER_URL = "http://localhost:5173";

  if (!app.isPackaged) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
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

// --- IPC Handlers ---

ipcMain.handle("get-categories", (event, type) => db.getCategories(type));
ipcMain.handle("get-transactions", () => db.getTransactions());
ipcMain.handle("add-transaction", (event, transaction) =>
  db.addTransaction(transaction)
);
ipcMain.handle("get-summary", () => db.getSummary());
ipcMain.handle("get-sources", () => db.getSources());
ipcMain.handle("get-expense-categories", () => db.getExpenseCategories());
ipcMain.handle("update-transaction", (event, id, transaction) =>
  db.updateTransaction(id, transaction)
);
ipcMain.handle("delete-transaction", (event, id) => db.deleteTransaction(id));
ipcMain.handle("get-transaction", (event, id) => db.getTransaction(id));

ipcMain.handle("export-data", async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `MoneyManager_Export_${
      new Date().toISOString().split("T")[0]
    }.json`,
    filters: [{ name: "JSON Files", extensions: ["json"] }],
  });

  if (!result.canceled && result.filePath) {
    try {
      const data = await db.exportData();
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
      return { success: true, path: result.filePath };
    } catch (error) {
      console.error("Failed to export data:", error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Export canceled" };
});

// --- NEW REPORT HANDLERS ---
ipcMain.handle("get-monthly-report", (event, year, month) =>
  db.getMonthlyReport(year, month)
);
ipcMain.handle("get-yearly-report", (event, year) => db.getYearlyReport(year));
