import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store/useStore';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Dashboard from './pages/Dashboard';
import ProgressDashboard from './pages/ProgressDashboard';
import Sessions from './pages/Sessions';
import Library from './pages/Library';
import ReadingViewer from './pages/ReadingViewer';
import Login from './pages/Login';
import Grammar from './pages/Grammar';
import Rooms from './pages/Rooms';
import RoomsErrorBoundary from './components/RoomsErrorBoundary';
import Architecture from './pages/Architecture';

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
            <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
            <Route path="rooms" element={<ProtectedRoute><RoomsErrorBoundary><Rooms /></RoomsErrorBoundary></ProtectedRoute>} />
            <Route path="grammar" element={<ProtectedRoute><Grammar /></ProtectedRoute>} />
            <Route path="library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
            <Route path="read/:id" element={<ProtectedRoute><ReadingViewer /></ProtectedRoute>} />
            <Route path="progress" element={<ProtectedRoute><ProgressDashboard /></ProtectedRoute>} />
            <Route path="analytics" element={<ProtectedRoute><ProgressDashboard /></ProtectedRoute>} />
            <Route path="sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
            <Route path="architecture" element={<Architecture />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
