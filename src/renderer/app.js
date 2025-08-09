// تهيئة التطبيق
let transactions = [];
let chart = null;
// أضف هذه المتغيرات في الأعلى مع المتغيرات الأخرى
let currentEditId = null;

// تعريف التصنيفات
const categories = {
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

// تحميل البيانات عند بدء التشغيل
window.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  setupEventListeners();
  document.getElementById("date").value = new Date()
    .toISOString()
    .split("T")[0];
  // إغلاق النافذة المنبثقة
  document.querySelector(".close").addEventListener("click", () => {
    document.getElementById("edit-modal").style.display = "none";
  });

  window.addEventListener("click", (e) => {
    const modal = document.getElementById("edit-modal");
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  // معالجة إرسال نموذج التعديل
  document.getElementById("edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const transaction = {
      type: document.getElementById("edit-type").value,
      amount: parseFloat(document.getElementById("edit-amount").value),
      category: document.getElementById("edit-category").value,
      source: document.getElementById("edit-source").value,
      description: document.getElementById("edit-description").value,
      date: document.getElementById("edit-date").value,
    };

    try {
      await window.electronAPI.updateTransaction(currentEditId, transaction);
      document.getElementById("edit-modal").style.display = "none";
      await loadData();
    } catch (error) {
      alert("خطأ في تحديث المعاملة");
    }
  });

  // إضافة مستمع لتغيير نوع المعاملة في التعديل
  document
    .getElementById("edit-type")
    .addEventListener("change", handleEditTypeChange);
});

// تحميل البيانات
async function loadData() {
  try {
    const [summary, sources, expenseCategories] = await Promise.all([
      window.electronAPI.getSummary(),
      window.electronAPI.getSources(),
      window.electronAPI.getExpenseCategories(),
    ]);

    updateSummaryCards(summary);
    loadTransactions();
    createExpenseChart(expenseCategories);
  } catch (error) {
    console.error("خطأ في تحميل البيانات:", error);
  }
}

// تحديث بطاقات الملخص
function updateSummaryCards(summary) {
  document.getElementById("total-income").textContent = `${
    summary.total_income || 0
  } ريال`;
  document.getElementById("total-expense").textContent = `${
    summary.total_expense || 0
  } ريال`;
  document.getElementById("balance").textContent = `${
    summary.balance || 0
  } ريال`;
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
  const typeSelect = document.getElementById("transaction-type");
  const categorySelect = document.getElementById("category");

  typeSelect.addEventListener("change", handleTypeChange);

  document
    .getElementById("transaction-form")
    .addEventListener("submit", handleFormSubmit);
}

// معالجة تغيير نوع المعاملة
function handleTypeChange(e) {
  const type = e.target.value;
  const categorySelect = document.getElementById("category");
  const sourceRow = document.getElementById("source-row");
  const categoryLabel = document.getElementById("category-label");

  categorySelect.innerHTML = '<option value="">اختر التصنيف</option>';

  if (type === "income") {
    categories.income.forEach((cat) => {
      categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
    sourceRow.style.display = "block";
    categoryLabel.textContent = "مصدر الدخل:";
  } else if (type === "expense") {
    categories.expense.forEach((cat) => {
      categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
    sourceRow.style.display = "none";
    categoryLabel.textContent = "تصنيف المصروف:";
  }
}

// معالجة إرسال النموذج
async function handleFormSubmit(e) {
  e.preventDefault();

  const transaction = {
    type: document.getElementById("transaction-type").value,
    amount: parseFloat(document.getElementById("amount").value),
    category: document.getElementById("category").value,
    source: document.getElementById("source").value,
    description: document.getElementById("description").value,
    date: document.getElementById("date").value,
  };

  try {
    await window.electronAPI.addTransaction(transaction);
    await loadData();
    e.target.reset();
    document.getElementById("date").value = new Date()
      .toISOString()
      .split("T")[0];
  } catch (error) {
    alert("خطأ في إضافة المعاملة");
  }
}

// تحميل المعاملات
async function loadTransactions() {
  try {
    transactions = await window.electronAPI.getTransactions();
    displayTransactions();
  } catch (error) {
    console.error("خطأ في تحميل المعاملات:", error);
  }
}

// عرض المعاملات
function displayTransactions() {
  const tbody = document.getElementById("transactions-tbody");
  tbody.innerHTML = "";

  transactions.forEach((transaction) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${new Date(transaction.date).toLocaleDateString("ar-SA")}</td>
            <td>${transaction.type === "income" ? "دخل" : "مصروف"}</td>
            <td>${transaction.amount} ريال</td>
            <td>${transaction.category}</td>
            <td>${transaction.source || "-"}</td>
            <td>${transaction.description || "-"}</td>
            <td class="action-buttons">
                <button class="btn-edit" onclick="editTransaction(${
                  transaction.id
                })">تعديل</button>
                <button class="btn-delete" onclick="deleteTransaction(${
                  transaction.id
                })">حذف</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

// دالة تعديل المعاملة
async function editTransaction(id) {
  try {
    const transaction = await window.electronAPI.getTransaction(id);
    currentEditId = id;

    // تعبئة النموذج
    document.getElementById("edit-id").value = id;
    document.getElementById("edit-type").value = transaction.type;
    document.getElementById("edit-amount").value = transaction.amount;
    document.getElementById("edit-source").value = transaction.source || "";
    document.getElementById("edit-description").value =
      transaction.description || "";
    document.getElementById("edit-date").value = transaction.date;

    // تحميل التصنيفات واختيار التصنيف المناسب
    await loadEditCategories(transaction.type);
    document.getElementById("edit-category").value = transaction.category;

    // إظهار/إخفاء حقل المصدر
    handleEditTypeChange({ target: { value: transaction.type } });

    // عرض النافذة
    document.getElementById("edit-modal").style.display = "block";
  } catch (error) {
    console.error("خطأ في تحميل المعاملة:", error);
  }
}

// دالة حذف المعاملة
async function deleteTransaction(id) {
  if (confirm("هل أنت متأكد من حذف هذه المعاملة؟")) {
    try {
      await window.electronAPI.deleteTransaction(id);
      await loadData();
    } catch (error) {
      alert("خطأ في حذف المعاملة");
    }
  }
}
// تحميل التصنيفات في نموذج التعديل
async function loadEditCategories(type) {
  try {
    const categories = await window.electronAPI.getCategories(type);
    const select = document.getElementById("edit-category");
    select.innerHTML = "";
    categories.forEach((category) => {
      select.innerHTML += `<option value="${category}">${category}</option>`;
    });
  } catch (error) {
    console.error("خطأ في تحميل التصنيفات:", error);
  }
}

// معالجة تغيير نوع المعاملة في التعديل
function handleEditTypeChange(e) {
  const type = e.target.value;
  const sourceRow = document.getElementById("edit-source-row");

  if (type === "income") {
    sourceRow.style.display = "block";
  } else {
    sourceRow.style.display = "none";
  }

  loadEditCategories(type);
}

// إنشاء الرسم البياني
function createExpenseChart(expenseCategories) {
  const ctx = document.getElementById("expense-chart").getContext("2d");

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: expenseCategories.map((item) => item.category),
      datasets: [
        {
          data: expenseCategories.map((item) => item.total),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#FF6384",
            "#C9CBCF",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: {
              family: "Tajawal",
            },
          },
        },
        title: {
          display: true,
          text: "توزيع المصاريف حسب التصنيف",
          font: {
            family: "Tajawal",
            size: 16,
          },
        },
      },
    },
  });
}

// تصدير البيانات
async function exportData() {
  try {
    await window.electronAPI.exportData();
    alert("تم تصدير البيانات بنجاح!");
  } catch (error) {
    alert("خطأ في تصدير البيانات");
  }
}
