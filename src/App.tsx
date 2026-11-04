import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './store/StoreProvider';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Login from './pages/Login';
import Rooms from './pages/Rooms';
import RoomsErrorBoundary from './components/RoomsErrorBoundary';

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
            <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
            <Route path="rooms" element={<RoomsErrorBoundary><Rooms /></RoomsErrorBoundary>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
