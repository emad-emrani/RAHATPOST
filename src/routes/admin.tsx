import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// يمكنك جعل كلمة المرور مخفية في Vercel عبر VITE_ADMIN_PASS
const ADMIN_PASS = "RahatPost2026"; 

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const Route = createFileRoute('/admin')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('أخبار رهط');
  const [content, setContent] = useState('');
  const [isBreaking, setIsBreaking] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchArticles();
    }
  }, [isAuthenticated]);

  const fetchArticles = async () => {
    const { data } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setArticles(data);
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
    setLoading(true);
    let imageUrl = '';

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('news-images')
        .upload(fileName, imageFile);

      if (uploadError) {
        alert('خطأ في رفع الصورة: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('news-images')
        .getPublicUrl(fileName);
        
      imageUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from('articles').insert([
      { title, category, content, image_url: imageUrl, is_breaking: isBreaking },
    ]);

    setLoading(false);

    if (error) {
      alert('خطأ في النشر: ' + error.message);
    } else {
      alert('تم نشر الخبر بنجاح!');
      setTitle('');
      setContent('');
      setIsBreaking(false);
      setImageFile(null);
      fetchArticles();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    await supabase.from('articles').delete().eq('id', id);
    fetchArticles();
  };

  if (!isAuthenticated) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">لوحة تحكم رهط بوست</h2>
          <input
            type="password"
            placeholder="كلمة مرور المدير..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">
            دخول
          </button>
        </form>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">إدارة أخبار RAHATPOST</h1>
          <button onClick={() => setIsAuthenticated(false)} className="text-red-600 font-semibold">
            خروج
          </button>
        </div>

        <form onSubmit={handlePublish} className="bg-white p-6 rounded-xl shadow-sm border mb-10 space-y-4">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">نشر خبر جديد</h2>
          
          <div>
            <label className="block font-semibold mb-1">عنوان الخبر</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="عنوان الخبر..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">التصنيف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 border rounded-lg bg-white"
              >
                <option value="أخبار رهط">أخبار رهط</option>
                <option value="النقب">النقب</option>
                <option value="رياضة">رياضة</option>
                <option value="مجتمع">مجتمع</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">صورة الخبر</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">المحتوى</label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="نص الخبر..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="breaking"
              checked={isBreaking}
              onChange={(e) => setIsBreaking(e.target.checked)}
              className="w-5 h-5 text-red-600"
            />
            <label htmlFor="breaking" className="font-bold text-red-600 cursor-pointer">
              خبر عاجل (شريط عاجل)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'جاري النشر...' : 'نشر الخبر'}
          </button>
        </form>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">الأخبار الحالية ({articles.length})</h2>
          <div className="space-y-3">
            {articles.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-4">
                  {item.image_url && (
                    <img src={item.image_url} alt="" className="w-14 h-14 object-cover rounded-md" />
                  )}
                  <div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                      {item.category}
                    </span>
                    <h3 className="font-bold text-gray-800 mt-1">{item.title}</h3>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-semibold text-sm hover:bg-red-100"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
