import React from 'react';
import { Share2 } from 'lucide-react';

interface NavbarProps {
  onHome: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onHome }) => {
  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center cursor-pointer" onClick={onHome}>
            <Share2 className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
            <span className="ml-2 text-base sm:text-xl font-bold text-white">QuickShare</span>
          </div>
           {/* right side intentionally left empty (removed Find Container link) */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;