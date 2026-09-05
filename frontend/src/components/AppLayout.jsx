import React from 'react';
import Navbar from './Navbar';

const AppLayout = ({ children, activeModule }) => {
  return (
    <div className="app-layout-shell">
      <Navbar activeModule={activeModule} />
      <main className="app-layout-main">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
