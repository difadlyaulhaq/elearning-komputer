'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import Image from 'next/image';
import DownloadAppButton from '../shared/DownloadAppButton';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick }) => {
  return (
    <div className="md:hidden sticky top-0 z-30 bg-white border-b pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-2">
          {/* <Image src="/LOGO INTER.png" alt="Alfajr Logo" width={32} height={32} /> */}
          <span className="font-bold text-lg text-black">E-Learning</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="p-2 text-black"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileHeader;
