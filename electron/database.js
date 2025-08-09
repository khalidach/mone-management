const sqlite3 = require("sqlite3").verbose();
const path = require("path");
// In a real Electron app, it's better to use app.getPath('userData')
const { app } = require("electron");
const dbPath = path.join(app.getPath("userData"), "money.db");

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error("Error opening database", err.message);
      else console.log("Database connected successfully to", dbPath);
    });
    this.init();
  }

  init() {
    this.db.serialize(() => {
      this.db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                source TEXT,
                description TEXT,
                date TEXT NOT NULL,
                month TEXT NOT NULL
            )
        `);

      this.db.run(`
            CREATE TABLE IF NOT EXISTS custom_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                category_name TEXT NOT NULL,
                UNIQUE(type, category_name)
            )
        `);

      const defaultCategories = {
        income: ["راتب", "عمل إضافي", "استثمار", "هدايا", "بيع", "أخرى"],
        expense: [
          "إيجار",
          "طعام",
          "مواصلات",
          "فواتير",
          "تسوق",
          "ترفيه",
          "تعليم",
          "صحة",
          "أخرى",
        ],
      };

      const stmt = this.db.prepare(
        "INSERT OR IGNORE INTO custom_categories (type, category_name) VALUES (?, ?)"
      );
      for (const [type, cats] of Object.entries(defaultCategories)) {
        cats.forEach((category) => {
          stmt.run(type, category);
        });
      }
      stmt.finalize();
    });
  }

  // --- NEW CATEGORY MANAGEMENT METHODS ---

  addCategory({ type, name }) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO custom_categories (type, category_name) VALUES (?, ?)`;
      this.db.run(sql, [type, name], function (err) {
        if (err) {
          // Handle unique constraint error
          if (err.code === "SQLITE_CONSTRAINT") {
            return reject(new Error("هذا التصنيف موجود بالفعل."));
          }
          return reject(err);
        }
        resolve({ id: this.lastID, type, name });
      });
    });
  }

  getAllCustomCategories() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM custom_categories ORDER BY type, category_name",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  deleteCategory(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM custom_categories WHERE id = ?",
        [id],
        function (err) {
          if (err) reject(err);
          // Check if any row was actually deleted
          else if (this.changes === 0) reject(new Error("Category not found."));
          else resolve({ success: true, changes: this.changes });
        }
      );
    });
  }

  // --- Existing Methods ---

  getTransactions() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM transactions ORDER BY date DESC",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  addTransaction(transaction) {
    return new Promise((resolve, reject) => {
      const { type, amount, category, source, description, date } = transaction;
      const month = date.substring(0, 7);
      this.db.run(
        "INSERT INTO transactions (type, amount, category, source, description, date, month) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [type, amount, category, source, description, date, month],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  getSummary() {
    return new Promise((resolve, reject) => {
      const currentMonth = new Date().toISOString().substring(0, 7);
      this.db.get(
        `
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance
        FROM transactions 
        WHERE month = ?`,
        [currentMonth],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  getCategories(type) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT category_name FROM custom_categories WHERE type = ? ORDER BY category_name",
        [type],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map((row) => row.category_name));
        }
      );
    });
  }

  updateTransaction(id, transaction) {
    return new Promise((resolve, reject) => {
      const { type, amount, category, source, description, date } = transaction;
      const month = date.substring(0, 7);
      this.db.run(
        `UPDATE transactions SET type = ?, amount = ?, category = ?, source = ?, description = ?, date = ?, month = ? WHERE id = ?`,
        [type, amount, category, source, description, date, month, id],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  deleteTransaction(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM transactions WHERE id = ?",
        [id],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  getTransaction(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM transactions WHERE id = ?",
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  exportData() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM transactions ORDER BY date DESC",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getMonthlyReport(year, month) {
    const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
    return new Promise((resolve, reject) => {
      this.db.get(
        `
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense
        FROM transactions WHERE month = ?`,
        [monthStr],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || { totalIncome: 0, totalExpense: 0 });
        }
      );
    });
  }

  getYearlyReport(year) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT month, SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome, SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense
        FROM transactions WHERE strftime('%Y', date) = ? GROUP BY month ORDER BY month ASC`,
        [year.toString()],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = Database;
