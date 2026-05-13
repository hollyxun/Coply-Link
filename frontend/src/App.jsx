import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ViewPage } from './pages/ViewPage';
import { AdminPage } from './pages/AdminPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<ViewPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;