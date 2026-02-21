import React from 'react';
import HeadCountCamera from '../../components/overcrowding/HeadCountCamera';
import CellAllocation from '../../components/overcrowding/CellAllocation';

export default function Overcrowding() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Overcrowding Management</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <section>
          <HeadCountCamera />
        </section>
        
        <section>
          <CellAllocation />
        </section>
      </div>
    </div>
  );
}
