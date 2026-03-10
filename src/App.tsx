import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store/useStore';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Practice from './pages/Practice';
import ProgressDashboard from './pages/ProgressDashboard';
import Analytics from './pages/Analytics';
import Sessions from './pages/Sessions';
import Library from './pages/Library';
import ReadingViewer from './pages/ReadingViewer';
import Login from './pages/Login';

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
            <Route path="library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
            <Route path="read/:id" element={<ProtectedRoute><ReadingViewer /></ProtectedRoute>} />
            <Route path="progress" element={<ProtectedRoute><ProgressDashboard /></ProtectedRoute>} />
            <Route path="analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
