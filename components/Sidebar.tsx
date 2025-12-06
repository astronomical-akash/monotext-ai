import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Folder, FileText, FolderOpen, Settings, X, Pencil, Trash2 } from 'lucide-react';
import { EditorSettings } from '../types';
import { supabase } from '../src/lib/supabase';

// Define the Node structure matching our DB
interface Node {
  id: string;
  created_at: string;
  owner_id: string;
  parent_id: string | null;
  title: string;
  content: string | null;
  type: 'folder' | 'file';
}

interface SidebarProps {
  onSelectFolder: (folderId: string) => void;
  selectedFolderId: string | null;
  settings: EditorSettings;
  onUpdateSettings: (settings: EditorSettings) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onSelectFolder,
  selectedFolderId,
  settings,
  onUpdateSettings
}) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  // Creating State
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  const [addingChildTo, setAddingChildTo] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState('');

  // Fetch Data
  const fetchNodes = async () => {
    try {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('type', 'folder')
        .order('created_at', { ascending: true }); // Keep folders ordered

      if (error) throw error;
      setNodes(data || []);
    } catch (error) {
      console.error('Error fetching nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  // Actions
  const handleCreateNode = async (title: string, parentId: string | null) => {
    if (!title.trim()) return;

    try {
      const { data, error } = await supabase
        .from('nodes')
        .insert({
          title: title,
          type: 'folder',
          parent_id: parentId,
          content: ''
        })
        .select()
        .single();

      if (error) throw error;

      setNodes([...nodes, data]);

      if (parentId) {
        const next = new Set(expandedFolders);
        next.add(parentId);
        setExpandedFolders(next);
      }

    } catch (error) {
      console.error('Error creating node:', error);
      alert('Error creating folder');
    }
  };

  const handleDeleteNode = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this folder?')) return;

    try {
      const { error } = await supabase
        .from('nodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNodes(nodes.filter(n => n.id !== id));
      if (selectedFolderId === id) onSelectFolder('');
    } catch (error) {
      console.error('Error deleting node:', error);
      alert('Could not delete. Make sure it is empty!');
    }
  };

  const toggleFolder = (id: string) => {
    const next = new Set(expandedFolders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedFolders(next);
  };

  // Tree Building: Roots and Children
  const rootNodes = nodes.filter(n => !n.parent_id);
  const getChildren = (parentId: string) => nodes.filter(n => n.parent_id === parentId);

  return (
    <div className="w-64 bg-gray-50 border-r border-black h-full flex flex-col flex-shrink-0 relative">
      <div className="p-4 border-b border-black flex justify-between items-center bg-white">
        <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs">M</span>
          MonoText
        </h1>
        <button
          onClick={() => setShowAddRoot(!showAddRoot)}
          className="p-1 hover:bg-gray-200 rounded text-gray-600"
          title="Add Root Folder"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 pb-14">
        {/* Add Root Input */}
        {showAddRoot && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateNode(newTopicName, null);
              setNewTopicName('');
              setShowAddRoot(false);
            }}
            className="mb-2 p-2 bg-white border border-gray-200 rounded shadow-sm"
          >
            <input
              autoFocus
              type="text"
              placeholder="Folder Name..."
              className="w-full text-sm outline-none bg-transparent"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onBlur={() => !newTopicName && setShowAddRoot(false)}
            />
          </form>
        )}

        {loading ? (
          <div className="p-4 text-center text-xs text-gray-400">Loading folders...</div>
        ) : (
          <>
            {rootNodes.map(root => {
              const children = getChildren(root.id);
              const isExpanded = expandedFolders.has(root.id);

              return (
                <div key={root.id} className="mb-1 select-none">
                  <div
                    className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-200 transition-colors group"
                    onClick={() => toggleFolder(root.id)}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800 overflow-hidden">
                      {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                      <span className="truncate">{root.title}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDeleteNode(root.id, e)}
                        className="p-1 hover:text-red-600 text-gray-400"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                      {isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="ml-4 pl-2 border-l border-gray-300 mt-1 space-y-1">
                      {children.map(child => (
                        <div
                          key={child.id}
                          onClick={() => onSelectFolder(child.id)}
                          className={`flex items-center justify-between group p-2 rounded cursor-pointer text-sm ${selectedFolderId === child.id ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText size={14} />
                            <span className="truncate">{child.title}</span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteNode(child.id, e)}
                            className={`p-1 hover:text-red-500 ${selectedFolderId === child.id ? 'text-gray-400' : 'text-gray-300'} opacity-0 group-hover:opacity-100`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}

                      {addingChildTo === root.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleCreateNode(newChildName, root.id);
                            setNewChildName('');
                            setAddingChildTo(null);
                          }}
                          className="p-2"
                        >
                          <input
                            autoFocus
                            type="text"
                            placeholder="Subfolder..."
                            className="w-full text-xs outline-none border-b border-gray-400 bg-transparent"
                            value={newChildName}
                            onChange={(e) => setNewChildName(e.target.value)}
                            onBlur={() => setAddingChildTo(null)}
                          />
                        </form>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setAddingChildTo(root.id); }}
                          className="flex items-center gap-2 p-2 text-xs text-gray-400 hover:text-black w-full text-left"
                        >
                          <Plus size={12} /> Add Subfolder
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {!loading && rootNodes.length === 0 && !showAddRoot && (
          <div className="text-center mt-10 text-gray-400 text-sm p-4">
            No folders yet.<br />Click "+" to start.
          </div>
        )}
      </div>

      {/* Settings Button */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 absolute bottom-0 w-full flex justify-between items-center">
        <span className="text-xs text-gray-400">v2.0 • Supabase</span>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-gray-200 rounded text-gray-600 transition-colors"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Settings Modal (Simplified for brevity, reusing existing structure) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-black w-80 p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg">Settings</h3>
              <button onClick={() => setShowSettings(false)}><X size={18} /></button>
            </div>
            {/* Reusing update handler */}
            <div className="space-y-4">
              <label className="block text-sm">H1 Size</label>
              <input type="number"
                value={settings.h1Size}
                onChange={e => onUpdateSettings({ ...settings, h1Size: +e.target.value })}
                className="border p-1 w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
