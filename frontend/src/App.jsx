import React from 'react'
import {BrowserRouter as Router , Routes,Route } from "react-router-dom";
import Login from './pages/auth/Login';
import Home from './pages/Home';
import ProtectedRoute from './componenets/ProtectedRoute';
import Profile from './pages/Profile';
const App = () => {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App