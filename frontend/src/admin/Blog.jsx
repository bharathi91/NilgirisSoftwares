import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useAdmin } from "./AdminApp";
import { Fields, Field, Panel, confirmAction } from "./fields";
import { errMsg } from "../lib/api";

const BLANK = { title: "", slug: "", excerpt: "", content: "<p></p>", cover: "", video: "", category: "", tags: [], author: { name: "", bio: "", avatar: "" }, status: "draft", publish_at: "", featured: false, seo: { title: "", description: "", ogImage: "" } };
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Editor({ post, onBack }) {
  const { api, can } = useAdmin();
  const [p, setP] = useState({ ...BLANK, ...post, publish_at: post.publish_at ? post.publish_at.slice(0, 16) : "" });
  const save = async () => {
    if (!p.title) return toast.error("Title is required");
    const body = { ...p, slug: p.slug || slugify(p.title), publish_at: p.publish_at ? new Date(p.publish_at).toISOString() : null };
    try { const r = p.id ? await api.put(`/admin/posts/${p.id}`, body) : await api.post("/admin/posts", body); setP({ ...r.data, publish_at: r.data.publish_at ? r.data.publish_at.slice(0, 16) : "" }); toast.success("Post saved"); } catch (e) { toast.error(errMsg(e)); }
  };
  const statusOpts = [{ value: "draft", label: "Draft" }, ...(can("blog.publish") ? [{ value: "published", label: "Published" }, { value: "scheduled", label: "Scheduled" }] : [])];
  return <div className="space-y-5" data-testid="post-editor">
    <div className="flex gap-2"><Button variant="ghost" onClick={onBack} data-testid="post-back"><ArrowLeft size={15} className="mr-1" />All posts</Button><Button className="ml-auto" onClick={save} data-testid="post-save"><Save size={15} className="mr-1" />Save post</Button></div>
    <div className="grid lg:grid-cols-[1fr_360px] gap-5">
      <Panel><Fields fields={[{ k: "title", label: "Title" }, { k: "excerpt", label: "Excerpt", type: "textarea" }, { k: "content", label: "Content", type: "rich" }]} obj={p} prefix="post-" onChange={(v) => setP({ ...v, slug: p.id || p.slug ? v.slug : slugify(v.title) })} /></Panel>
      <div className="space-y-5">
        <Panel title="Publishing"><div className="space-y-4">
          <Field f={{ k: "status", label: "Status", type: "select", options: statusOpts }} value={p.status} onChange={(v) => setP({ ...p, status: v })} testid="post-status" />
          <label className="block"><span className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Publish date / schedule</span>
            <input type="datetime-local" className="admin-select" value={p.publish_at || ""} onChange={(e) => setP({ ...p, publish_at: e.target.value })} data-testid="post-publish-at" /></label>
          <Fields fields={[{ k: "slug", label: "URL slug" }, { k: "category", label: "Category" }, { k: "tags", label: "Tags", type: "tags" }, { k: "featured", label: "Featured article", type: "switch" }, { k: "cover", label: "Cover image", type: "image" }, { k: "video", label: "Video", type: "video" }]} obj={p} prefix="post-" onChange={setP} /></div></Panel>
        <Panel title="Author"><Fields fields={[{ k: "name", label: "Name" }, { k: "bio", label: "Bio", type: "textarea" }, { k: "avatar", label: "Avatar", type: "image" }]} obj={p.author} prefix="author-" onChange={(v) => setP({ ...p, author: v })} /></Panel>
        <Panel title="SEO"><Fields fields={[{ k: "title", label: "SEO title" }, { k: "description", label: "Meta description", type: "textarea" }, { k: "ogImage", label: "Social image", type: "image" }]} obj={p.seo} prefix="pseo-" onChange={(v) => setP({ ...p, seo: v })} /></Panel>
      </div></div></div>;
}

export default function Blog() {
  const { api, can } = useAdmin();
  const [items, setItems] = useState([]), [edit, setEdit] = useState(null);
  const load = () => api.get("/admin/posts").then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { if (!edit) load(); }, [edit]); // eslint-disable-line
  const open = async (id) => setEdit((await api.get(`/admin/posts/${id}`)).data);
  if (edit) return <Editor post={edit} onBack={() => setEdit(null)} />;
  const live = (p) => p.status !== "draft" && p.publish_at && new Date(p.publish_at) <= new Date();
  return <Panel title={`Blog posts (${items.length})`} desc="Posts publish independently of the page draft. Scheduled posts go live automatically at their date."
    actions={can("blog.write") && <Button onClick={() => setEdit({ ...BLANK })} data-testid="post-new"><Plus size={15} className="mr-1" />New post</Button>}>
    <div className="space-y-2" data-testid="posts-list">{items.map((p) => <div key={p.id} className="flex items-center gap-3 rounded-xl border p-3">
      <button className="flex-1 text-left" onClick={() => open(p.id)} data-testid={`post-row-${p.slug}`}><p className="font-medium">{p.title}</p><p className="text-xs text-muted-foreground">/blog/{p.slug} · {p.category || "uncategorised"} · updated {new Date(p.updated_at).toLocaleDateString()}</p></button>
      {p.featured && <Badge variant="outline">Featured</Badge>}
      <Badge className={live(p) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}>{live(p) ? "Live" : p.status === "scheduled" ? "Scheduled" : p.status === "published" ? "Pending" : "Draft"}</Badge>
      {can("blog.publish") && <Button size="icon" variant="ghost" className="text-red-400" onClick={async () => { if (await confirmAction(`Delete "${p.title}"?`)) { await api.delete(`/admin/posts/${p.id}`); load(); } }} data-testid={`post-del-${p.slug}`}><Trash2 size={14} /></Button>}
    </div>)}{!items.length && <p className="text-sm text-muted-foreground">No posts yet.</p>}</div></Panel>;
}
