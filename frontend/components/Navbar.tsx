import React from 'react';
import { Share2 } from 'lucide-react';

interface NavbarProps {
  onHome: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onHome }) => {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={onHome}>
            <Share2 className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">ShareDrop AI</span>
          </div>
          <div className="flex items-center space-x-4">
             <a href="#" onClick={(e) => {e.preventDefault(); onHome();}} className="text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">Find Container</a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;