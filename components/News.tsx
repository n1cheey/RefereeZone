import React, { useEffect, useMemo, useState } from 'react';
import Layout from './Layout';
import { NewsItem, User } from '../types';
import { createNewsPost, deleteNewsPost, getNewsPosts } from '../services/newsService';
import { ExternalLink, Plus, Trash2, Youtube } from 'lucide-react';
import { useI18n } from '../i18n';

interface NewsProps {
  user: User;
  onBack: () => void;
}

const getYoutubeEmbedUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes('youtu.be')) {
      const videoId = parsedUrl.pathname.replace(/^\/+/, '');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (parsedUrl.hostname.includes('youtube.com')) {
      const videoId = parsedUrl.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      const pathMatch = parsedUrl.pathname.match(/\/embed\/([^/]+)/);
      return pathMatch ? `https://www.youtube.com/embed/${pathMatch[1]}` : null;
    }
  } catch {
    return null;
  }

  return null;
};

const formatCreatedAt = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const News: React.FC<NewsProps> = ({ user, onBack }) => {
  const { t } = useI18n();
  const [posts, setPosts] = useState<NewsItem[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [commentary, setCommentary] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canManageNews = user.role === 'Instructor';
  const previewEmbedUrl = useMemo(() => getYoutubeEmbedUrl(youtubeUrl), [youtubeUrl]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await getNewsPosts();
        if (isMounted) {
          setPosts(response.posts);
          setErrorMessage('');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load news.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreatePost = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await createNewsPost({ youtubeUrl, commentary });
      setPosts(response.posts);
      setYoutubeUrl('');
      setCommentary('');
      setSuccessMessage('News post added.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add news post.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setDeletingId(postId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await deleteNewsPost(postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setSuccessMessage('News post deleted.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete news post.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout title={t('news.title')} onBack={onBack}>
      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {canManageNews && (
        <form onSubmit={handleCreatePost} className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Youtube size={18} className="text-[#581c1c]" />
            <h3 className="text-base font-bold text-slate-900">{t('news.addPost')}</h3>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">{`${t('common.youtube')} Link`}</label>
            <input
              required
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c]"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">{t('news.commentary')}</label>
            <textarea
              rows={4}
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#581c1c] resize-none"
              placeholder={t('news.commentaryPlaceholder')}
            />
          </div>
          {previewEmbedUrl && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 md:max-w-3xl">
              <div className="aspect-video">
                <iframe
                  src={previewEmbedUrl}
                  title="YouTube preview"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#581c1c] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
          >
            <Plus size={16} />
            {isSaving ? t('common.saving') : t('news.addButton')}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('news.loading')}</p>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
          {t('news.none')}
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((item) => {
            const embedUrl = getYoutubeEmbedUrl(item.youtubeUrl);

            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {embedUrl ? (
                  <div className="p-4 pb-0 md:p-5 md:pb-0">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 md:mx-auto md:max-w-3xl">
                      <div className="aspect-video">
                        <iframe
                          src={embedUrl}
                          title={`News video ${item.id}`}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center bg-slate-100 px-6 py-10 text-sm text-slate-500">
                    {t('news.invalidYoutube')}
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-[#f97316] uppercase mb-1 tracking-wider">
                        {formatCreatedAt(item.createdAt)}
                      </div>
                      <div className="text-xs text-slate-400">{t('news.postedBy', { name: item.createdByName })}</div>
                    </div>
                    {canManageNews && (
                      <button
                        type="button"
                        onClick={() => handleDeletePost(item.id)}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-70"
                      >
                        <Trash2 size={14} />
                        {deletingId === item.id ? t('common.deleting') : t('common.delete')}
                      </button>
                    )}
                  </div>

                  {item.commentary && <p className="mt-4 text-sm text-slate-600 whitespace-pre-wrap">{item.commentary}</p>}

                  <a
                    href={item.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#581c1c] group"
                  >
                    {t('news.openOnYoutube')}
                    <ExternalLink size={14} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default News;
