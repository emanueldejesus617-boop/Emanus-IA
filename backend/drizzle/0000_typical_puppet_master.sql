CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"student_id" text NOT NULL,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"subject" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"subject" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_results" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject" text NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer DEFAULT 5 NOT NULL,
	"questions" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"media_data" text,
	"media_type" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week_data" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_availabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_completed_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject" text NOT NULL,
	"topic_name" text NOT NULL,
	"completed_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"classe" text,
	"curso" text,
	"subjects" text,
	"xp" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_login_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_availabilities" ADD CONSTRAINT "tutor_availabilities_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_completed_topics" ADD CONSTRAINT "user_completed_topics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;