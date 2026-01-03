-- Inventory Management System - Database Schema
-- Jalankan script ini di Supabase SQL Editor untuk menambahkan fitur inventaris

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL CHECK (condition IN ('Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang')),
  description TEXT,
  location TEXT,
  added_by UUID REFERENCES users(id) NOT NULL,
  added_by_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger to inventory table
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on inventory table
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view all inventory items
CREATE POLICY "Anyone can view all inventory items"
  ON inventory FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert inventory items
CREATE POLICY "Authenticated users can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (auth.uid() = added_by);

-- Policy: Users can update their own inventory items
CREATE POLICY "Users can update their own inventory"
  ON inventory FOR UPDATE
  USING (added_by = auth.uid());

-- Policy: Sekretaris can update all inventory items
CREATE POLICY "Sekretaris can update all inventory"
  ON inventory FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sekretaris'));

-- Policy: Users can delete their own inventory items
CREATE POLICY "Users can delete their own inventory"
  ON inventory FOR DELETE
  USING (added_by = auth.uid());

-- Policy: Sekretaris can delete all inventory items
CREATE POLICY "Sekretaris can delete all inventory"
  ON inventory FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'sekretaris'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_added_by ON inventory(added_by);
CREATE INDEX IF NOT EXISTS idx_inventory_condition ON inventory(condition);
CREATE INDEX IF NOT EXISTS idx_inventory_item_name ON inventory(item_name);

-- Sample data (optional - for testing)
-- INSERT INTO inventory (item_name, quantity, condition, description, location, added_by, added_by_name)
-- VALUES 
--   ('Microphone Wireless', 5, 'Baik', 'Shure SM58', 'Ruang Musik', 'user-uuid', 'Nama User'),
--   ('Stand Microphone', 10, 'Baik', 'Adjustable height', 'Ruang Musik', 'user-uuid', 'Nama User'),
--   ('Mixer Audio', 1, 'Rusak Ringan', 'Channel 3 tidak berfungsi', 'Studio', 'user-uuid', 'Nama User');
