import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor from './components/Editor';
import { Auth } from './components/Auth';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { EditorSettings, Note } from './types';

const INITIAL_SETTINGS: EditorSettings = {
  h1Size: 36,
  h2Size: 28,
  pSize: 16
};

// Placeholder Note interface for Editor compatibility until fully refactored
// We need to map DB 'nodes' to 'Note' structure expected by components
const dbNodeToNote = (node: any): Note => ({
  id: node.id,
  title: node.title,
  content: node.content || '',
  subTopicId: node.parent_id || '', // mapping folder ID to subTopicId for compatibility
  updatedAt: new Date(node.created_at).getTime()
});

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [editorSettings, setEditorSettings] = useState<EditorSettings>(INITIAL_SETTINGS);

  // Navigation State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auth Handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Note Content when note is selected
  useEffect(() => {
    const fetchNote = async () => {
      if (!selectedNoteId) {
        setActiveNote(null);
        return;
      }

      const { data } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', selectedNoteId)
        .single();

      if (data) {
        setActiveNote(dbNodeToNote(data));
      }
    };

    fetchNote();
  }, [selectedNoteId]);

  const handleUpdateNote = async (id: string, title: string, content: string) => {
    // Optimistic update
    if (activeNote) {
      setActiveNote({ ...activeNote, title, content });
    }
    // Editor component handles the actual DB save, so we just update local state if needed
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  if (!session) return <Auth />;

  return (
    <div className="flex h-screen w-full overflow-hidden text-black bg-white">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block absolute md:relative z-20 h-full shadow-xl md:shadow-none`}>
        <Sidebar
          selectedFolderId={selectedFolderId}
          onSelectFolder={(id) => {
            setSelectedFolderId(id);
            setSelectedNoteId(null);
            if (window.innerWidth < 768) setSidebarOpen(false);
          }}
          settings={editorSettings}
          onUpdateSettings={setEditorSettings}
        />
      </div>

      {/* Backdrop */}
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/20 z-10" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
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
            selectedFolderId={selectedFolderId}
            onSelectNote={(id) => setSelectedNoteId(id)}
            onBack={() => { setSidebarOpen(true); setSelectedFolderId(null); }}
          />
        )}
      </div>
    </div>
  );
};

export default App;
