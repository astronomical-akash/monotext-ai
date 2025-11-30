
import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Folder, FileText, FolderOpen, Settings, X } from 'lucide-react';
import { Topic, SubTopic, EditorSettings } from '../types';

interface SidebarProps {
  topics: Topic[];
  selectedTopicId: string | null;
  selectedSubTopicId: string | null;
  onSelectSubTopic: (topicId: string, subTopicId: string) => void;
  onAddTopic: (name: string) => void;
  onAddSubTopic: (topicId: string, name: string) => void;
  settings: EditorSettings;
  onUpdateSettings: (settings: EditorSettings) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  topics,
  selectedTopicId,
  selectedSubTopicId,
  onSelectSubTopic,
  onAddTopic,
  onAddSubTopic,
  settings,
  onUpdateSettings
}) => {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [newTopicName, setNewTopicName] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Helper for inline subtopic adding
  const [addingSubTopicTo, setAddingSubTopicTo] = useState<string | null>(null);
  const [newSubTopicName, setNewSubTopicName] = useState('');

  const toggleTopic = (id: string) => {
    const next = new Set(expandedTopics);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedTopics(next);
  };

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopicName.trim()) {
      onAddTopic(newTopicName);
      setNewTopicName('');
      setShowAddTopic(false);
    }
  };

  const handleCreateSubTopic = (e: React.FormEvent, topicId: string) => {
    e.preventDefault();
    if (newSubTopicName.trim()) {
      onAddSubTopic(topicId, newSubTopicName);
      setNewSubTopicName('');
      setAddingSubTopicTo(null);
      // Ensure expanded
      const next = new Set(expandedTopics);
      next.add(topicId);
      setExpandedTopics(next);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-black h-full flex flex-col flex-shrink-0 relative">
      <div className="p-4 border-b border-black flex justify-between items-center bg-white">
        <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
            <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs">M</span>
            MonoText
        </h1>
        <button 
            onClick={() => setShowAddTopic(!showAddTopic)} 
            className="p-1 hover:bg-gray-200 rounded"
            title="Add Topic"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 pb-14">
        {showAddTopic && (
          <form onSubmit={handleCreateTopic} className="mb-2 p-2 bg-white border border-gray-200 rounded shadow-sm">
            <input
              autoFocus
              type="text"
              placeholder="Topic Name..."
              className="w-full text-sm outline-none bg-transparent"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onBlur={() => !newTopicName && setShowAddTopic(false)}
            />
          </form>
        )}

        {topics.map(topic => {
            const isExpanded = expandedTopics.has(topic.id);
            const isSelected = selectedTopicId === topic.id;

            return (
                <div key={topic.id} className="mb-1 select-none">
                    <div 
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-gray-200' : 'hover:bg-gray-200'}`}
                        onClick={() => toggleTopic(topic.id)}
                    >
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-800 overflow-hidden">
                             {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
                             <span className="truncate">{topic.name}</span>
                        </div>
                        {isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
                    </div>

                    {isExpanded && (
                        <div className="ml-4 pl-2 border-l border-gray-300 mt-1 space-y-1">
                            {topic.subTopics.map(sub => (
                                <div 
                                    key={sub.id}
                                    onClick={() => onSelectSubTopic(topic.id, sub.id)}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${selectedSubTopicId === sub.id ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                                >
                                    <FileText size={14} />
                                    <span className="truncate">{sub.name}</span>
                                </div>
                            ))}
                            
                            {addingSubTopicTo === topic.id ? (
                                <form onSubmit={(e) => handleCreateSubTopic(e, topic.id)} className="p-2">
                                     <input
                                        autoFocus
                                        type="text"
                                        placeholder="Subtopic..."
                                        className="w-full text-xs outline-none border-b border-gray-400 bg-transparent"
                                        value={newSubTopicName}
                                        onChange={(e) => setNewSubTopicName(e.target.value)}
                                        onBlur={() => setAddingSubTopicTo(null)}
                                    />
                                </form>
                            ) : (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setAddingSubTopicTo(topic.id); }}
                                    className="flex items-center gap-2 p-2 text-xs text-gray-400 hover:text-black w-full text-left"
                                >
                                    <Plus size={12} /> Add Subtopic
                                </button>
                            )}
                        </div>
                    )}
                </div>
            );
        })}
        
        {topics.length === 0 && !showAddTopic && (
            <div className="text-center mt-10 text-gray-400 text-sm p-4">
                No topics yet.<br/>Click "+" to start.
            </div>
        )}
      </div>
      
      {/* Footer / Settings Button */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 absolute bottom-0 w-full flex justify-between items-center">
        <span className="text-xs text-gray-400">v1.1.0 • AI • KaTeX</span>
        <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-200 rounded text-gray-600 transition-colors"
            title="Settings"
        >
            <Settings size={18} />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl border border-black w-80 p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="font-bold text-lg">Appearance</h3>
                    <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-100 rounded-full">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Heading 1 Size (px)</label>
                        <input 
                            type="number" 
                            value={settings.h1Size} 
                            onChange={(e) => onUpdateSettings({...settings, h1Size: Number(e.target.value)})}
                            className="w-full border p-2 rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Heading 2 Size (px)</label>
                        <input 
                            type="number" 
                            value={settings.h2Size} 
                            onChange={(e) => onUpdateSettings({...settings, h2Size: Number(e.target.value)})}
                            className="w-full border p-2 rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Paragraph Size (px)</label>
                        <input 
                            type="number" 
                            value={settings.pSize} 
                            onChange={(e) => onUpdateSettings({...settings, pSize: Number(e.target.value)})}
                            className="w-full border p-2 rounded"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={() => setShowSettings(false)} 
                        className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
