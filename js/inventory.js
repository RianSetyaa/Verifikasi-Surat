// Inventory Management JavaScript
// Handles CRUD operations for inventory items

const InventoryManager = {
    /**
     * Load all inventory items with optional filters
     * @param {Object} filters - Optional filters (condition, search)
     * @returns {Promise<Array>} Array of inventory items
     */
    async loadInventory(filters = {}) {
        try {
            let query = auth.supabase
                .from('inventory')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply filters if provided
            if (filters.condition && filters.condition !== '') {
                query = query.eq('condition', filters.condition);
            }

            if (filters.search && filters.search.trim() !== '') {
                query = query.ilike('item_name', `%${filters.search.trim()}%`);
            }

            if (filters.addedBy) {
                query = query.eq('added_by', filters.addedBy);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading inventory:', error);
            throw error;
        }
    },

    /**
     * Add a new inventory item
     * @param {Object} itemData - Inventory item data
     * @returns {Promise<Object>} Created inventory item
     */
    async addInventoryItem(itemData) {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            const inventoryItem = {
                item_name: itemData.itemName,
                quantity: parseInt(itemData.quantity),
                condition: itemData.condition,
                description: itemData.description || null,
                location: itemData.location || null,
                added_by: user.id,
                added_by_name: itemData.addedByName || user.full_name
            };

            const { data, error } = await auth.supabase
                .from('inventory')
                .insert([inventoryItem])
                .select()
                .single();

            if (error) throw error;

            showToast('Inventaris berhasil ditambahkan!', 'success');
            return data;
        } catch (error) {
            console.error('Error adding inventory item:', error);
            showToast('Gagal menambahkan inventaris: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Update an existing inventory item
     * @param {string} id - Inventory item ID
     * @param {Object} itemData - Updated data
     * @returns {Promise<Object>} Updated inventory item
     */
    async updateInventoryItem(id, itemData) {
        try {
            const updateData = {
                item_name: itemData.itemName,
                quantity: parseInt(itemData.quantity),
                condition: itemData.condition,
                description: itemData.description || null,
                location: itemData.location || null
            };

            const { data, error } = await auth.supabase
                .from('inventory')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            showToast('Inventaris berhasil diupdate!', 'success');
            return data;
        } catch (error) {
            console.error('Error updating inventory item:', error);
            showToast('Gagal mengupdate inventaris: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Delete an inventory item
     * @param {string} id - Inventory item ID
     * @returns {Promise<void>}
     */
    async deleteInventoryItem(id) {
        try {
            const { error } = await auth.supabase
                .from('inventory')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showToast('Inventaris berhasil dihapus!', 'success');
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            showToast('Gagal menghapus inventaris: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Get inventory statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getInventoryStats() {
        try {
            const items = await this.loadInventory();

            const stats = {
                total: items.length,
                baik: items.filter(item => item.condition === 'Baik').length,
                rusakRingan: items.filter(item => item.condition === 'Rusak Ringan').length,
                rusakBerat: items.filter(item => item.condition === 'Rusak Berat').length,
                hilang: items.filter(item => item.condition === 'Hilang').length,
                totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
            };

            return stats;
        } catch (error) {
            console.error('Error getting inventory stats:', error);
            throw error;
        }
    },

    /**
     * Export inventory data to CSV
     * @param {Array} items - Inventory items to export
     * @param {string} filename - Output filename
     */
    exportInventoryToCSV(items, filename = 'inventaris-ukm.csv') {
        try {
            // CSV Headers
            const headers = ['No', 'Nama Barang', 'Kuantitas', 'Kondisi', 'Lokasi', 'Deskripsi', 'Ditambahkan Oleh', 'Tanggal'];

            // CSV Rows
            const rows = items.map((item, index) => {
                return [
                    index + 1,
                    item.item_name,
                    item.quantity,
                    item.condition,
                    item.location || '-',
                    item.description || '-',
                    item.added_by_name,
                    formatDate(item.created_at)
                ];
            });

            // Combine headers and rows
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('Data inventaris berhasil diexport!', 'success');
        } catch (error) {
            console.error('Error exporting inventory:', error);
            showToast('Gagal export inventaris: ' + error.message, 'error');
            throw error;
        }
    },

    /**
     * Get condition badge class
     * @param {string} condition - Condition value
     * @returns {string} Badge class
     */
    getConditionBadgeClass(condition) {
        const badgeMap = {
            'Baik': 'badge-success',
            'Rusak Ringan': 'badge-warning',
            'Rusak Berat': 'badge-danger',
            'Hilang': 'badge-secondary'
        };
        return badgeMap[condition] || 'badge-secondary';
    }
};
