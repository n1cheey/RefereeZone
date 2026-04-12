


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select
    case role
      when 'Table' then 'TO'
      when 'Stuff' then 'Staff'
      else role
    end
  from public.profiles
  where id = auth.uid()
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."allowed_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "allowed_role" "text" NOT NULL,
    "display_name" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "license_number" "text" DEFAULT 'Pending'::"text" NOT NULL,
    CONSTRAINT "allowed_access_allowed_role_check" CHECK (("allowed_role" = ANY (ARRAY['Instructor'::"text", 'TO Supervisor'::"text", 'TO'::"text", 'Table'::"text", 'Referee'::"text", 'Staff'::"text", 'Stuff'::"text"])))
);


ALTER TABLE "public"."allowed_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "audience_role" "text" NOT NULL,
    "message" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message_az" "text" DEFAULT ''::"text" NOT NULL,
    "message_en" "text" DEFAULT ''::"text" NOT NULL,
    "message_ru" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "announcements_audience_role_check" CHECK (("audience_role" = ANY (ARRAY['Referee'::"text", 'TO'::"text"])))
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "youtube_url" "text" NOT NULL,
    "commentary" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."news_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nomination_referees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nomination_id" "uuid" NOT NULL,
    "referee_id" "uuid" NOT NULL,
    "slot_number" integer NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "responded_at" timestamp with time zone,
    "report_deadline_at" timestamp with time zone,
    CONSTRAINT "nomination_referees_slot_number_check" CHECK ((("slot_number" >= 1) AND ("slot_number" <= 3))),
    CONSTRAINT "nomination_referees_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Accepted'::"text", 'Declined'::"text"])))
);


ALTER TABLE "public"."nomination_referees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nomination_tos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nomination_id" "uuid" NOT NULL,
    "to_id" "uuid" NOT NULL,
    "slot_number" integer NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "responded_at" timestamp with time zone,
    CONSTRAINT "nomination_tos_slot_number_check" CHECK ((("slot_number" >= 1) AND ("slot_number" <= 4))),
    CONSTRAINT "nomination_tos_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Accepted'::"text", 'Declined'::"text"])))
);


ALTER TABLE "public"."nomination_tos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nominations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "game_code" "text" NOT NULL,
    "teams" "text" NOT NULL,
    "match_date" "date" NOT NULL,
    "match_time" time without time zone NOT NULL,
    "venue" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "final_score" "text",
    "match_video_url" "text",
    "match_protocol_url" "text",
    "referee_fee" numeric(10,2),
    "to_fee" numeric(10,2)
);


ALTER TABLE "public"."nominations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "photo_url" "text" DEFAULT 'https://picsum.photos/seed/referee/300/300'::"text" NOT NULL,
    "license_number" "text" NOT NULL,
    "allowed_access_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['Instructor'::"text", 'TO Supervisor'::"text", 'TO'::"text", 'Table'::"text", 'Referee'::"text", 'Staff'::"text", 'Stuff'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ranking_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referee_id" "uuid" NOT NULL,
    "game_code" "text" NOT NULL,
    "evaluation_date" "date" NOT NULL,
    "score" integer NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ranking_evaluations_score_check" CHECK (("score" = ANY (ARRAY['-1'::integer, 0, 1])))
);


ALTER TABLE "public"."ranking_evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ranking_match_performance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referee_id" "uuid" NOT NULL,
    "game_code" "text" NOT NULL,
    "evaluation_date" "date" NOT NULL,
    "physical_fitness" integer DEFAULT 0 NOT NULL,
    "mechanics" integer DEFAULT 0 NOT NULL,
    "iot" integer DEFAULT 0 NOT NULL,
    "criteria_score" integer DEFAULT 0 NOT NULL,
    "teamwork_score" integer DEFAULT 0 NOT NULL,
    "game_control" integer DEFAULT 0 NOT NULL,
    "new_philosophy" integer DEFAULT 0 NOT NULL,
    "communication" integer DEFAULT 0 NOT NULL,
    "external_evaluation" integer DEFAULT 0 NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "ranking_match_performance_communication_check" CHECK (("communication" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_match_performance_criteria_score_check" CHECK (("criteria_score" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_match_performance_external_evaluation_check" CHECK (("external_evaluation" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_match_performance_game_control_check" CHECK (("game_control" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_match_performance_iot_check" CHECK (("iot" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_match_performance_mechanics_check" CHECK (("mechanics" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_match_performance_new_philosophy_check" CHECK (("new_philosophy" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_match_performance_physical_fitness_check" CHECK (("physical_fitness" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_match_performance_teamwork_score_check" CHECK (("teamwork_score" = ANY (ARRAY['-1'::integer, 0, 1])))
);


ALTER TABLE "public"."ranking_match_performance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ranking_performance" (
    "referee_id" "uuid" NOT NULL,
    "physical_fitness" integer DEFAULT 0 NOT NULL,
    "mechanics" integer DEFAULT 0 NOT NULL,
    "iot" integer DEFAULT 0 NOT NULL,
    "criteria_score" integer DEFAULT 0 NOT NULL,
    "teamwork_score" integer DEFAULT 0 NOT NULL,
    "game_control" integer DEFAULT 0 NOT NULL,
    "new_philosophy" integer DEFAULT 0 NOT NULL,
    "communication" integer DEFAULT 0 NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "external_evaluation" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "ranking_performance_communication_check" CHECK (("communication" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_performance_criteria_score_check" CHECK (("criteria_score" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_performance_game_control_check" CHECK (("game_control" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_performance_iot_check" CHECK (("iot" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_performance_mechanics_check" CHECK (("mechanics" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_performance_new_philosophy_check" CHECK (("new_philosophy" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_performance_physical_fitness_check" CHECK (("physical_fitness" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_performance_teamwork_score_check" CHECK (("teamwork_score" = ANY (ARRAY['-1'::integer, 0, 1])))
);


ALTER TABLE "public"."ranking_performance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ranking_to_match_performance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "to_id" "uuid" NOT NULL,
    "game_code" "text" NOT NULL,
    "evaluation_date" "date" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "physical_fitness" integer DEFAULT 0 NOT NULL,
    "mechanics" integer DEFAULT 0 NOT NULL,
    "iot" integer DEFAULT 0 NOT NULL,
    "criteria_score" integer DEFAULT 0 NOT NULL,
    "teamwork_score" integer DEFAULT 0 NOT NULL,
    "game_control" integer DEFAULT 0 NOT NULL,
    "new_philosophy" integer DEFAULT 0 NOT NULL,
    "communication" integer DEFAULT 0 NOT NULL,
    "external_evaluation" integer DEFAULT 0 NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ranking_to_match_performance_communication_check" CHECK (("communication" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_to_match_performance_criteria_score_check" CHECK (("criteria_score" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_to_match_performance_external_evaluation_check" CHECK (("external_evaluation" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_to_match_performance_game_control_check" CHECK (("game_control" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_to_match_performance_iot_check" CHECK (("iot" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_to_match_performance_mechanics_check" CHECK (("mechanics" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_to_match_performance_new_philosophy_check" CHECK (("new_philosophy" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_to_match_performance_physical_fitness_check" CHECK (("physical_fitness" = ANY (ARRAY['-1'::integer, 0, 1]))),
    CONSTRAINT "ranking_to_match_performance_teamwork_score_check" CHECK (("teamwork_score" = ANY (ARRAY['-1'::integer, 0, 1])))
);


ALTER TABLE "public"."ranking_to_match_performance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."replacement_notices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nomination_id" "uuid" NOT NULL,
    "replaced_referee_id" "uuid" NOT NULL,
    "new_referee_id" "uuid" NOT NULL,
    "slot_number" integer NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "replacement_notices_slot_number_check" CHECK ((("slot_number" >= 1) AND ("slot_number" <= 3)))
);


ALTER TABLE "public"."replacement_notices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nomination_id" "uuid" NOT NULL,
    "referee_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "author_role" "text" NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "three_po_iot" "text" DEFAULT ''::"text" NOT NULL,
    "criteria" "text" DEFAULT ''::"text" NOT NULL,
    "teamwork" "text" DEFAULT ''::"text" NOT NULL,
    "generally" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reports_author_role_check" CHECK (("author_role" = ANY (ARRAY['Referee'::"text", 'Instructor'::"text"]))),
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Submitted'::"text", 'Reviewed'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_report_tos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nomination_id" "uuid" NOT NULL,
    "referee_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "three_po_iot" "text" DEFAULT ''::"text" NOT NULL,
    "criteria" "text" DEFAULT ''::"text" NOT NULL,
    "teamwork" "text" DEFAULT ''::"text" NOT NULL,
    "generally" "text" DEFAULT ''::"text" NOT NULL,
    "google_drive_url" "text" DEFAULT ''::"text" NOT NULL,
    "visible_to_referee_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "test_report_tos_status_check" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Submitted'::"text", 'Reviewed'::"text"])))
);


ALTER TABLE "public"."test_report_tos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activity" (
    "user_id" "uuid" NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_agent" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_activity" OWNER TO "postgres";


ALTER TABLE ONLY "public"."allowed_access"
    ADD CONSTRAINT "allowed_access_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."allowed_access"
    ADD CONSTRAINT "allowed_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_posts"
    ADD CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nomination_referees"
    ADD CONSTRAINT "nomination_referees_nomination_id_slot_number_key" UNIQUE ("nomination_id", "slot_number");



ALTER TABLE ONLY "public"."nomination_referees"
    ADD CONSTRAINT "nomination_referees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nomination_tos"
    ADD CONSTRAINT "nomination_tos_nomination_id_slot_number_key" UNIQUE ("nomination_id", "slot_number");



ALTER TABLE ONLY "public"."nomination_tos"
    ADD CONSTRAINT "nomination_tos_nomination_id_to_id_key" UNIQUE ("nomination_id", "to_id");



ALTER TABLE ONLY "public"."nomination_tos"
    ADD CONSTRAINT "nomination_tos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nominations"
    ADD CONSTRAINT "nominations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ranking_evaluations"
    ADD CONSTRAINT "ranking_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ranking_match_performance"
    ADD CONSTRAINT "ranking_match_performance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ranking_match_performance"
    ADD CONSTRAINT "ranking_match_performance_referee_id_game_code_evaluation_d_key" UNIQUE ("referee_id", "game_code", "evaluation_date");



ALTER TABLE ONLY "public"."ranking_performance"
    ADD CONSTRAINT "ranking_performance_pkey" PRIMARY KEY ("referee_id");



ALTER TABLE ONLY "public"."ranking_to_match_performance"
    ADD CONSTRAINT "ranking_to_match_performance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ranking_to_match_performance"
    ADD CONSTRAINT "ranking_to_match_performance_to_id_game_code_evaluation_dat_key" UNIQUE ("to_id", "game_code", "evaluation_date");



ALTER TABLE ONLY "public"."replacement_notices"
    ADD CONSTRAINT "replacement_notices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_nomination_id_referee_id_author_id_key" UNIQUE ("nomination_id", "referee_id", "author_id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_report_tos"
    ADD CONSTRAINT "test_report_tos_nomination_id_referee_id_author_id_key" UNIQUE ("nomination_id", "referee_id", "author_id");



ALTER TABLE ONLY "public"."test_report_tos"
    ADD CONSTRAINT "test_report_tos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "nomination_referees_nomination_slot_idx" ON "public"."nomination_referees" USING "btree" ("nomination_id", "slot_number");



CREATE INDEX "nomination_referees_referee_status_idx" ON "public"."nomination_referees" USING "btree" ("referee_id", "status");



CREATE INDEX "nomination_tos_nomination_slot_idx" ON "public"."nomination_tos" USING "btree" ("nomination_id", "slot_number");



CREATE INDEX "nomination_tos_to_created_idx" ON "public"."nomination_tos" USING "btree" ("to_id", "created_at" DESC);



CREATE INDEX "nominations_created_by_match_idx" ON "public"."nominations" USING "btree" ("created_by", "match_date", "match_time");



CREATE INDEX "profiles_role_full_name_idx" ON "public"."profiles" USING "btree" ("role", "full_name");



CREATE INDEX "ranking_match_performance_referee_match_idx" ON "public"."ranking_match_performance" USING "btree" ("referee_id", "evaluation_date", "game_code");



CREATE INDEX "ranking_to_match_performance_to_match_idx" ON "public"."ranking_to_match_performance" USING "btree" ("to_id", "evaluation_date", "game_code");



CREATE INDEX "replacement_notices_referee_created_idx" ON "public"."replacement_notices" USING "btree" ("replaced_referee_id", "created_at" DESC);



CREATE INDEX "reports_nomination_referee_author_idx" ON "public"."reports" USING "btree" ("nomination_id", "referee_id", "author_id");



CREATE INDEX "test_report_tos_author_referee_idx" ON "public"."test_report_tos" USING "btree" ("author_id", "referee_id", "status", "updated_at" DESC);



CREATE INDEX "test_report_tos_nomination_referee_author_idx" ON "public"."test_report_tos" USING "btree" ("nomination_id", "referee_id", "author_id");



CREATE INDEX "user_activity_last_seen_idx" ON "public"."user_activity" USING "btree" ("last_seen_at" DESC);



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_posts"
    ADD CONSTRAINT "news_posts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nomination_referees"
    ADD CONSTRAINT "nomination_referees_nomination_id_fkey" FOREIGN KEY ("nomination_id") REFERENCES "public"."nominations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nomination_referees"
    ADD CONSTRAINT "nomination_referees_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nomination_tos"
    ADD CONSTRAINT "nomination_tos_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nomination_tos"
    ADD CONSTRAINT "nomination_tos_nomination_id_fkey" FOREIGN KEY ("nomination_id") REFERENCES "public"."nominations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nomination_tos"
    ADD CONSTRAINT "nomination_tos_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nominations"
    ADD CONSTRAINT "nominations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_allowed_access_id_fkey" FOREIGN KEY ("allowed_access_id") REFERENCES "public"."allowed_access"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ranking_evaluations"
    ADD CONSTRAINT "ranking_evaluations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ranking_evaluations"
    ADD CONSTRAINT "ranking_evaluations_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ranking_match_performance"
    ADD CONSTRAINT "ranking_match_performance_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ranking_match_performance"
    ADD CONSTRAINT "ranking_match_performance_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ranking_performance"
    ADD CONSTRAINT "ranking_performance_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ranking_performance"
    ADD CONSTRAINT "ranking_performance_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ranking_to_match_performance"
    ADD CONSTRAINT "ranking_to_match_performance_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ranking_to_match_performance"
    ADD CONSTRAINT "ranking_to_match_performance_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."replacement_notices"
    ADD CONSTRAINT "replacement_notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."replacement_notices"
    ADD CONSTRAINT "replacement_notices_new_referee_id_fkey" FOREIGN KEY ("new_referee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."replacement_notices"
    ADD CONSTRAINT "replacement_notices_nomination_id_fkey" FOREIGN KEY ("nomination_id") REFERENCES "public"."nominations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."replacement_notices"
    ADD CONSTRAINT "replacement_notices_replaced_referee_id_fkey" FOREIGN KEY ("replaced_referee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_nomination_id_fkey" FOREIGN KEY ("nomination_id") REFERENCES "public"."nominations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_report_tos"
    ADD CONSTRAINT "test_report_tos_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_report_tos"
    ADD CONSTRAINT "test_report_tos_nomination_id_fkey" FOREIGN KEY ("nomination_id") REFERENCES "public"."nominations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_report_tos"
    ADD CONSTRAINT "test_report_tos_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "activity instructor read" ON "public"."user_activity" FOR SELECT USING (("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])));



ALTER TABLE "public"."allowed_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcements read" ON "public"."announcements" FOR SELECT USING (("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Referee'::"text", 'TO'::"text", 'TO Supervisor'::"text", 'Table'::"text", 'Staff'::"text", 'Stuff'::"text"])));



CREATE POLICY "news read" ON "public"."news_posts" FOR SELECT USING (("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Referee'::"text", 'TO'::"text", 'TO Supervisor'::"text", 'Table'::"text", 'Staff'::"text", 'Stuff'::"text"])));



ALTER TABLE "public"."news_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."nomination_referees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nomination_referees role read" ON "public"."nomination_referees" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("referee_id" = "auth"."uid"())));



ALTER TABLE "public"."nomination_tos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nomination_tos role read" ON "public"."nomination_tos" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("to_id" = "auth"."uid"())));



ALTER TABLE "public"."nominations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nominations role read" ON "public"."nominations" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR (EXISTS ( SELECT 1
   FROM "public"."nomination_referees" "nr"
  WHERE (("nr"."nomination_id" = "nominations"."id") AND ("nr"."referee_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."nomination_tos" "nt"
  WHERE (("nt"."nomination_id" = "nominations"."id") AND ("nt"."to_id" = "auth"."uid"()))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles self read" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR ("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"]))));



CREATE POLICY "ranking TO match performance read" ON "public"."ranking_to_match_performance" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['TO Supervisor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("to_id" = "auth"."uid"())));



CREATE POLICY "ranking match performance read" ON "public"."ranking_match_performance" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("referee_id" = "auth"."uid"())));



CREATE POLICY "ranking performance read" ON "public"."ranking_performance" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("referee_id" = "auth"."uid"())));



CREATE POLICY "ranking referee read" ON "public"."ranking_evaluations" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("referee_id" = "auth"."uid"())));



ALTER TABLE "public"."ranking_evaluations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ranking_match_performance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ranking_performance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ranking_to_match_performance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "replacement notices owner read" ON "public"."replacement_notices" FOR SELECT USING (("replaced_referee_id" = "auth"."uid"()));



ALTER TABLE "public"."replacement_notices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports role read" ON "public"."reports" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("author_id" = "auth"."uid"()) OR (("referee_id" = "auth"."uid"()) AND ("author_role" = 'Instructor'::"text") AND ("status" = 'Reviewed'::"text"))));



ALTER TABLE "public"."test_report_tos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activity" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";


















GRANT ALL ON TABLE "public"."allowed_access" TO "anon";
GRANT ALL ON TABLE "public"."allowed_access" TO "authenticated";
GRANT ALL ON TABLE "public"."allowed_access" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."news_posts" TO "anon";
GRANT ALL ON TABLE "public"."news_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."news_posts" TO "service_role";



GRANT ALL ON TABLE "public"."nomination_referees" TO "anon";
GRANT ALL ON TABLE "public"."nomination_referees" TO "authenticated";
GRANT ALL ON TABLE "public"."nomination_referees" TO "service_role";



GRANT ALL ON TABLE "public"."nomination_tos" TO "anon";
GRANT ALL ON TABLE "public"."nomination_tos" TO "authenticated";
GRANT ALL ON TABLE "public"."nomination_tos" TO "service_role";



GRANT ALL ON TABLE "public"."nominations" TO "anon";
GRANT ALL ON TABLE "public"."nominations" TO "authenticated";
GRANT ALL ON TABLE "public"."nominations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ranking_evaluations" TO "anon";
GRANT ALL ON TABLE "public"."ranking_evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."ranking_evaluations" TO "service_role";



GRANT ALL ON TABLE "public"."ranking_match_performance" TO "anon";
GRANT ALL ON TABLE "public"."ranking_match_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."ranking_match_performance" TO "service_role";



GRANT ALL ON TABLE "public"."ranking_performance" TO "anon";
GRANT ALL ON TABLE "public"."ranking_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."ranking_performance" TO "service_role";



GRANT ALL ON TABLE "public"."ranking_to_match_performance" TO "anon";
GRANT ALL ON TABLE "public"."ranking_to_match_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."ranking_to_match_performance" TO "service_role";



GRANT ALL ON TABLE "public"."replacement_notices" TO "anon";
GRANT ALL ON TABLE "public"."replacement_notices" TO "authenticated";
GRANT ALL ON TABLE "public"."replacement_notices" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."test_report_tos" TO "anon";
GRANT ALL ON TABLE "public"."test_report_tos" TO "authenticated";
GRANT ALL ON TABLE "public"."test_report_tos" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity" TO "anon";
GRANT ALL ON TABLE "public"."user_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























