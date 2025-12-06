import React, { useState, useEffect } from 'react';
import { Plus, Clock, File, Trash2 } from 'lucide-react';
import { supabase } from '../src/lib/supabase';

interface NoteListProps {
  selectedFolderId: string | null;
  onSelectNote: (noteId: string) => void;
  onBack: () => void;
}

const NoteList: React.FC<NoteListProps> = ({ selectedFolderId, onSelectNote, onBack }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedFolderId) return;

    const fetchNotes = async () => {
      setLoading(true);
      try {
        // 1. Get Folder Name
        const { data: folder } = await supabase
          .from('nodes')
          .select('title')
          .eq('id', selectedFolderId)
          .single();
        setFolderName(folder?.title || 'Unknown');

        // 2. Get Notes in Folder
        const { data: files, error } = await supabase
          .from('nodes')
          .select('*')
          .eq('parent_id', selectedFolderId)
          .eq('type', 'file')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotes(files || []);
      } catch (e) {
        console.error('Error loading notes:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [selectedFolderId]);

  const handleCreateNote = async () => {
    if (!selectedFolderId) return;
    try {
      const { data, error } = await supabase
        .from('nodes')
        .insert({
          title: 'Untitled Note',
          content: '<p></p>',
          type: 'file',
          parent_id: selectedFolderId
        })
        .select()
        .single();

      if (error) throw error;
      setNotes([data, ...notes]);
      onSelectNote(data.id);
    } catch (e) {
      alert('Failed to create note');
    }
  };

  const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('nodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotes(notes.filter(n => n.id !== id));
    } catch (e) {
      console.error('Error deleting note:', e);
      alert('Failed to delete note');
    }
  };

  if (!selectedFolderId) return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
      <div className="mb-4 bg-gray-100 p-4 rounded-full">
        <File size={32} />
      </div>
      <p>Select a folder from the sidebar to view your notes.</p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <button onClick={onBack} className="md:hidden text-xs text-gray-500 mb-2">← Back to Folders</button>
          <h2 className="text-2xl font-bold">{folderName}</h2>
          <p className="text-gray-500 text-sm">{notes.length} documents</p>
        </div>
        <button
          onClick={handleCreateNote}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded shadow hover:bg-gray-800 transition-colors"
        >
          <Plus size={18} /> New Doc
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
        {loading && <p className="text-gray-400 text-sm col-span-3">Loading notes...</p>}

        {!loading && notes.map(note => (
          <div
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            className="group border border-gray-200 rounded-lg p-5 hover:border-black cursor-pointer transition-all hover:shadow-md bg-white flex flex-col justify-between h-48 relative"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg truncate group-hover:text-blue-600 transition-colors flex-1 pr-2">
                  {note.title || 'Untitled'}
                </h3>
                <button
                  onClick={(e) => handleDeleteNote(e, note.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                  title="Delete Note"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="text-sm text-gray-400 line-clamp-3">
                {(note.content || '').replace(/<[^>]*>?/gm, '') || 'No content...'}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-4 pt-4 border-t border-gray-50">
              <Clock size={12} />
              {new Date(note.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}

        {!loading && notes.length === 0 && (
          <div
            onClick={handleCreateNote}
            className="border-2 border-dashed border-gray-200 rounded-lg p-5 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-gray-400 hover:text-gray-600 transition-all h-48"
          >
            <Plus size={24} className="mb-2" />
            <span className="text-sm">Create first note</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteList;