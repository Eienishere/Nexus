import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, Clock, CheckCircle2, Timer,
  Plus, Calendar as CalendarIcon, ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

import { cn } from '../lib/utils';
import { t } from '../lib/i18n';
import { api } from '../lib/api';

const data = [
  { name: 'Mon', tasks: 0, focus: 0 },
  { name: 'Tue', tasks: 0, focus: 0 },
  { name: 'Wed', tasks: 0, focus: 0 },
  { name: 'Thu', tasks: 0, focus: 0 },
  { name: 'Fri', tasks: 0, focus: 0 },
  { name: 'Sat', tasks: 0, focus: 0 },
  { name: 'Sun', tasks: 0, focus: 0 },
];

export default function Dashboard() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('Dashboard_Welcome_Morning') : hour < 18 ? t('Dashboard_Welcome_Afternoon') : t('Dashboard_Welcome_Evening');
  const [stats, setStats] = useState({ completedTasks: 0, pomodoros: 0 });
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

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
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold mb-1">{greeting}</h2>
          <p className="text-neutral-400">{t('Dashboard_TodaySummary')}</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
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
          { label: t('Stats_FocusTime'), value: '0h', icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: t('Stats_PomodoroCount'), value: stats.pomodoros || 0, icon: Timer, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: t('Stats_ProductivityScore'), value: '0%', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
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
            <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm focus:outline-none">
              <option>{t('Stats_Week')}</option>
              <option>{t('Stats_Month')}</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
            <button className="text-indigo-400 text-sm font-medium hover:underline">Tümünü Gör</button>
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
