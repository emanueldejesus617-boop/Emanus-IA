import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('student'),
  classe: text('classe'),
  curso: text('curso'),
  subjects: text('subjects'), // JSON text representing string[]
  xp: integer('xp').notNull().default(0),
  streak: integer('streak').notNull().default(0),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull(),
});

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subject: text('subject'),
  createdAt: text('created_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'model'
  content: text('content').notNull(),
  mediaData: text('media_data'),
  mediaType: text('media_type'),
  createdAt: text('created_at').notNull(),
});

export const studyPlans = sqliteTable('study_plans', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weekData: text('week_data').notNull(), // JSON text representing study plan grid
  createdAt: text('created_at').notNull(),
});

export const examResults = sqliteTable('exam_results', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  score: integer('score').notNull(), // Number of correct answers (0-5)
  totalQuestions: integer('total_questions').notNull().default(5),
  questions: text('questions').notNull(), // JSON text representing the questions, options, key and answers
  createdAt: text('created_at').notNull(),
});

export const userCompletedTopics = sqliteTable('user_completed_topics', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  topicName: text('topic_name').notNull(),
  completedAt: text('completed_at').notNull(),
});

export const tutorAvailabilities = sqliteTable('tutor_availabilities', {
  id: text('id').primaryKey(),
  tutorId: text('tutor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0 for Sunday, 1 for Monday, etc.
  startTime: text('start_time').notNull(), // e.g. "14:00"
  endTime: text('end_time').notNull(), // e.g. "16:00"
});

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  tutorId: text('tutor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  startTime: text('start_time').notNull(), // "14:00"
  endTime: text('end_time').notNull(), // "15:00"
  status: text('status').notNull().default('scheduled'), // 'scheduled', 'rescheduled', 'cancelled'
  subject: text('subject'), // optional subject of the class
  createdAt: text('created_at').notNull(),
});
