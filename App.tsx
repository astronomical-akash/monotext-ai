
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor from './components/Editor';
import { Topic, Note, SubTopic, EditorSettings } from './types';
import { v4 as uuidv4 } from 'uuid'; // Since we can't install uuid, I'll use a simple generator function below

// Simple UUID generator since we are in a no-package environment for demo
const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_TOPICS: Topic[] = [
  { 
    id: '1', 
    name: 'Research', 
    subTopics: [
      { id: 's1', name: 'Market Analysis', topicId: '1' },
      { id: 's2', name: 'Competitors', topicId: '1' }
    ] 
  },
  { 
    id: '2', 
    name: 'Journal', 
    subTopics: [
      { id: 's3', name: 'Ideas', topicId: '2' }
    ] 
  }
];

const INITIAL_NOTES: Note[] = [
    {
        id: 'n1',
        title: 'Q1 Market Trends',
        content: '<p>The market is showing signs of <strong>strong growth</strong> in the tech sector.</p><ul><li>AI adoption is up 20%</li><li>Cloud costs are stabilizing</li></ul>',
        subTopicId: 's1',
        updatedAt: Date.now()
    }
];

const INITIAL_SETTINGS: EditorSettings = {
  h1Size: 36, // 2.25rem * 16
  h2Size: 28, // 1.75rem * 16
  pSize: 16   // 1rem
};

const App: React.FC = () => {
  const [topics, setTopics] = useState<Topic[]>(INITIAL_TOPICS);
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(INITIAL_SETTINGS);
  
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  // Mobile drawer state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Derived state
  const filteredNotes = useMemo(() => {
    if (!selectedSubTopicId) return [];
    return notes.filter(n => n.subTopicId === selectedSubTopicId).sort((a,b) => b.updatedAt - a.updatedAt);
  }, [notes, selectedSubTopicId]);

  const activeSubTopic = useMemo(() => {
    if (!selectedTopicId || !selectedSubTopicId) return undefined;
    const topic = topics.find(t => t.id === selectedTopicId);
    return topic?.subTopics.find(s => s.id === selectedSubTopicId);
  }, [topics, selectedTopicId, selectedSubTopicId]);

  const activeNote = useMemo(() => {
    return notes.find(n => n.id === selectedNoteId);
  }, [notes, selectedNoteId]);

  // Actions
  const handleAddTopic = (name: string) => {
    const newTopic: Topic = { id: generateId(), name, subTopics: [] };
    setTopics([...topics, newTopic]);
  };

  const handleAddSubTopic = (topicId: string, name: string) => {
    const newSub: SubTopic = { id: generateId(), name, topicId };
    setTopics(topics.map(t => {
      if (t.id === topicId) {
        return { ...t, subTopics: [...t.subTopics, newSub] };
      }
      return t;
    }));
  };

  const handleSelectSubTopic = (topicId: string, subTopicId: string) => {
    setSelectedTopicId(topicId);
    setSelectedSubTopicId(subTopicId);
    setSelectedNoteId(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleCreateNote = () => {
    if (!selectedSubTopicId) return;
    const newNote: Note = {
      id: generateId(),
      title: '',
      content: '<p></p>',
      subTopicId: selectedSubTopicId,
      updatedAt: Date.now()
    };
    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
  };

  const handleUpdateNote = (id: string, title: string, content: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, title, content, updatedAt: Date.now() } : n));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden text-black bg-white">
      {/* Sidebar - Hidden on mobile unless toggled */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block absolute md:relative z-20 h-full shadow-xl md:shadow-none`}>
          <Sidebar
            topics={topics}
            selectedTopicId={selectedTopicId}
            selectedSubTopicId={selectedSubTopicId}
            onSelectSubTopic={handleSelectSubTopic}
            onAddTopic={handleAddTopic}
            onAddSubTopic={handleAddSubTopic}
            settings={editorSettings}
            onUpdateSettings={setEditorSettings}
          />
      </div>
      
      {/* Backdrop for mobile */}
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/20 z-10" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top bar for mobile only to show menu */}
        {!sidebarOpen && !selectedNoteId && (
            <div className="md:hidden p-4 border-b border-gray-200 flex items-center">
                 <button onClick={() => setSidebarOpen(true)} className="mr-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                 </button>
                 <span className="font-bold">MonoText</span>
            </div>
        )}

        {selectedNoteId && activeNote ? (
          <Editor 
            note={activeNote} 
            onUpdate={handleUpdateNote} 
            onBack={() => setSelectedNoteId(null)}
            settings={editorSettings}
          />
        ) : (
          <NoteList 
            subTopic={activeSubTopic} 
            notes={filteredNotes} 
            onSelectNote={(id) => setSelectedNoteId(id)}
            onCreateNote={handleCreateNote}
            onBack={() => { setSidebarOpen(true); setSelectedSubTopicId(null); }}
          />
        )}
      </div>
    </div>
  );
};

export default App;
