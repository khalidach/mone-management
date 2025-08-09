const sqlite3 = require("sqlite3").verbose();
const path = require("path");
// Note: In a real Electron app, it's better to use app.getPath('userData')
// to avoid permission issues, but for simplicity we'll keep it this way.
const dbPath = path.join(__dirname, "money.db");

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Error opening database", err.message);
      } else {
        console.log("Database connected successfully to", dbPath);
      }
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
                category_name TEXT NOT NULL UNIQUE
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

  // All other database methods remain the same...
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

      this.db.all(
        `
                SELECT 
                    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
                    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance
                FROM transactions 
                WHERE month = ?
            `,
        [currentMonth],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows[0]);
        }
      );
    });
  }

  getSources() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
                SELECT DISTINCT source, SUM(amount) as total
                FROM transactions 
                WHERE type = 'income' AND source IS NOT NULL AND source != ''
                GROUP BY source
                ORDER BY total DESC
            `,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getExpenseCategories() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
                SELECT category, SUM(amount) as total
                FROM transactions 
                WHERE type = 'expense'
                GROUP BY category
                ORDER BY total DESC
            `,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
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
        `UPDATE transactions 
             SET type = ?, amount = ?, category = ?, source = ?, description = ?, date = ?, month = ?
             WHERE id = ?`,
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

  // --- NEW METHODS FOR REPORTS ---

  getMonthlyReport(year, month) {
    const monthStr = `${year}-${month.toString().padStart(2, "0")}`;
    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense
        FROM transactions 
        WHERE month = ?
        `,
        [monthStr],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows[0] || { totalIncome: 0, totalExpense: 0 });
        }
      );
    });
  }

  getYearlyReport(year) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT 
          month,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense
        FROM transactions 
        WHERE strftime('%Y', date) = ?
        GROUP BY month
        ORDER BY month ASC
        `,
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
