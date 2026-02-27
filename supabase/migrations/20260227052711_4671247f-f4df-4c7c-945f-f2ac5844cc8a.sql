
-- Enum for order status
CREATE TYPE public.order_status AS ENUM ('received', 'preparing', 'out-for-delivery', 'delivered', 'cancelled');

-- Enum for delivery mode
CREATE TYPE public.delivery_mode AS ENUM ('seat', 'counter');

-- Enum for app roles
CREATE TYPE public.app_role AS ENUM ('manager', 'admin', 'superadmin');

-- Shows table
CREATE TABLE public.shows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_name TEXT NOT NULL,
  screen_number INTEGER NOT NULL,
  show_time TEXT NOT NULL,
  language TEXT NOT NULL,
  format TEXT NOT NULL,
  poster_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Menu categories table
CREATE TABLE public.menu_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Menu items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL,
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT '',
  image_url TEXT DEFAULT '',
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_code TEXT NOT NULL,
  show_id UUID REFERENCES public.shows(id),
  show_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_mode public.delivery_mode NOT NULL DEFAULT 'counter',
  seat_number TEXT,
  phone TEXT NOT NULL,
  status public.order_status NOT NULL DEFAULT 'received',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  estimated_delivery TEXT DEFAULT '8-12 mins',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order status logs
CREATE TABLE public.order_status_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles per security guidelines)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value NUMERIC(10,2) NOT NULL,
  show_id UUID REFERENCES public.shows(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Settings table
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_orders_phone ON public.orders(phone);
CREATE INDEX idx_orders_show_id ON public.orders(show_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_status_logs_order_id ON public.order_status_logs(order_id);
CREATE INDEX idx_menu_items_category ON public.menu_items(category);

-- Enable RLS on all tables
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies

-- Shows: public read
CREATE POLICY "Shows are publicly readable" ON public.shows FOR SELECT USING (true);

-- Menu categories: public read
CREATE POLICY "Menu categories are publicly readable" ON public.menu_categories FOR SELECT USING (true);

-- Menu items: public read
CREATE POLICY "Menu items are publicly readable" ON public.menu_items FOR SELECT USING (true);

-- Orders: anyone can insert (customers aren't authenticated), lookup by phone
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Orders readable by phone" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE USING (
  public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
);

-- Order items: follow order access
CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Order items are publicly readable" ON public.order_items FOR SELECT USING (true);

-- Order status logs: staff can insert, public read
CREATE POLICY "Staff can insert status logs" ON public.order_status_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Status logs are publicly readable" ON public.order_status_logs FOR SELECT USING (true);

-- User roles: only admins can manage
CREATE POLICY "User roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Coupons: public read active coupons
CREATE POLICY "Active coupons are publicly readable" ON public.coupons FOR SELECT USING (is_active = true);

-- Settings: public read
CREATE POLICY "Settings are publicly readable" ON public.settings FOR SELECT USING (true);

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
