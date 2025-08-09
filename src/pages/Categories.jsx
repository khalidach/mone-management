import React, { useState, useEffect, useMemo } from "react";

function Categories() {
  const [allCategories, setAllCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ type: "expense", name: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const categories = await window.electronAPI.getAllCustomCategories();
      setAllCategories(categories);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError("فشل في تحميل التصنيفات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCategory((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      setError("اسم التصنيف لا يمكن أن يكون فارغاً.");
      return;
    }
    try {
      await window.electronAPI.addCategory(newCategory);
      setNewCategory({ type: "expense", name: "" }); // Reset form
      setError("");
      fetchCategories(); // Refresh the list
    } catch (err) {
      console.error("Failed to add category:", err);
      setError(err.message || "فشل في إضافة التصنيف.");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذا التصنيف؟")) {
      try {
        await window.electronAPI.deleteCategory(id);
        fetchCategories(); // Refresh the list
      } catch (err) {
        console.error("Failed to delete category:", err);
        alert("فشل في حذف التصنيف.");
      }
    }
  };

  const { incomeCategories, expenseCategories } = useMemo(() => {
    return {
      incomeCategories: allCategories.filter((c) => c.type === "income"),
      expenseCategories: allCategories.filter((c) => c.type === "expense"),
    };
  }, [allCategories]);

  return (
    <div className="categories-page">
      <div className="card">
        <h2>إضافة تصنيف جديد</h2>
        <form onSubmit={handleAddCategory} className="add-category-form">
          <div className="form-row">
            <label htmlFor="name">اسم التصنيف:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={newCategory.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="type">نوع التصنيف:</label>
            <select
              id="type"
              name="type"
              value={newCategory.type}
              onChange={handleInputChange}
            >
              <option value="expense">مصروف</option>
              <option value="income">دخل</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">
            إضافة
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
      </div>

      <div className="categories-list-container">
        <div className="card">
          <h3>تصنيفات المصروفات</h3>
          {loading ? (
            <p>جاري التحميل...</p>
          ) : (
            <ul className="category-list">
              {expenseCategories.map((cat) => (
                <li key={cat.id}>
                  <span>{cat.category_name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="btn-delete-small"
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3>تصنيفات الدخل</h3>
          {loading ? (
            <p>جاري التحميل...</p>
          ) : (
            <ul className="category-list">
              {incomeCategories.map((cat) => (
                <li key={cat.id}>
                  <span>{cat.category_name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="btn-delete-small"
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default Categories;
