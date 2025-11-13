-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('gerente', 'contador', 'cajero', 'bodeguero');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 10,
  supplier_id UUID REFERENCES public.suppliers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_movements table
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'salida')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table (boletas/facturas)
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT UNIQUE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('boleta', 'factura')),
  customer_name TEXT,
  customer_rut TEXT,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create accounting_records table
CREATE TABLE public.accounting_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type TEXT NOT NULL CHECK (record_type IN ('ingreso', 'egreso')),
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create action_logs table (historial)
CREATE TABLE public.action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('stock_bajo', 'deuda_vencida', 'sistema')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Everyone can view roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Only gerente can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'gerente'));

-- RLS Policies for suppliers
CREATE POLICY "Everyone can view suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Gerente and bodeguero can manage suppliers" ON public.suppliers FOR ALL USING (
  public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'bodeguero')
);

-- RLS Policies for products
CREATE POLICY "Everyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Gerente and bodeguero can manage products" ON public.products FOR ALL USING (
  public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'bodeguero')
);

-- RLS Policies for inventory_movements
CREATE POLICY "Everyone can view inventory movements" ON public.inventory_movements FOR SELECT USING (true);
CREATE POLICY "Authorized users can create movements" ON public.inventory_movements FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'gerente') OR 
  public.has_role(auth.uid(), 'bodeguero')
);

-- RLS Policies for sales
CREATE POLICY "Everyone can view sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Cajero and gerente can create sales" ON public.sales FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'cajero')
);

-- RLS Policies for accounting_records
CREATE POLICY "Contador and gerente can view accounting" ON public.accounting_records FOR SELECT USING (
  public.has_role(auth.uid(), 'gerente') OR public.has_role(auth.uid(), 'contador')
);
CREATE POLICY "Gerente can manage accounting" ON public.accounting_records FOR ALL USING (
  public.has_role(auth.uid(), 'gerente')
);

-- RLS Policies for action_logs
CREATE POLICY "Everyone can view action logs" ON public.action_logs FOR SELECT USING (true);
CREATE POLICY "System can insert logs" ON public.action_logs FOR INSERT WITH CHECK (true);

-- RLS Policies for alerts
CREATE POLICY "Everyone can view alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Gerente can manage alerts" ON public.alerts FOR ALL USING (public.has_role(auth.uid(), 'gerente'));

-- Create trigger function for profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create function to auto-update stock on inventory movements
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  IF NEW.movement_type = 'entrada' THEN
    UPDATE public.products 
    SET stock = stock + NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'salida' THEN
    UPDATE public.products 
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for stock updates
CREATE TRIGGER on_inventory_movement
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

-- Create function to check low stock and create alerts
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  IF NEW.stock <= NEW.min_stock THEN
    INSERT INTO public.alerts (alert_type, title, message, entity_id)
    VALUES (
      'stock_bajo',
      'Stock Bajo',
      'El producto ' || NEW.name || ' tiene stock bajo (' || NEW.stock || ' unidades)',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for low stock alerts
CREATE TRIGGER on_low_stock
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW 
  WHEN (NEW.stock <= NEW.min_stock AND OLD.stock > OLD.min_stock)
  EXECUTE FUNCTION public.check_low_stock();