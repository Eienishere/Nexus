import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '../lib/i18n';
import { api } from '../lib/api';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { TaskPriority } from '../types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setPriority('Medium');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await api.createTask({
        id: uuidv4(),
        title,
        description,
        priority,
        status: 'Todo',
        tags: [],
      });
      toast.success(t('Task_Saved'));
      onClose();
    } catch (error) {
      toast.error(t('Msg_Error'));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl"
          >
            <h3 className="text-2xl font-display font-bold mb-6">Hızlı Görev Ekle</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">{t('Task_Title')}</label>
                <input 
                  autoFocus
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-white"
                  placeholder="Ne yapılması gerekiyor?"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                >
                  {t('Btn_Cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-colors font-bold"
                >
                  {t('Btn_Add')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
