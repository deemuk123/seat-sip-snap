import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Upload, Image, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fetchMenuItems } from "@/lib/supabase-orders";
import { createMenuItem, updateMenuItem, deleteMenuItem, fetchCategories, createCategory, deleteCategory } from "@/lib/supabase-manager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MenuItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
  availableFrom?: string;
  availableUntil?: string;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export default function MenuManager() {
  const [items, setItems] = useState<MenuItemData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItemData | null>(null);
  const [form, setForm] = useState({ name: "", price: "", description: "", category: "", image_url: "", available_from: "", available_until: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category management
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catLoading, setCatLoading] = useState(false);

  const loadCategories = async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch { /* ignore */ }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [data] = await Promise.all([fetchMenuItems(), loadCategories()]);
      setItems(data);
    } catch { toast.error("Failed to load menu"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const categoryNames = categories.map(c => c.name);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", price: "", description: "", category: categoryNames[0] || "", image_url: "", available_from: "", available_until: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItemData) => {
    setEditing(item);
    setForm({ name: item.name, price: String(item.price), description: item.description, category: item.category, image_url: item.imageUrl, available_from: item.availableFrom || "", available_until: item.availableUntil || "" });
    setDialogOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("menu-images").upload(path, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("menu-images").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const handleSave = async () => {
    const price = parseFloat(form.price);
    if (!form.name || isNaN(price) || price <= 0) { toast.error("Name and valid price required"); return; }
    try {
      if (editing) {
        await updateMenuItem(editing.id, { name: form.name, price, description: form.description, category: form.category, image_url: form.image_url, available_from: form.available_from || null, available_until: form.available_until || null });
        toast.success("Item updated");
      } else {
        await createMenuItem({ name: form.name, price, description: form.description, category: form.category, image_url: form.image_url, available_from: form.available_from || null, available_until: form.available_until || null });
        toast.success("Item created");
      }
      setDialogOpen(false);
      load();
    } catch { toast.error("Save failed"); }
  };

  const handleToggle = async (item: MenuItemData) => {
    try {
      await updateMenuItem(item.id, { available: !item.available });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
    } catch { toast.error("Toggle failed"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMenuItem(id);
      toast.success("Item deleted");
      load();
    } catch { toast.error("Delete failed"); }
  };

  const handleAddCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categoryNames.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }
    setCatLoading(true);
    try {
      await createCategory(trimmed);
      toast.success("Category added");
      setNewCatName("");
      await loadCategories();
    } catch { toast.error("Failed to add category"); }
    setCatLoading(false);
  };

  const handleDeleteCategory = async (cat: Category) => {
    const itemsInCat = items.filter(i => i.category === cat.name);
    if (itemsInCat.length > 0) {
      toast.error(`Cannot delete "${cat.name}" — ${itemsInCat.length} item(s) use it`);
      return;
    }
    try {
      await deleteCategory(cat.id, cat.name);
      toast.success("Category deleted");
      await loadCategories();
    } catch { toast.error("Failed to delete category"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-foreground">Menu Items</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setCatDialogOpen(true)}>
            <Tag className="w-4 h-4 mr-1" /> Categories
          </Button>
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <motion.div key={item.id} layout className="rounded-lg bg-card border border-border p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {item.imageUrl ? (
                  <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-secondary">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <Image className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
                    <span className="text-xs text-muted-foreground">₹{item.price}</span>
                    <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{item.category}</span>
                    {(item.availableFrom || item.availableUntil) && (
                      <span className="text-xs text-accent-foreground bg-accent px-1.5 py-0.5 rounded">🕐 {item.availableFrom || "00:00"}–{item.availableUntil || "23:59"}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={item.available} onCheckedChange={() => handleToggle(item)} />
                <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categoryNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Image</Label>
              <div className="space-y-2">
                {form.image_url && (
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-secondary">
                    <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-3.5 h-3.5 mr-1" />{uploading ? "Uploading…" : "Upload"}
                  </Button>
                  <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="Or paste URL…" className="flex-1 text-xs" />
                </div>
              </div>
            </div>
            <div>
              <Label>Availability Hours <span className="text-xs text-muted-foreground font-normal">(leave empty for all-day)</span></Label>
              <div className="flex gap-2 items-center">
                <Input type="time" value={form.available_from} onChange={e => setForm(f => ({ ...f, available_from: e.target.value }))} className="flex-1" placeholder="From" />
                <span className="text-muted-foreground text-sm">to</span>
                <Input type="time" value={form.available_until} onChange={e => setForm(f => ({ ...f, available_until: e.target.value }))} className="flex-1" placeholder="Until" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Categories Management Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="New category name"
                onKeyDown={e => e.key === "Enter" && handleAddCategory()}
              />
              <Button onClick={handleAddCategory} disabled={catLoading || !newCatName.trim()} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleDeleteCategory(cat)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No categories yet</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
  const [items, setItems] = useState<MenuItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItemData | null>(null);
  const [form, setForm] = useState({ name: "", price: "", description: "", category: "Popcorn", image_url: "", available_from: "", available_until: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMenuItems();
      setItems(data);
    } catch { toast.error("Failed to load menu"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", price: "", description: "", category: "Popcorn", image_url: "", available_from: "", available_until: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItemData) => {
    setEditing(item);
    setForm({ name: item.name, price: String(item.price), description: item.description, category: item.category, image_url: item.imageUrl, available_from: item.availableFrom || "", available_until: item.availableUntil || "" });
    setDialogOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("menu-images").upload(path, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("menu-images").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const handleSave = async () => {
    const price = parseFloat(form.price);
    if (!form.name || isNaN(price) || price <= 0) { toast.error("Name and valid price required"); return; }
    try {
      if (editing) {
        await updateMenuItem(editing.id, { name: form.name, price, description: form.description, category: form.category, image_url: form.image_url, available_from: form.available_from || null, available_until: form.available_until || null });
        toast.success("Item updated");
      } else {
        await createMenuItem({ name: form.name, price, description: form.description, category: form.category, image_url: form.image_url, available_from: form.available_from || null, available_until: form.available_until || null });
        toast.success("Item created");
      }
      setDialogOpen(false);
      load();
    } catch { toast.error("Save failed"); }
  };

  const handleToggle = async (item: MenuItemData) => {
    try {
      await updateMenuItem(item.id, { available: !item.available });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
    } catch { toast.error("Toggle failed"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMenuItem(id);
      toast.success("Item deleted");
      load();
    } catch { toast.error("Delete failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-foreground">Menu Items</h2>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <motion.div key={item.id} layout className="rounded-lg bg-card border border-border p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {item.imageUrl ? (
                  <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-secondary">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <Image className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
                    <span className="text-xs text-muted-foreground">₹{item.price}</span>
                    <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{item.category}</span>
                    {(item.availableFrom || item.availableUntil) && (
                      <span className="text-xs text-accent-foreground bg-accent px-1.5 py-0.5 rounded">🕐 {item.availableFrom || "00:00"}–{item.availableUntil || "23:59"}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={item.available} onCheckedChange={() => handleToggle(item)} />
                <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Image</Label>
              <div className="space-y-2">
                {form.image_url && (
                  <div className="w-full h-32 rounded-lg overflow-hidden bg-secondary">
                    <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-3.5 h-3.5 mr-1" />{uploading ? "Uploading…" : "Upload"}
                  </Button>
                  <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="Or paste URL…" className="flex-1 text-xs" />
                </div>
              </div>
            </div>
            <div>
              <Label>Availability Hours <span className="text-xs text-muted-foreground font-normal">(leave empty for all-day)</span></Label>
              <div className="flex gap-2 items-center">
                <Input type="time" value={form.available_from} onChange={e => setForm(f => ({ ...f, available_from: e.target.value }))} className="flex-1" placeholder="From" />
                <span className="text-muted-foreground text-sm">to</span>
                <Input type="time" value={form.available_until} onChange={e => setForm(f => ({ ...f, available_until: e.target.value }))} className="flex-1" placeholder="Until" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
