import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Images, Newspaper, ArrowRight, Eye, Plus, LayoutTemplate, Clock } from "lucide-react";
import { fetchDashboardStats } from "../api/dashboardApi";
import { useAuth } from "../auth/AuthContext";
import { Avatar } from "../components/Users/Badges";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBlogs: 0,
    totalMedia: 0,
    totalUsers: 0,
    publishedBlogs: 0,
    draftBlogs: 0,
    latestBlogs: [],
    topBlogs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const statCards = [
    {
      title: "Blog Posts",
      value: stats.totalBlogs,
      icon: Newspaper,
      color: "text-signal",
      bg: "bg-signal/10",
      link: "/blog",
      details: `${stats.publishedBlogs} Published • ${stats.draftBlogs} Drafts`,
    },
    {
      title: "Gallery Media",
      value: stats.totalMedia,
      icon: Images,
      color: "text-success",
      bg: "bg-success/10",
      link: "/gallery",
      details: "Total uploaded files",
    },
    {
      title: "Team Members",
      value: stats.totalUsers,
      icon: Users,
      color: "text-flare",
      bg: "bg-flare/10",
      link: "/users",
      details: "Active accounts",
    },
  ];

  return (
    <div className="flex h-screen flex-1 flex-col overflow-hidden bg-paper">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-paper-line bg-paper-card px-8 py-6 shadow-sm z-10">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink tracking-tight">
            Welcome back, {user?.name?.split(" ")[0]}!
          </h1>
          <p className="mt-1.5 text-sm text-muted font-medium">
            Here's a quick snapshot of what's happening today.
          </p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <button 
            onClick={() => navigate("/blog/new")}
            className="flex items-center gap-2 rounded-md bg-signal px-4 py-2 text-[13px] font-semibold tracking-wide text-white shadow-sm hover:bg-signal/90 transition-all"
          >
            <Plus size={16} strokeWidth={2.5} />
            Write Post
          </button>
          <button 
            onClick={() => navigate("/pages/new")}
            className="flex items-center gap-2 rounded-md border border-paper-line bg-paper-card px-4 py-2 text-[13px] font-semibold tracking-wide text-ink shadow-sm hover:bg-paper transition-all"
          >
            <LayoutTemplate size={16} strokeWidth={2.5} />
            Build Page
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div className="animate-pulse space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-xl bg-paper-card border border-paper-line shadow-sm"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80 rounded-xl bg-paper-card border border-paper-line shadow-sm"></div>
                <div className="h-80 rounded-xl bg-paper-card border border-paper-line shadow-sm"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {statCards.map((card, idx) => (
                  <Link 
                    key={idx} 
                    to={card.link}
                    className="group flex flex-col justify-between overflow-hidden rounded-xl border border-paper-line bg-paper-card p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[13px] font-semibold text-muted uppercase tracking-wider">{card.title}</p>
                        <h3 className="mt-1 font-display text-3xl font-bold text-ink">{card.value}</h3>
                      </div>
                      <div className={`rounded-lg p-2.5 ${card.bg}`}>
                        <card.icon size={20} className={card.color} strokeWidth={2} />
                      </div>
                    </div>
                    
                    <div className="mt-5 flex items-center justify-between border-t border-paper-line pt-3">
                      <span className="text-[13px] text-muted font-medium">{card.details}</span>
                      <ArrowRight size={14} className="text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
                    </div>
                  </Link>
                ))}
              </div>

              {/* Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Latest Blogs */}
                <div className="rounded-xl border border-paper-line bg-paper-card shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 border-b border-paper-line px-6 py-4 bg-paper/50 rounded-t-xl">
                    <Clock size={16} className="text-muted" />
                    <h2 className="text-[14px] font-bold text-ink uppercase tracking-wide">Recently Added Posts</h2>
                  </div>
                  
                  <div className="p-2 flex-1">
                    {stats.latestBlogs?.length > 0 ? (
                      <div className="flex flex-col">
                        {stats.latestBlogs.map((blog) => (
                          <Link 
                            key={blog._id} 
                            to={`/blog/${blog._id}/edit`}
                            className="group flex items-center justify-between rounded-lg p-3 hover:bg-paper transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar user={blog.author} size={36} />
                              <div>
                                <p className="text-sm font-semibold text-ink group-hover:text-signal truncate max-w-[180px] sm:max-w-[220px] transition-colors">{blog.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${blog.status === 'published' ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'}`}>
                                    {blog.status}
                                  </span>
                                  <span className="text-[12px] text-muted font-medium">
                                    {new Date(blog.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <ArrowRight size={14} className="text-transparent group-hover:text-muted transition-colors" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-32 flex-col items-center justify-center">
                        <p className="text-[13px] text-muted font-medium">No posts found.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Performing Blogs */}
                <div className="rounded-xl border border-paper-line bg-paper-card shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 border-b border-paper-line px-6 py-4 bg-paper/50 rounded-t-xl">
                    <Eye size={16} className="text-signal" />
                    <h2 className="text-[14px] font-bold text-ink uppercase tracking-wide">Top Performing Posts</h2>
                  </div>
                  
                  <div className="p-2 flex-1">
                    {stats.topBlogs?.length > 0 ? (
                      <div className="flex flex-col">
                        {stats.topBlogs.map((blog, idx) => (
                          <Link 
                            key={blog._id} 
                            to={`/blog/${blog._id}/edit`}
                            className="group flex items-center justify-between rounded-lg p-3 hover:bg-paper transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold shadow-sm ${
                                idx === 0 ? 'bg-flare text-white' : 
                                idx === 1 ? 'bg-flare/70 text-white' : 
                                idx === 2 ? 'bg-flare/40 text-white' : 
                                'bg-gray-100 text-muted shadow-none'
                              }`}>
                                #{idx + 1}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-ink group-hover:text-signal truncate max-w-[180px] sm:max-w-[220px] transition-colors">{blog.title}</p>
                                <p className="text-[12px] text-muted font-medium mt-0.5">
                                  Published {new Date(blog.publishedAt || blog.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted group-hover:text-ink transition-colors bg-paper group-hover:bg-gray-100 px-2 py-1 rounded-md">
                              <Eye size={12} strokeWidth={2.5} />
                              <span className="text-[12px] font-bold">{blog.views?.toLocaleString() || 0}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-32 flex-col items-center justify-center">
                        <p className="text-[13px] text-muted font-medium">No published posts yet.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
