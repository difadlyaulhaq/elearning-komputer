import React from 'react';
import Link from 'next/link';
import { Users, BookOpen, BarChart3, FolderKanban, Building2, TrendingUp } from 'lucide-react';
import { getCoursesCount, getUsersCount, getCategoriesCount, getDivisionsCount } from '@/lib/data/stats';
import { getRecentActivities } from '@/lib/data/activities';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient'; // Import the new client component

// --- Tipe Data ---
interface Stat {
  title: string;
  value: string;
  iconName: string;
  href: string;
  color: string;
  iconColor: string;
}

// --- Main Component (Server Component) ---
const AdminDashboard = async () => {
  // Memanggil fungsi data fetching secara langsung dan paralel
  const [coursesCount, usersCount, categoriesCount, divisionsCount, recentActivities] = await Promise.all([
    getCoursesCount(),
    getUsersCount(),
    getCategoriesCount(),
    getDivisionsCount(),
    getRecentActivities(5) // Fetch 5 recent activities
  ]);

  const stats: Stat[] = [
    {
      title: 'Total Kursus',
      value: coursesCount.toString(),
      iconName: 'BookOpen',
      href: '/admin/courses',
      color: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      title: 'Total Pegawai',
      value: usersCount.toString(),
      iconName: 'Users',
      href: '/admin/users',
      color: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Total Kategori',
      value: categoriesCount.toString(),
      iconName: 'FolderKanban',
      href: '/admin/categories',
      color: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Total Divisi',
      value: divisionsCount.toString(),
      iconName: 'Building2',
      href: '/admin/divisions',
      color: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    }
  ];

  return <AdminDashboardClient stats={stats} recentActivities={recentActivities} />;
};

export default AdminDashboard;
