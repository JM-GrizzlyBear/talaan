export interface Note {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

// What a user types into the note form
export interface NoteContent {
  title: string;
  body: string;
}
