const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const Database = require("./database");
const fs = require("fs");

if (require("electron-squirrel-startup")) app.quit();

let mainWindow;
const db = new Database();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const VITE_DEV_SERVER_URL = "http://localhost:5173";

  if (!app.isPackaged) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- IPC Handlers ---
ipcMain.handle("get-transactions", () => db.getTransactions());
ipcMain.handle("add-transaction", (e, t) => db.addTransaction(t));
ipcMain.handle("get-summary", () => db.getSummary());
ipcMain.handle("get-categories", (e, t) => db.getCategories(t));
ipcMain.handle("update-transaction", (e, i, t) => db.updateTransaction(i, t));
ipcMain.handle("delete-transaction", (e, i) => db.deleteTransaction(i));
ipcMain.handle("get-transaction", (e, i) => db.getTransaction(i));
ipcMain.handle("export-data", async () => {
  const res = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `MoneyManager_Export_${
      new Date().toISOString().split("T")[0]
    }.json`,
    filters: [{ name: "JSON Files", extensions: ["json"] }],
  });
  if (res.canceled) return { success: false, error: "Export canceled" };
  try {
    const data = await db.exportData();
    fs.writeFileSync(res.filePath, JSON.stringify(data, null, 2));
    return { success: true, path: res.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-monthly-report", (e, y, m) => db.getMonthlyReport(y, m));
ipcMain.handle("get-yearly-report", (e, y) => db.getYearlyReport(y));

// --- NEW CATEGORY MANAGEMENT HANDLERS ---
ipcMain.handle("get-all-custom-categories", () => db.getAllCustomCategories());
ipcMain.handle("add-category", (e, c) => db.addCategory(c));
ipcMain.handle("delete-category", (e, i) => db.deleteCategory(i));
