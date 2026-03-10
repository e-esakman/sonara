import React from 'react';

const BookShelf = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-8 px-6 md:px-12 pb-16 pt-4">
            {children}
        </div>
    );
};

export default BookShelf;
