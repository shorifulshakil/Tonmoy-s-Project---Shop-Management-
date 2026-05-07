-- ============================================================
--  ZEBRA OUTFIT — Sales & Stock Management
--  MySQL / MariaDB (XAMPP) Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS zebra_outfit;
USE zebra_outfit;

-- ============================================================
-- 1. PRODUCTS TABLE
-- ============================================================

CREATE TABLE products (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    size VARCHAR(100) NOT NULL,

    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),

    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0
        CHECK (discount_percent BETWEEN 0 AND 100),

    stock INT NOT NULL DEFAULT 0
        CHECK (stock >= 0),

    image_url TEXT,

    is_featured BOOLEAN NOT NULL DEFAULT FALSE,

    created_by CHAR(36),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category
ON products(category);

CREATE INDEX idx_products_is_featured
ON products(is_featured);

-- ============================================================
-- 2. SALES TABLE
-- ============================================================

CREATE TABLE sales (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    product_id CHAR(36) NOT NULL,

    quantity INT NOT NULL
        CHECK (quantity > 0),

    unit_price DECIMAL(10,2) NOT NULL
        CHECK (unit_price >= 0),

    total DECIMAL(12,2) NOT NULL
        CHECK (total >= 0),

    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    recorded_by CHAR(36),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_sales_product_id
ON sales(product_id);

CREATE INDEX idx_sales_sale_date
ON sales(sale_date);

-- ============================================================
-- 3. STOCK MANAGEMENT TRIGGER
-- ============================================================

DELIMITER $$

CREATE TRIGGER trg_handle_new_sale
BEFORE INSERT ON sales
FOR EACH ROW
BEGIN
    DECLARE current_stock INT;

    SELECT stock
    INTO current_stock
    FROM products
    WHERE id = NEW.product_id;

    IF current_stock IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Product not found';
    END IF;

    IF current_stock < NEW.quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient stock';
    END IF;

    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
END$$

DELIMITER ;

-- ============================================================
-- 4. SAMPLE DATA
-- ============================================================

INSERT INTO products (
    name,
    description,
    category,
    size,
    price,
    discount_percent,
    stock,
    image_url,
    is_featured
)
VALUES
(
    'Zebra Stripe Shirt',
    'Premium casual striped shirt',
    'Shirt',
    'S, M, L',
    1800.00,
    10,
    25,
    'https://example.com/shirt.jpg',
    TRUE
),
(
    'Monochrome Blazer',
    'Stylish black blazer',
    'Jacket',
    'M, L, XL',
    4500.00,
    0,
    12,
    'https://example.com/blazer.jpg',
    FALSE
),
(
    'Safari Cargo Pants',
    'Comfortable cargo pants',
    'Pants',
    'M, L',
    2200.00,
    15,
    8,
    'https://example.com/pants.jpg',
    TRUE
);