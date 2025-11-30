
export interface Note {
  id: string;
  title: string;
  content: string; // HTML string
  subTopicId: string;
  updatedAt: number;
}

export interface SubTopic {
  id: string;
  name: string;
  topicId: string;
}

export interface Topic {
  id: string;
  name: string;
  subTopics: SubTopic[];
}

export interface EditorSettings {
  h1Size: number;
  h2Size: number;
  pSize: number;
}

export type ViewState = 'topic_list' | 'note_list' | 'editor';

export interface AppState {
  topics: Topic[];
  notes: Note[];
  selectedTopicId: string | null;
  selectedSubTopicId: string | null;
  selectedNoteId: string | null;
}
