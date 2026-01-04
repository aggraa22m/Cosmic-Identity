
import React from 'react';
import { Universe } from '../types';

interface UniverseCardProps {
  universe: Universe;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const UniverseCard: React.FC<UniverseCardProps> = ({ universe, isSelected, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(universe.id)}
      className={`relative cursor-pointer group transition-all duration-300 rounded-2xl overflow-hidden p-4 border-2 ${
        isSelected ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex flex-col items-center text-center space-y-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
          isSelected ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60'
        }`}>
          <i className={`fas ${universe.icon} text-xl`}></i>
        </div>
        <h3 className="font-bold text-lg">{universe.name}</h3>
        <p className="text-xs text-white/50 leading-relaxed">{universe.description}</p>
      </div>
      
      {isSelected && (
        <div className="absolute top-2 right-2">
          <i className="fas fa-check-circle text-purple-500"></i>
        </div>
      )}
    </div>
  );
};
