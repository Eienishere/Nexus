import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Clock, CheckCircle2, Timer,
  Plus, Calendar as CalendarIcon, ArrowUpRight, StickyNote
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

import { cn } from '../lib/utils';
import { t } from '../lib/i18n';
import { api } from '../lib/api';
import CustomSelect from './CustomSelect';

export default function Dashboard() {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('Dashboard_Welcome_Morning') : hour < 18 ? t('Dashboard_Welcome_Afternoon') : t('Dashboard_Welcome_Evening');
  const [stats, setStats] = useState({ completedTasks: 0, pomodoros: 0 });
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('Week');

  const rangeOptions = [
    { value: 'Week', label: t('Stats_Week') },
    { value: 'Month', label: t('Stats_Month') }
  ];

  const focusTimeHours = Math.floor((stats.pomodoros * 25) / 60);
  const focusTimeMinutes = (stats.pomodoros * 25) % 60;
  const focusTimeString = `${focusTimeHours}s ${focusTimeMinutes}d`;
  
  const productivityScore = Math.min(Math.round((stats.completedTasks * 10) + (stats.pomodoros * 5)), 100);

  const chartData = React.useMemo(() => {
    if (timeRange === 'Week') {
      return [
        { name: 'Pzt', tasks: 3, focus: 2 },
        { name: 'Sal', tasks: 5, focus: 4 },
        { name: 'Çar', tasks: 2, focus: 1 },
        { name: 'Per', tasks: 8, focus: 5 },
        { name: 'Cum', tasks: 4, focus: 3 },
        { name: 'Cmt', tasks: 1, focus: 0 },
        { name: 'Paz', tasks: 0, focus: 0 },
      ];
    } else {
      return Array.from({ length: 4 }, (_, i) => ({
        name: `Hafta ${i + 1}`,
        tasks: Math.floor(Math.random() * 20) + 10,
        focus: Math.floor(Math.random() * 15) + 5,
      }));
    }
  }, [timeRange]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats', error);
      }
    };
    loadStats();
  }, []);

  useEffect(() => {
    const loadUpcomingTasks = async () => {
      try {
        const tasks = await api.getTasks();
        const now = new Date();
        const upcoming = tasks
          .filter((task: any) => task.due_date && new Date(task.due_date) > now && task.status !== 'Done')
          .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
          .slice(0, 5);
        setUpcomingTasks(upcoming);
      } catch (error) {
        console.error('Failed to load upcoming tasks', error);
      }
    };
    loadUpcomingTasks();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold mb-1">{greeting}</h2>
          <p className="text-neutral-400 mb-4">{t('Dashboard_TodaySummary')}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate('/pomodoro')} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors border border-rose-500/20 shadow-lg shadow-rose-500/10">
              <Timer size={14} /> Odaklanmaya Başla
            </button>
            <button onClick={() => navigate('/notes', { state: { createNew: true } })} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors border border-amber-500/20 shadow-lg shadow-amber-500/10">
              <StickyNote size={14} /> Hızlı Not
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/calendar')}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            <CalendarIcon size={18} />
            <span>{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span>
          </button>
          <button 
            onClick={() => window.dispatchEvent(new Event('open-quick-add'))}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-colors"
          >
            <Plus size={18} />
            <span>{t('Task_NewTask')}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t('Stats_TasksCompleted'), value: stats.completedTasks || 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: t('Stats_FocusTime'), value: focusTimeString, icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: t('Stats_PomodoroCount'), value: stats.pomodoros || 0, icon: Timer, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: t('Stats_ProductivityScore'), value: `${productivityScore}%`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl glass-panel border border-white/5 hover:border-white/10 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
            <p className="text-neutral-400 text-sm font-medium mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold font-display">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 p-8 rounded-3xl glass-panel border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold font-display">{t('Stats_Title')}</h3>
            <CustomSelect 
              value={timeRange}
              onChange={(val) => setTimeRange(val)}
              options={rangeOptions}
              className="w-36"
              triggerClassName="py-1 px-3 rounded-lg"
            />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="tasks" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="p-8 rounded-3xl glass-panel border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold font-display">{t('Cal_Upcoming')}</h3>
            <button onClick={() => navigate('/tasks')} className="text-indigo-400 text-sm font-medium hover:underline">Tümünü Gör</button>
          </div>
          <div className="space-y-4">
            {upcomingTasks.map((task: any, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
                <div className={cn(
                  "w-1 h-8 rounded-full",
                  task.priority === 'Critical' ? 'bg-rose-500' : 
                  task.priority === 'High' ? 'bg-amber-500' : 'bg-indigo-500'
                )} />
                <div className="flex-1">
                  <h4 className="font-medium text-sm group-hover:text-indigo-400 transition-colors">{task.title}</h4>
                  <p className="text-xs text-neutral-500">{new Date(task.due_date).toLocaleDateString('tr-TR')}</p>
                </div>
                <ArrowUpRight size={16} className="text-neutral-600 group-hover:text-white transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
