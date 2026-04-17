import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Target, Timer, Calendar } from 'lucide-react';
import { t } from '../lib/i18n';

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const hasOnboarded = localStorage.getItem('nexus_onboarding_completed');
    if (hasOnboarded) {
      setIsOpen(false);
      onComplete();
    }
  }, [onComplete]);

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
    else {
      localStorage.setItem('nexus_onboarding_completed', 'true');
      setIsOpen(false);
      onComplete();
    }
  };

  const steps = [
    {
      title: 'Nexus\'a Hoş Geldiniz',
      desc: 'Tüm üretkenlik araçlarınız tek bir yerde. Görevler, notlar, hedefler ve daha fazlası.',
      icon: Zap
    },
    {
      title: 'Odaklanın ve Başarın',
      desc: 'Pomodoro zamanlayıcı ile dikkatiniz dağılmadan çalışın, hedeflerinize adım adım ulaşın.',
      icon: Timer
    },
    {
      title: 'Hızlı Kısayollar',
      desc: 'Uygulama içinde her an Ctrl+Shift+N ile hızlıca görev ekleyebilirsiniz.',
      icon: Target
    }
  ];

  if (!isOpen) return null;

  const currentStep = steps[step];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-lg glass-panel p-10 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center text-white"
        >
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 mb-8">
            <currentStep.icon size={40} className="text-white fill-white/20" />
          </div>
          
          <h2 className="text-3xl font-display font-bold mb-4">{currentStep.title}</h2>
          <p className="text-neutral-400 mb-10 text-lg leading-relaxed">{currentStep.desc}</p>

          <div className="flex gap-2 mb-10">
            {steps.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-indigo-500' : 'w-2 bg-white/20'}`} />
            ))}
          </div>

          <button 
            onClick={handleNext}
            className="w-full py-4 bg-white text-indigo-950 hover:bg-neutral-200 rounded-xl font-bold text-lg transition-colors shadow-lg"
          >
            {step === 2 ? 'Başla' : 'Devam Et'}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
