import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  color?: string; // For tags color indicator
  icon?: React.ReactNode; // For icons like Flags, Calendars, etc.
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  optionsClassName?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seçiniz',
  className,
  triggerClassName,
  optionsClassName
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left w-full", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-all cursor-pointer text-left",
          triggerClassName
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon}
              {selectedOption.color && (
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                  style={{ backgroundColor: selectedOption.color }} 
                />
              )}
              <span>{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-neutral-500">{placeholder}</span>
          )}
        </span>
        <ChevronDown 
          size={16} 
          className={cn("text-neutral-400 transition-transform duration-200 shrink-0 ml-2", isOpen && "rotate-180")} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              "absolute z-[90] mt-2 w-full rounded-xl glass-panel shadow-2xl p-1.5 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar backdrop-blur-xl bg-black/40",
              optionsClassName
            )}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all hover:bg-white/5 cursor-pointer font-medium",
                  option.value === value 
                    ? "text-indigo-400 bg-indigo-500/10 font-bold" 
                    : "text-neutral-300 hover:text-white"
                )}
              >
                {option.icon}
                {option.color && (
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                    style={{ backgroundColor: option.color }} 
                  />
                )}
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
