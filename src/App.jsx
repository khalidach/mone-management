import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Categories from "./pages/Categories";
import AllTransactions from "./pages/AllTransactions"; // 1. Import the new page

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/all-transactions" element={<AllTransactions />} />{" "}
          {/* 2. Add the new route */}
        </Routes>
      </main>
    </div>
  );
}

export default App;
