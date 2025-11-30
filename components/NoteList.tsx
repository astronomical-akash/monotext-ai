import React from 'react';
import { Plus, Clock, File } from 'lucide-react';
import { Note, SubTopic } from '../types';

interface NoteListProps {
  subTopic: SubTopic | undefined;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onBack: () => void; // For mobile
}

const NoteList: React.FC<NoteListProps> = ({ subTopic, notes, onSelectNote, onCreateNote, onBack }) => {
  if (!subTopic) return <div className="flex-1 flex items-center justify-center text-gray-400">Select a subtopic to view notes</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
            <button onClick={onBack} className="md:hidden text-xs text-gray-500 mb-2">← Back to Topics</button>
            <h2 className="text-2xl font-bold">{subTopic.name}</h2>
            <p className="text-gray-500 text-sm">{notes.length} documents</p>
        </div>
        <button 
          onClick={onCreateNote}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded shadow hover:bg-gray-800 transition-colors"
        >
          <Plus size={18} /> New Doc
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
        {notes.map(note => (
            <div 
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className="group border border-gray-200 rounded-lg p-5 hover:border-black cursor-pointer transition-all hover:shadow-md bg-white flex flex-col justify-between h-48"
            >
                <div>
                    <h3 className="font-semibold text-lg mb-2 truncate group-hover:text-blue-600 transition-colors">
                        {note.title || 'Untitled'}
                    </h3>
                    <div className="text-sm text-gray-400 line-clamp-3">
                        {note.content.replace(/<[^>]*>?/gm, '') || 'No content...'}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-4 pt-4 border-t border-gray-50">
                    <Clock size={12} />
                    {new Date(note.updatedAt).toLocaleDateString()}
                </div>
            </div>
        ))}
        
        {notes.length === 0 && (
            <div 
                onClick={onCreateNote}
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