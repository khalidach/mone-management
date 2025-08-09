import React, { useState, useEffect, useMemo } from "react";

function Reports() {
  const [reportType, setReportType] = useState("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear - i);
  }, []);

  const months = [
    { value: 1, name: "يناير" },
    { value: 2, name: "فبراير" },
    { value: 3, name: "مارس" },
    { value: 4, name: "أبريل" },
    { value: 5, name: "مايو" },
    { value: 6, name: "يونيو" },
    { value: 7, name: "يوليو" },
    { value: 8, name: "أغسطس" },
    { value: 9, name: "سبتمبر" },
    { value: 10, name: "أكتوبر" },
    { value: 11, name: "نوفمبر" },
    { value: 12, name: "ديسمبر" },
  ];

  const fetchReport = async () => {
    setLoading(true);
    setReportData(null);
    try {
      if (reportType === "monthly") {
        const data = await window.electronAPI.getMonthlyReport(year, month);
        setReportData({ type: "monthly", ...data });
      } else {
        const data = await window.electronAPI.getYearlyReport(year);
        setReportData({ type: "yearly", data });
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
      alert("حدث خطأ أثناء جلب التقرير.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <div className="card">
        <h2>إنشاء تقرير</h2>
        <div className="report-controls">
          <div className="form-row">
            <label>نوع التقرير:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="monthly">شهري</option>
              <option value="yearly">سنوي</option>
            </select>
          </div>
          <div className="form-row">
            <label>السنة:</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {reportType === "monthly" && (
            <div className="form-row">
              <label>الشهر:</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={fetchReport}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "جاري التحميل..." : "عرض التقرير"}
          </button>
        </div>
      </div>

      {reportData && (
        <div className="card report-results">
          {reportData.type === "monthly" && (
            <>
              <h3>
                تقرير شهر {months.find((m) => m.value === month)?.name} {year}
              </h3>
              <div className="summary-cards">
                <div className="card income">
                  <h3>إجمالي الدخل</h3>
                  <p>{reportData.totalIncome.toFixed(2)} درهم</p>
                </div>
                <div className="card expense">
                  <h3>إجمالي المصاريف</h3>
                  <p>{reportData.totalExpense.toFixed(2)} درهم</p>
                </div>
                <div className="card balance">
                  <h3>الصافي</h3>
                  <p>
                    {(reportData.totalIncome - reportData.totalExpense).toFixed(
                      2
                    )}{" "}
                    درهم
                  </p>
                </div>
              </div>
            </>
          )}
          {reportData.type === "yearly" && (
            <>
              <h3>تقرير سنة {year}</h3>
              <table>
                <thead>
                  <tr>
                    <th>الشهر</th>
                    <th>إجمالي الدخل</th>
                    <th>إجمالي المصاريف</th>
                    <th>الصافي</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.map((row) => {
                    const monthName = months.find(
                      (m) => m.value === parseInt(row.month.split("-")[1])
                    )?.name;
                    const net = row.totalIncome - row.totalExpense;
                    return (
                      <tr key={row.month}>
                        <td>{monthName}</td>
                        <td className="income-text">
                          {row.totalIncome.toFixed(2)} درهم
                        </td>
                        <td className="expense-text">
                          {row.totalExpense.toFixed(2)} درهم
                        </td>
                        <td style={{ color: net >= 0 ? "#27ae60" : "#e74c3c" }}>
                          {net.toFixed(2)} درهم
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Reports;
