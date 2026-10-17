import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';

const ADMIN_PASS = "RahatPost2026"; 

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const Route = createFileRoute('/admin')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'articles' | 'stats' | 'users' | 'settings'>('articles');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('أخبار رهط');
  const [content, setContent] = useState('');
  const [isBreaking, setIsBreaking] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);

  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: 'عماد العمراني (أبو غيث)', email: 'admin@rahatpost.com', role: 'مدير عام' },
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('كاتب أخبار');

  const [siteSettings, setSiteSettings] = useState({
    siteName: 'رهط بوست - RAHATPOST',
    isMaintenanceMode: false,
    breakingTickerText: 'أهلاً بكم في بوابة أخبار النقب ورهط الرسمية'
  });

  const [stats] = useState({
    totalVisits: 14250,
    activeVisitors: 38,
    todayViews: 1205
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchArticles();
    }
  }, [isAuthenticated]);

  const fetchArticles = async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Supabase credentials are missing!');
      return;
    }
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=*&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) setArticles(data);
      } catch (e) {
        console.error('Not a valid JSON response:', text);
      }
    } catch (err) {
      console.error('Error fetching articles:', err);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASS) {
      setIsAuthenticated(true);
    } else {
      alert('كلمة المرور غير صحيحة!');
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      alert('خطأ: يجيب ضبط متغيرات البيئة الخاصة بـ Supabase في Vercel أولاً!');
      return;
    }

    setLoading(true);
    let imageUrl = '';

    try {
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/news-images/${fileName}`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': imageFile.type
          },
          body: imageFile
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          alert('خطأ في رفع الصورة: ' + errText);
          setLoading(false);
          return;
        }

        imageUrl = `${SUPABASE_URL}/storage/v1/object/public/news-images/${fileName}`;
      }

      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/articles`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          title,
          category,
          content,
          image_url: imageUrl,
          is_breaking: isBreaking
        })
      });

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        throw new Error('فشل الحفظ في قاعدة البيانات: ' + errText);
      }

      alert('تم نشر الخبر بنجاح!');
      setTitle('');
      setContent('');
      setIsBreaking(false);
      setImageFile(null);
      fetchArticles();
    } catch (err: any) {
      alert('خطأ في النشر: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/articles?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      fetchArticles();
    } catch (err) {
      alert('خطأ أثناء الحذف');
    }
  };

  const handleToggleBreaking = async (id: number, currentStatus: boolean) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/articles?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ is_breaking: !currentStatus })
      });
      fetchArticles();
    } catch (err) {
      alert('خطأ في تحديث الحالة');
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail) return;
    setTeamMembers([...teamMembers, { id: Date.now(), name: newMemberName, email: newMemberEmail, role: newMemberRole }]);
    setNewMemberName('');
    setNewMemberEmail('');
    alert('تمت إضافة المشرف/الكاتب بنجاح!');
  };

  const handleDeleteMember = (id: number) => {
    setTeamMembers(teamMembers.filter(m => m.id !== id));
  };

  if (!isAuthenticated) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <h2 className="text-2xl font-black mb-6 text-center text-gray-800">لوحة تحكم رهط بوست</h2>
          <input
            type="password"
            placeholder="كلمة مرور المدير..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600 text-center"
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">
            دخول للوحة التحكم
          </button>
        </form>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-gray-900 text-white p-6 flex flex-col justify-between shadow-lg">
        <div>
          <div className="mb-8 border-b border-gray-800 pb-4">
            <h1 className="text-xl font-black text-blue-400">RAHATPOST</h1>
            <p className="text-xs text-gray-400 mt-1">لوحة الإدارة المركزية</p>
          </div>
          <nav className="space-y-2">
            <button onClick={() => setActiveTab('articles')} className={`w-full text-right px-4 py-3 rounded-xl font-bold transition ${activeTab === 'articles' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>📰 إدارة الأخبار</button>
            <button onClick={() => setActiveTab('stats')} className={`w-full text-right px-4 py-3 rounded-xl font-bold transition ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>📊 مراقبة الزوار</button>
            <button onClick={() => setActiveTab('users')} className={`w-full text-right px-4 py-3 rounded-xl font-bold transition ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>👥 المشرفون والكتاب</button>
            <button onClick={() => setActiveTab('settings')} className={`w-full text-right px-4 py-3 rounded-xl font-bold transition ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>⚙️ إعدادات الموقع</button>
          </nav>
        </div>
        <div className="pt-6 border-t border-gray-800">
          <button onClick={() => setIsAuthenticated(false)} className="w-full bg-red-500/10 text-red-400 px-4 py-2.5 rounded-xl font-bold hover:bg-red-500 hover:text-white transition text-center">تسجيل خروج</button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {activeTab === 'articles' && (
            <div className="space-y-6">
              <form onSubmit={handlePublish} className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2">نشر خبر جديد أو عاجل</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1">عنوان الخبر</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="عنوان الخبر..." />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">التصنيف</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 border rounded-xl bg-white">
                      <option value="أخبار رهط">أخبار رهط</option>
                      <option value="النقب">النقب</option>
                      <option value="رياضة">رياضة</option>
                      <option value="مجتمع">مجتمع</option>
                      <option value="حوادث">حوادث</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">صورة الخبر</label>
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded-xl text-sm" />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-3 cursor-pointer bg-red-50 p-3 rounded-xl border border-red-200 w-full">
                      <input type="checkbox" checked={isBreaking} onChange={(e) => setIsBreaking(e.target.checked)} className="w-5 h-5 text-red-600 rounded" />
                      <span className="font-bold text-red-700">تمييز كـ "خبر عاجل" رئيسي</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">محتوى الخبر</label>
                  <textarea required rows={4} value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="تفاصيل الخبر..." />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:bg-gray-400">
                  {loading ? 'جاري النشر...' : 'نشر الخبر فوراً'}
                </button>
              </form>

              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">الأخبار المنشورة ({articles.length})</h2>
                <div className="space-y-3">
                  {articles.map((item) => (
                    <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-xl gap-4 hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        {item.image_url && <img src={item.image_url} alt="" className="w-14 h-14 object-cover rounded-xl" />}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">{item.category}</span>
                            {item.is_breaking && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold animate-pulse">عاجل نشط</span>}
                          </div>
                          <h3 className="font-bold text-gray-900 mt-1">{item.title}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <button onClick={() => handleToggleBreaking(item.id, item.is_breaking)} className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${item.is_breaking ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                          {item.is_breaking ? 'إلغاء العاجل' : 'جعلع عاجلاً'}
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-red-100 transition">حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-900">إحصائيات الزوار النشطين</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-blue-600">
                  <span className="text-sm text-gray-500 font-medium">الزوار النشطون حالياً</span>
                  <div className="text-3xl font-black text-blue-600 mt-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    {stats.activeVisitors} زائر
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-green-600">
                  <span className="text-sm text-gray-500 font-medium">مشاهدات اليوم</span>
                  <div className="text-3xl font-black text-green-600 mt-2">{stats.todayViews} مشاهدة</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-purple-600">
                  <span className="text-sm text-gray-500 font-medium">إجمالي الزيارات</span>
                  <div className="text-3xl font-black text-purple-600 mt-2">{stats.totalVisits} زيارة</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">إضافة مشرف أو كاتب جديد</h2>
                <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" required placeholder="اسم المستخدم..." value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="p-3 border rounded-xl" />
                  <input type="email" required placeholder="البريد الإلكتروني..." value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} className="p-3 border rounded-xl" />
                  <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} className="p-3 border rounded-xl bg-white">
                    <option value="مدير عام">مدير عام</option>
                    <option value="مشرف موقع">مشرف موقع</option>
                    <option value="كاتب أخبار">كاتب أخبار</option>
                  </select>
                  <button type="submit" className="md:col-span-3 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">منح الصلاحية وإضافة العضو</button>
                </form>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">قائمة المشرفين والكتاب الحاليين</h2>
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-xl">
                      <div>
                        <h3 className="font-bold text-gray-900">{member.name}</h3>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{member.role}</span>
                        <button onClick={() => handleDeleteMember(member.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-100 transition">إزالة</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2">إعدادات الموقع العامة</h2>
              <div>
                <label className="block text-sm font-semibold mb-1">نص شريط الأخبار العاجلة العام</label>
                <input type="text" value={siteSettings.breakingTickerText} onChange={(e) => setSiteSettings({...siteSettings, breakingTickerText: e.target.value})} className="w-full p-3 border rounded-xl" />
              </div>
              <div className="pt-4">
                <label className="flex items-center gap-3 cursor-pointer bg-red-50 p-4 rounded-xl border border-red-200">
                  <input type="checkbox" checked={siteSettings.isMaintenanceMode} onChange={(e) => setSiteSettings({...siteSettings, isMaintenanceMode: e.target.checked})} className="w-5 h-5 text-red-600 rounded" />
                  <span className="font-bold text-red-700">تفعيل وضع الصيانة (إيقاف عرض الموقع مؤقتاً للزوار)</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
