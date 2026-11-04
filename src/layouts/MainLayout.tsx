import { Outlet } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../sections/Footer';

const MainLayout = () => {
    return (
        <div className="flex flex-col min-h-screen">
            <Navigation />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;
