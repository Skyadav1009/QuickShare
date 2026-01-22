import React from 'react';
import { Share2 } from 'lucide-react';

interface NavbarProps {
  onHome: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onHome }) => {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center cursor-pointer" onClick={onHome}>
            <Share2 className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" />
            <span className="ml-2 text-base sm:text-xl font-bold text-gray-900">QuickShare</span>
          </div>
          <div className="flex items-center">
             <a href="#" onClick={(e) => {e.preventDefault(); onHome();}} className="text-gray-500 hover:text-indigo-600 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium active:bg-gray-100">Find Container</a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;