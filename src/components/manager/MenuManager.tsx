import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fetchMenuItems } from "@/lib/supabase-orders";
import { createMenuItem, updateMenuItem, deleteMenuItem } from "@/lib/supabase-manager";
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

const CATEGORIES = ["Popcorn", "Combos", "Beverages", "Snacks", "Premium", "Offers"];

export default function MenuManager() {
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
    setForm({ name: "", price: "", description: "", category: "Popcorn", image_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItemData) => {
    setEditing(item);
    setForm({ name: item.name, price: String(item.price), description: item.description, category: item.category, image_url: item.imageUrl });
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
        await updateMenuItem(editing.id, { name: form.name, price, description: form.description, category: form.category, image_url: form.image_url });
        toast.success("Item updated");
      } else {
        await createMenuItem({ name: form.name, price, description: form.description, category: form.category, image_url: form.image_url });
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
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
