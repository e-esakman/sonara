import { Outlet } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../sections/Footer';
import CustomCursor from '../components/CustomCursor';

const MainLayout = () => {
    return (
        <div className="flex flex-col min-h-screen">
            <CustomCursor />
            <Navigation />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;
