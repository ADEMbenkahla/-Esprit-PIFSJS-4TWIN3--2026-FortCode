import React, { useState } from "react";
import "./App.css";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  const [currentPage, setCurrentPage] = useState("login");

  return (
    <div className="container">
      {currentPage === "login" ? (
        <Login onSwitchToRegister={() => setCurrentPage("register")} />
      ) : (
        <Register onSwitchToLogin={() => setCurrentPage("login")} />
      )}
    </div>
  );
}

export default App;
