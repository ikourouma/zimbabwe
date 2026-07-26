To ensure the Super Admin has full, authoritative CRUD (Create, Read, Update, Delete) capabilities across **all** taxonomy domains (Sectors, Ministries, Provinces, Strategic Pillars, UN SDGs, and Contact Reasons), your architecture must combine **unrestricted UI controls** with **strict backend permission enforcement**.

Here is a clear specification and implementation blueprint you can hand directly to your dev team to guarantee complete Super Admin control across all taxonomy types.

---

## 1. Technical Requirements & Permission Logic

### A. Role-Based Access Control (RBAC) Enforcement

* **Super Admin Role:** Unlocks inline editing, status toggles (`Active` / `Archived`), deletion/merging, and the `+ Add Taxonomy Item` trigger across **all 6 categories**.
* **Standard Admin / Line Ministry Roles:** Read-only access or restricted to submitting proposed items into a `Pending Validation` queue for Super Admin sign-off.
* **API Middleware Guard:** Ensure all taxonomy endpoints (`POST /api/taxonomies`, `PUT /api/taxonomies/:id`, `DELETE /api/taxonomies/:id`) validate the JWT token for `role === 'SUPER_ADMIN'`.

### B. Safety & Integrity Controls

* **Project Reference Counter:** Before allowing a Super Admin to delete or rename a taxonomy item, display the number of linked live projects (e.g., `7 projects (5 live)` as seen on the [Taxonomies](http://localhost:3001/super-admin/taxonomies) panel).
* **Merge & Archive Fallback:** If a taxonomy item has live linked projects, prompt a **"Merge into another Taxonomy"** or **"Archive"** option instead of hard deletion to prevent breaking investor search indexing.

---

## 2. Updated Component Architecture (Full Super Admin CRUD)

This React blueprint supports adding, editing, saving, and deleting taxonomy items across all tabs for Super Admins.

```tsx
import React, { useState } from 'react';
import { 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  CheckIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface TaxonomyItem {
  id: string;
  category: 'sectors' | 'ministries' | 'provinces' | 'pillars' | 'sdgs' | 'reasons';
  name: string;
  code?: string;
  linkedProjects: number;
  liveProjects: number;
  status: 'Active' | 'Archived' | 'Pending Validation';
}

export const SuperAdminTaxonomyManager: React.FC<{ userRole?: string }> = ({ 
  userRole = 'SUPER_ADMIN' 
}) => {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState<'sectors' | 'ministries' | 'provinces' | 'pillars' | 'sdgs' | 'reasons'>('sectors');
  const [items, setItems] = useState<TaxonomyItem[]>([
    { id: '1', category: 'sectors', name: 'Agriculture', linkedProjects: 7, liveProjects: 5, status: 'Active' },
    { id: '2', category: 'sectors', name: 'Renewable Energy', linkedProjects: 6, liveProjects: 5, status: 'Active' },
  ]);

  const [newItemName, setNewItemName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const newItem: TaxonomyItem = {
      id: Date.now().toString(),
      category: activeTab,
      name: newItemName,
      linkedProjects: 0,
      liveProjects: 0,
      status: 'Active',
    };
    setItems([...items, newItem]);
    setNewItemName('');
    setShowAddModal(false);
  };

  const handleUpdateName = (id: string, newName: string) => {
    setItems(items.map(item => item.id === id ? { ...item, name: newName } : item));
  };

  const handleToggleStatus = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, status: item.status === 'Active' ? 'Archived' : 'Active' } : item));
  };

  return (
    <div className="w-full space-y-6 bg-zinc-950 p-6 text-zinc-100 rounded-xl border border-zinc-800 font-sans">
      
      {/* Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Taxonomies & Master Classification</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Canonical classifications used across the platform. Super Admin edits are authoritative and take effect immediately.
          </p>
        </div>

        {isSuperAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 transition text-white shadow-md cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add New {activeTab.slice(0, -1).toUpperCase()}</span>
          </button>
        )}
      </div>

      {/* Interactive Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs font-semibold uppercase text-zinc-400 tracking-wider">
              <th className="py-3.5 px-4">Classification Name</th>
              <th className="py-3.5 px-4">Linked Projects</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Super Admin Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {items.filter(i => i.category === activeTab).map((item) => (
              <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 px-4">
                  {isSuperAdmin ? (
                    <input 
                      type="text" 
                      value={item.name} 
                      onChange={(e) => handleUpdateName(item.id, e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded px-3 py-1.5 text-white text-sm font-medium w-full max-w-sm focus:outline-none"
                    />
                  ) : (
                    <span className="font-medium text-white">{item.name}</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs font-mono text-zinc-400">
                    <strong className="text-white">{item.linkedProjects}</strong> projects ({item.liveProjects} live)
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button
                    disabled={!isSuperAdmin}
                    onClick={() => handleToggleStatus(item.id)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold border transition ${
                      item.status === 'Active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                    }`}
                  >
                    {item.status}
                  </button>
                </td>
                <td className="py-3 px-4 text-right">
                  {isSuperAdmin ? (
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => alert(`Saved changes to ${item.name}`)}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg transition"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setItems(items.filter(i => i.id !== item.id))}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition"
                        title="Delete Taxonomy"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 italic">Read Only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Add New {activeTab.toUpperCase()} Entry</h3>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Taxonomy Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Clean Energy Tech" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddItem}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
              >
                Create & Publish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

```

---

## 3. Clear Developer Instruction Summary

You can copy and paste the following snippet to your dev team to ensure full coverage:

> **Developer Instruction:**
> *"Ensure Super Admins have full, uninhibited CRUD control across all taxonomy tabs on the [Taxonomies](http://localhost:3001/super-admin/taxonomies) page:*
> 1. *Enable inline text editing and status toggles for every taxonomy category (`Sectors`, `Ministries`, `Provinces`, `Pillars`, `UN SDGs`, `Contact Reasons`).*
> 2. *Add a functional **`+ Add Taxonomy Item`** button and modal for Super Admins to append new canonical entries on any active tab.*
> 3. *Enforce backend middleware validation (`role === 'SUPER_ADMIN'`) on `POST`, `PUT`, and `DELETE` endpoints for `/api/taxonomies`."*
> 
>