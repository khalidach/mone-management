import React from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="main-nav">
      <h1>💰 مدير المال</h1>
      <ul>
        <li>
          <NavLink to="/">الرئيسية</NavLink>
        </li>
        <li>
          <NavLink to="/reports">التقارير</NavLink>
        </li>
        <li>
          <NavLink to="/categories">التصنيفات</NavLink>
        </li>{" "}
        {/* Add the new link */}
      </ul>
    </nav>
  );
}

export default Navbar;
