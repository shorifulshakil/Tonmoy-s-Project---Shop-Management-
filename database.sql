-- ============================================================
--  ZEBRA OUTFIT — Sales & Stock Management
--  PostgreSQL / Supabase schema
-- ============================================================

-- ---------- 1. PRODUCTS ----------
CREATE TABLE public.products (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT      NOT NULL,
    description       TEXT,
    category          TEXT,
    size              TEXT      NOT NULL,            -- e.g. "S, M, L"
    price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    discount_percent  NUMERIC(5,2)  NOT NULL DEFAULT 0
                      CHECK (discount_percent BETWEEN 0 AND 100),
    stock             INTEGER   NOT NULL DEFAULT 0  CHECK (stock >= 0),
    image_url         TEXT,
    is_featured       BOOLEAN   NOT NULL DEFAULT FALSE,
    created_by        UUID      REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category    ON public.products(category);
CREATE INDEX idx_products_is_featured ON public.products(is_featured);
CREATE INDEX idx_products_discount    ON public.products(discount_percent) WHERE discount_percent > 0;

-- ---------- 2. SALES ----------
CREATE TABLE public.sales (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity     INTEGER       NOT NULL CHECK (quantity > 0),
    unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    total        NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    sale_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_product_id ON public.sales(product_id);
CREATE INDEX idx_sales_sale_date  ON public.sales(sale_date DESC);

-- ---------- 3. updated_at TRIGGER ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- 4. STOCK-DECREMENT TRIGGER ----------
-- Atomically validates stock and reduces it whenever a sale is inserted.
CREATE OR REPLACE FUNCTION public.handle_new_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    SELECT stock INTO current_stock
      FROM public.products
     WHERE id = NEW.product_id
     FOR UPDATE;

    IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    IF current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock (available: %)', current_stock;
    END IF;

    UPDATE public.products
       SET stock      = stock - NEW.quantity,
           updated_at = now()
     WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_new_sale
BEFORE INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.handle_new_sale();

-- ============================================================
--  ROW-LEVEL SECURITY
--  Admin-only app: any authenticated user has full access.
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales    ENABLE ROW LEVEL SECURITY;

-- products
CREATE POLICY "Authenticated can view products"
ON public.products FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Auth update products"
ON public.products FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth delete products"
ON public.products FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

-- sales (insert-only; no updates allowed to keep audit trail)
CREATE POLICY "Authenticated can view sales"
ON public.sales FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert sales"
ON public.sales FOR INSERT TO authenticated
WITH CHECK (auth.uid() = recorded_by);

CREATE POLICY "Auth delete sales"
ON public.sales FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

-- ============================================================
--  SAMPLE SEED DATA (optional)
-- ============================================================
-- INSERT INTO public.products (name, category, size, price, discount_percent, stock, is_featured)
-- VALUES
--   ('Zebra Stripe Shirt', 'Shirt',  'S, M, L',  1800, 10, 25, true),
--   ('Monochrome Blazer',  'Jacket', 'M, L, XL', 4500,  0, 12, false),
--   ('Safari Cargo Pants', 'Pants',  'M, L',     2200, 15,  8, true);
