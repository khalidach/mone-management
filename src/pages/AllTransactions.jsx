import React, { useState, useEffect, useCallback } from "react";

function AllTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for the edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editCategories, setEditCategories] = useState([]);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const transactionsData = await window.electronAPI.getTransactions();
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      alert("خطأ في تحميل المعاملات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Load categories for the edit form when the type changes
  const loadEditCategories = useCallback(async (type) => {
    try {
      return await window.electronAPI.getCategories(type);
    } catch (error) {
      console.error(`Failed to load categories for type ${type}:`, error);
      return [];
    }
  }, []);

  useEffect(() => {
    if (editForm?.type) {
      loadEditCategories(editForm.type).then(setEditCategories);
    }
  }, [editForm?.type, loadEditCategories]);

  // --- Edit/Delete Handlers (copied from Dashboard) ---

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
        loadTransactions(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete transaction:", error);
        alert("خطأ في حذف المعاملة");
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
    if (!editForm.category) return alert("الرجاء اختيار تصنيف.");
    try {
      await window.electronAPI.updateTransaction(editForm.id, editForm);
      setIsModalOpen(false);
      setEditForm(null);
      loadTransactions(); // Refresh the list
    } catch (error) {
      console.error("Failed to update transaction:", error);
      alert("خطأ في تحديث المعاملة");
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p>جاري تحميل المعاملات...</p>
      </div>
    );
  }

  return (
    <>
      <div className="transactions-section full-page-table">
        <h2>كل المعاملات</h2>
        {transactions.length > 0 ? (
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
                      fontWeight: "bold",
                    }}
                  >
                    {tx.amount.toFixed(2)} ريال
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
        ) : (
          <p style={{ textAlign: "center", padding: "20px" }}>
            لم يتم العثور على أي معاملات.
          </p>
        )}
      </div>

      {/* Edit Modal */}
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
                    value={editForm.source || ""}
                    onChange={handleEditFormChange}
                  />
                </div>
              )}
              <div className="form-row">
                <label>الوصف:</label>
                <input
                  type="text"
                  name="description"
                  value={editForm.description || ""}
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

export default AllTransactions;
