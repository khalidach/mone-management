const sqlite3 = require("sqlite3").verbose();
const path = require("path");

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, "../data/money.db"));
    this.init();
  }
  // أضف هذه الدالة بعد getExpenseCategories
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

  // استبدل دالة init() الكاملة بهذه:
  init() {
    this.db.serialize(() => {
      // جدول المعاملات فقط - بدون أي بيانات وهمية
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

      // جدول التصنيفات المخصصة
      this.db.run(`
            CREATE TABLE IF NOT EXISTS custom_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                category_name TEXT NOT NULL UNIQUE
            )
        `);

      // إدخال التصنيفات الأساسية فقط إذا لم تكن موجودة
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

      // إدخال التصنيفات الأساسية
      for (const [type, cats] of Object.entries(defaultCategories)) {
        cats.forEach((category) => {
          this.db.run(
            "INSERT OR IGNORE INTO custom_categories (type, category_name) VALUES (?, ?)",
            [type, category]
          );
        });
      }
    });
  }

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
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
                    SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
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
                WHERE type = 'income' AND source != ''
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

  // أضف هذه الدالة بعد getExpenseCategories
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

  // أضف هذه الدوال بعد getCategories

  // تعديل معاملة
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

  // حذف معاملة
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

  // الحصول على معاملة واحدة
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
      this.db.all("SELECT * FROM transactions", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = Database;
