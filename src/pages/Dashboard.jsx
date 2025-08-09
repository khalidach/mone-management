import React, { useState, useEffect, useCallback } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const initialFormState = {
  type: "expense",
  amount: "",
  category: "",
  source: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
};

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    balance: 0,
  });
  const [expenseCategoriesChartData, setExpenseCategoriesChartData] = useState({
    labels: [],
    data: [],
  });

  const [form, setForm] = useState(initialFormState);
  const [categories, setCategories] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editCategories, setEditCategories] = useState([]);

  const loadAllData = useCallback(async () => {
    try {
      const [summaryData, transactionsData, expenseCatData] = await Promise.all(
        [
          window.electronAPI.getSummary(),
          window.electronAPI.getTransactions(),
          window.electronAPI.getExpenseCategories(),
        ]
      );

      setSummary(summaryData);
      setTransactions(transactionsData);
      setExpenseCategoriesChartData({
        labels: expenseCatData.map((item) => item.category),
        data: expenseCatData.map((item) => item.total),
      });
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }, []);

  const loadCategories = useCallback(async (type) => {
    try {
      return await window.electronAPI.getCategories(type);
    } catch (error) {
      console.error(`Failed to load categories for type ${type}:`, error);
      return [];
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    loadCategories(form.type).then(setCategories);
  }, [form.type, loadCategories]);

  useEffect(() => {
    if (editForm) {
      loadCategories(editForm.type).then(setEditCategories);
    }
  }, [editForm?.type, loadCategories]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => {
      const newForm = { ...prevForm, [name]: value };
      if (name === "type") newForm.category = "";
      return newForm;
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) return alert("الرجاء اختيار تصنيف.");
    try {
      await window.electronAPI.addTransaction(form);
      setForm(initialFormState);
      loadAllData();
    } catch (error) {
      console.error("Failed to add transaction:", error);
    }
  };

  const handleEditClick = async (id) => {
    try {
      const tx = await window.electronAPI.getTransaction(id);
      if (tx) {
        setEditForm({ ...tx, date: tx.date.split("T")[0] });
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch transaction for editing:", error);
    }
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذه المعاملة؟")) {
      try {
        await window.electronAPI.deleteTransaction(id);
        loadAllData();
      } catch (error) {
        console.error("Failed to delete transaction:", error);
      }
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => {
      const newForm = { ...prev, [name]: value };
      if (name === "type") newForm.category = "";
      return newForm;
    });
  };

  const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await window.electronAPI.updateTransaction(editForm.id, editForm);
      setIsModalOpen(false);
      setEditForm(null);
      loadAllData();
    } catch (error) {
      console.error("Failed to update transaction:", error);
    }
  };

  const handleExport = async () => {
    try {
      const result = await window.electronAPI.exportData();
      if (result.success) {
        alert(`تم تصدير البيانات بنجاح إلى: ${result.path}`);
      } else if (result.error !== "Export canceled") {
        alert(`خطأ في تصدير البيانات: ${result.error}`);
      }
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const chartData = {
    labels: expenseCategoriesChartData.labels,
    datasets: [
      {
        data: expenseCategoriesChartData.data,
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { font: { family: "Tajawal" } } },
      title: {
        display: true,
        text: "توزيع مصاريف الشهر الحالي",
        font: { family: "Tajawal", size: 16 },
      },
    },
  };

  return (
    <>
      <div className="dashboard-header">
        <h3>ملخص الشهر الحالي</h3>
        <button className="btn-export" onClick={handleExport}>
          تصدير كل البيانات
        </button>
      </div>
      <div className="summary-cards">
        <div className="card income">
          <h3>إجمالي الدخل</h3>
          <p>{summary.total_income || 0} ريال</p>
        </div>
        <div className="card expense">
          <h3>إجمالي المصاريف</h3>
          <p>{summary.total_expense || 0} ريال</p>
        </div>
        <div className="card balance">
          <h3>الرصيد</h3>
          <p>{summary.balance || 0} ريال</p>
        </div>
      </div>

      <div className="main-content">
        <div className="form-section">
          <h2>إضافة معاملة جديدة</h2>
          <form onSubmit={handleFormSubmit}>
            <div className="form-row">
              <label>نوع المعاملة:</label>
              <select
                name="type"
                value={form.type}
                onChange={handleFormChange}
                required
              >
                <option value="income">دخل</option>
                <option value="expense">مصروف</option>
              </select>
            </div>
            <div className="form-row">
              <label>المبلغ:</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleFormChange}
                step="0.01"
                required
                placeholder="0.00"
              />
            </div>
            <div className="form-row">
              <label>التصنيف:</label>
              <select
                name="category"
                value={form.category}
                onChange={handleFormChange}
                required
              >
                <option value="">اختر التصنيف</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            {form.type === "income" && (
              <div className="form-row">
                <label>المصدر:</label>
                <input
                  type="text"
                  name="source"
                  value={form.source}
                  onChange={handleFormChange}
                  placeholder="مثال: راتب..."
                />
              </div>
            )}
            <div className="form-row">
              <label>الوصف (اختياري):</label>
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={handleFormChange}
                placeholder="تفاصيل المعاملة"
              />
            </div>
            <div className="form-row">
              <label>التاريخ:</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleFormChange}
                required
              />
            </div>
            <button type="submit" className="btn-primary">
              إضافة المعاملة
            </button>
          </form>
        </div>
        <div className="charts-section">
          <Doughnut data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="transactions-section">
        <h2>آخر المعاملات</h2>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>النوع</th>
              <th>المبلغ</th>
              <th>التصنيف</th>
              <th>المصدر</th>
              <th>الوصف</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{new Date(tx.date).toLocaleDateString("ar-SA")}</td>
                <td>{tx.type === "income" ? "دخل" : "مصروف"}</td>
                <td
                  style={{
                    color: tx.type === "income" ? "#27ae60" : "#e74c3c",
                  }}
                >
                  {tx.amount} ريال
                </td>
                <td>{tx.category}</td>
                <td>{tx.source || "-"}</td>
                <td>{tx.description || "-"}</td>
                <td className="action-buttons">
                  <button
                    className="btn-edit"
                    onClick={() => handleEditClick(tx.id)}
                  >
                    تعديل
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteClick(tx.id)}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && editForm && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setIsModalOpen(false)}>
              &times;
            </span>
            <h2>تعديل المعاملة</h2>
            <form onSubmit={handleEditFormSubmit}>
              <div className="form-row">
                <label>النوع:</label>
                <select
                  name="type"
                  value={editForm.type}
                  onChange={handleEditFormChange}
                  required
                >
                  <option value="income">دخل</option>
                  <option value="expense">مصروف</option>
                </select>
              </div>
              <div className="form-row">
                <label>المبلغ:</label>
                <input
                  type="number"
                  name="amount"
                  value={editForm.amount}
                  onChange={handleEditFormChange}
                  step="0.01"
                  required
                />
              </div>
              <div className="form-row">
                <label>التصنيف:</label>
                <select
                  name="category"
                  value={editForm.category}
                  onChange={handleEditFormChange}
                  required
                >
                  <option value="">اختر</option>
                  {editCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              {editForm.type === "income" && (
                <div className="form-row">
                  <label>المصدر:</label>
                  <input
                    type="text"
                    name="source"
                    value={editForm.source}
                    onChange={handleEditFormChange}
                  />
                </div>
              )}
              <div className="form-row">
                <label>الوصف:</label>
                <input
                  type="text"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditFormChange}
                />
              </div>
              <div className="form-row">
                <label>التاريخ:</label>
                <input
                  type="date"
                  name="date"
                  value={editForm.date}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              <button type="submit" className="btn-primary">
                حفظ التغييرات
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Dashboard;
