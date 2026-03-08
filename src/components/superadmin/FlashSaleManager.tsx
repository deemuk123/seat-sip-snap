import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Zap, Clock, X } from "lucide-react";

interface FlashSale {
  id: string;
  title: string;
  menu_item_ids: string[];
  discount_type: string;
  discount_value: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

interface MenuItemOption {
  id: string;
  name: string;
  category: string;
}

const FlashSaleManager = () => {
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: salesData }, { data: itemsData }] = await Promise.all([
      supabase.from("flash_sales").select("*").order("created_at", { ascending: false }),
      supabase.from("menu_items").select("id, name, category").order("name"),
    ]);
    setSales((salesData as any[]) || []);
    setMenuItems((itemsData as MenuItemOption[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getSaleStatus = (sale: FlashSale) => {
    if (!sale.is_active) return "inactive";
    const now = new Date();
    const start = new Date(sale.start_time);
    const end = new Date(sale.end_time);
    if (now < start) return "upcoming";
    if (now > end) return "expired";
    return "active";
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: "🔥 Active" },
      upcoming: { variant: "secondary", label: "⏳ Upcoming" },
      expired: { variant: "outline", label: "Expired" },
      inactive: { variant: "destructive", label: "Inactive" },
    };
    const { variant, label } = map[status] || map.inactive;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const handleCreate = async () => {
    if (!title || selectedItems.length === 0 || !discountValue || !startTime || !endTime) {
      toast.error("Please fill all fields");
      return;
    }
    const { error } = await supabase.from("flash_sales").insert({
      title,
      menu_item_ids: selectedItems,
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
    } as any);
    if (error) { toast.error("Failed to create"); return; }
    toast.success("Flash sale created!");
    setShowForm(false);
    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setTitle("");
    setSelectedItems([]);
    setDiscountType("percentage");
    setDiscountValue("");
    setStartTime("");
    setEndTime("");
  };

  const toggleActive = async (sale: FlashSale) => {
    await supabase.from("flash_sales").update({ is_active: !sale.is_active } as any).eq("id", sale.id);
    fetchData();
  };

  const deleteSale = async (id: string) => {
    await supabase.from("flash_sales").delete().eq("id", id);
    toast.success("Deleted");
    fetchData();
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getItemName = (id: string) => menuItems.find(m => m.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold text-foreground">Flash Sales</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> New Sale
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create Flash Sale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Happy Hour - 50% off Popcorn!" />
            </div>

            <div>
              <Label>Select Menu Items</Label>
              <div className="mt-1.5 max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                {menuItems.map(item => (
                  <label key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="rounded"
                    />
                    <span className="text-foreground">{item.name}</span>
                    <span className="text-muted-foreground text-xs ml-auto">{item.category}</span>
                  </label>
                ))}
              </div>
              {selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedItems.map(id => (
                    <Badge key={id} variant="secondary" className="gap-1 text-xs">
                      {getItemName(id)}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => toggleItem(id)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount Type</Label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value</Label>
                <Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === "percentage" ? "e.g. 50" : "e.g. 30"} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate} className="gap-1.5"><Zap className="w-4 h-4" /> Create</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm py-4 text-center">Loading...</p>
      ) : sales.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No flash sales yet. Create one above!</p>
      ) : (
        <div className="space-y-3">
          {sales.map(sale => {
            const status = getSaleStatus(sale);
            return (
              <Card key={sale.id} className={status === "active" ? "border-primary/40 bg-primary/5" : ""}>
                <CardContent className="py-4 px-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-sm">{sale.title}</h3>
                        {statusBadge(status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {sale.discount_value}{sale.discount_type === "percentage" ? "%" : "₹"} off · {sale.menu_item_ids.length} items
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(sale.start_time).toLocaleString()} → {new Date(sale.end_time).toLocaleString()}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sale.menu_item_ids.slice(0, 5).map(id => (
                          <Badge key={id} variant="outline" className="text-[10px]">{getItemName(id)}</Badge>
                        ))}
                        {sale.menu_item_ids.length > 5 && <Badge variant="outline" className="text-[10px]">+{sale.menu_item_ids.length - 5} more</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={sale.is_active} onCheckedChange={() => toggleActive(sale)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSale(sale.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FlashSaleManager;
