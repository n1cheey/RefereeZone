


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


CREATE OR REPLACE FUNCTION "public"."is_chat_participant"("conversation_user_a_id" "uuid", "conversation_user_b_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select auth.uid() is not null
    and auth.uid() in (conversation_user_a_id, conversation_user_b_id)
$$;


ALTER FUNCTION "public"."is_chat_participant"("conversation_user_a_id" "uuid", "conversation_user_b_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."allowed_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "allowed_role" "text" NOT NULL,
    "display_name" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "license_number" "text" DEFAULT 'Pending'::"text" NOT NULL,
    CONSTRAINT "allowed_access_allowed_role_check" CHECK (("allowed_role" = ANY (ARRAY['Instructor'::"text", 'TO Supervisor'::"text", 'TO'::"text", 'Table'::"text", 'Referee'::"text", 'Staff'::"text", 'Stuff'::"text", 'Financialist'::"text"])))
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


CREATE TABLE IF NOT EXISTS "public"."availability_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "approver_role" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "availability_requests_approver_role_check" CHECK (("approver_role" = ANY (ARRAY['Instructor'::"text", 'TO Supervisor'::"text"]))),
    CONSTRAINT "availability_requests_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Approved'::"text", 'Declined'::"text"]))),
    CONSTRAINT "availability_requests_valid_range" CHECK (("start_date" <= "end_date"))
);


ALTER TABLE "public"."availability_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_a_id" "uuid" NOT NULL,
    "user_b_id" "uuid" NOT NULL,
    "user_a_last_read_at" timestamp with time zone,
    "user_b_last_read_at" timestamp with time zone,
    "user_a_unread_count" integer DEFAULT 0 NOT NULL,
    "user_b_unread_count" integer DEFAULT 0 NOT NULL,
    "last_message_at" timestamp with time zone,
    "last_message_text" "text" DEFAULT ''::"text" NOT NULL,
    "last_message_sender_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chat_conversations_distinct_users" CHECK (("user_a_id" <> "user_b_id")),
    CONSTRAINT "chat_conversations_sorted_pair" CHECK ((("user_a_id")::"text" < ("user_b_id")::"text"))
);


ALTER TABLE "public"."chat_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chat_messages_non_empty_body" CHECK (("length"("btrim"("body")) > 0))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_telemetry_events" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_role" "text",
    "client_event_id" "text" NOT NULL,
    "event_name" "text" NOT NULL,
    "level" "text" DEFAULT 'info'::"text" NOT NULL,
    "happened_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "platform" "text",
    "app_version" "text",
    "build_type" "text",
    "device_type" "text",
    "release_version" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."client_telemetry_events" OWNER TO "postgres";


ALTER TABLE "public"."client_telemetry_events" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."client_telemetry_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



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
    CONSTRAINT "nomination_tos_slot_number_check" CHECK ((("slot_number" >= 1) AND ("slot_number" <= 7))),
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
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['Instructor'::"text", 'TO Supervisor'::"text", 'TO'::"text", 'Table'::"text", 'Referee'::"text", 'Staff'::"text", 'Stuff'::"text", 'Financialist'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_notification_delivery_history" (
    "id" bigint NOT NULL,
    "token_id" bigint,
    "user_id" "uuid" NOT NULL,
    "expo_push_token" "text",
    "delivery_kind" "text",
    "delivery_title" "text",
    "delivery_body" "text",
    "event_stage" "text" NOT NULL,
    "delivery_status" "text",
    "failure_reason" "text",
    "ticket_id" "text",
    "ticket_status" "text",
    "ticket_message" "text",
    "ticket_error" "text",
    "receipt_status" "text",
    "receipt_message" "text",
    "receipt_error" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."push_notification_delivery_history" OWNER TO "postgres";


ALTER TABLE "public"."push_notification_delivery_history" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."push_notification_delivery_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."push_notification_tokens" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expo_push_token" "text" NOT NULL,
    "platform" "text" DEFAULT 'android'::"text" NOT NULL,
    "app_version" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "last_registered_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "device_type" "text",
    "build_type" "text",
    "last_delivery_kind" "text",
    "last_delivery_title" "text",
    "last_delivery_body" "text",
    "last_delivery_at" timestamp with time zone,
    "last_ticket_id" "text",
    "last_ticket_status" "text",
    "last_ticket_message" "text",
    "last_ticket_error" "text",
    "last_ticket_checked_at" timestamp with time zone,
    "last_receipt_status" "text",
    "last_receipt_message" "text",
    "last_receipt_error" "text",
    "last_receipt_checked_at" timestamp with time zone
);


ALTER TABLE "public"."push_notification_tokens" OWNER TO "postgres";


ALTER TABLE "public"."push_notification_tokens" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."push_notification_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



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


CREATE TABLE IF NOT EXISTS "public"."test_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_role" "text" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."test_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "user_role" "text" NOT NULL,
    "status" "text" DEFAULT 'InProgress'::"text" NOT NULL,
    "question_ids" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "answers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "current_question_index" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "question_started_at" timestamp with time zone,
    "question_deadline_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "correct_answers" integer DEFAULT 0 NOT NULL,
    "total_questions" integer DEFAULT 25 NOT NULL,
    "total_duration_seconds" integer,
    "result_status" "text",
    "retake_allowed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "test_attempts_result_status_check" CHECK (("result_status" = ANY (ARRAY['SUCCESS'::"text", 'FAILED'::"text"]))),
    CONSTRAINT "test_attempts_status_check" CHECK (("status" = ANY (ARRAY['NotStarted'::"text", 'InProgress'::"text", 'Completed'::"text"])))
);


ALTER TABLE "public"."test_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_question_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "label_en" "text" NOT NULL,
    "label_az" "text",
    "label_ru" "text",
    "is_correct" boolean DEFAULT false NOT NULL,
    "option_order" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."test_question_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "test_id" "uuid" NOT NULL,
    "prompt_en" "text" NOT NULL,
    "prompt_az" "text",
    "prompt_ru" "text",
    "question_type" "text" NOT NULL,
    "order_index" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "test_questions_question_type_check" CHECK (("question_type" = ANY (ARRAY['single'::"text", 'multiple'::"text"])))
);


ALTER TABLE "public"."test_questions" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "audience_role" "text" NOT NULL,
    "question_bank_size" integer DEFAULT 50 NOT NULL,
    "question_count" integer DEFAULT 25 NOT NULL,
    "question_time_limit_seconds" integer DEFAULT 120 NOT NULL,
    "pass_threshold" integer DEFAULT 20 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "assignment_mode" "text" DEFAULT 'AllEligible'::"text" NOT NULL,
    "deadline_at" timestamp with time zone,
    CONSTRAINT "tests_assignment_mode_check" CHECK (("assignment_mode" = ANY (ARRAY['AllEligible'::"text", 'SelectedUsers'::"text"]))),
    CONSTRAINT "tests_audience_role_check" CHECK (("audience_role" = ANY (ARRAY['Referee'::"text", 'TO'::"text", 'Both'::"text"]))),
    CONSTRAINT "tests_status_check" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Published'::"text"])))
);


ALTER TABLE "public"."tests" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."availability_requests"
    ADD CONSTRAINT "availability_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_user_a_id_user_b_id_key" UNIQUE ("user_a_id", "user_b_id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_telemetry_events"
    ADD CONSTRAINT "client_telemetry_events_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."push_notification_delivery_history"
    ADD CONSTRAINT "push_notification_delivery_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_notification_tokens"
    ADD CONSTRAINT "push_notification_tokens_expo_push_token_key" UNIQUE ("expo_push_token");



ALTER TABLE ONLY "public"."push_notification_tokens"
    ADD CONSTRAINT "push_notification_tokens_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."test_assignments"
    ADD CONSTRAINT "test_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_attempts"
    ADD CONSTRAINT "test_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_question_options"
    ADD CONSTRAINT "test_question_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_questions"
    ADD CONSTRAINT "test_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_report_tos"
    ADD CONSTRAINT "test_report_tos_nomination_id_referee_id_author_id_key" UNIQUE ("nomination_id", "referee_id", "author_id");



ALTER TABLE ONLY "public"."test_report_tos"
    ADD CONSTRAINT "test_report_tos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "availability_requests_approver_status_idx" ON "public"."availability_requests" USING "btree" ("approver_role", "status", "start_date", "created_at");



CREATE INDEX "availability_requests_user_status_idx" ON "public"."availability_requests" USING "btree" ("user_id", "status", "start_date" DESC, "end_date" DESC);



CREATE INDEX "chat_conversations_user_a_last_message_idx" ON "public"."chat_conversations" USING "btree" ("user_a_id", "last_message_at" DESC, "updated_at" DESC);



CREATE INDEX "chat_conversations_user_a_updated_idx" ON "public"."chat_conversations" USING "btree" ("user_a_id", "updated_at" DESC);



CREATE INDEX "chat_conversations_user_b_last_message_idx" ON "public"."chat_conversations" USING "btree" ("user_b_id", "last_message_at" DESC, "updated_at" DESC);



CREATE INDEX "chat_conversations_user_b_updated_idx" ON "public"."chat_conversations" USING "btree" ("user_b_id", "updated_at" DESC);



CREATE INDEX "chat_messages_conversation_created_idx" ON "public"."chat_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "chat_messages_sender_created_idx" ON "public"."chat_messages" USING "btree" ("sender_id", "created_at" DESC);



CREATE INDEX "client_telemetry_events_level_happened_idx" ON "public"."client_telemetry_events" USING "btree" ("level", "happened_at" DESC);



CREATE UNIQUE INDEX "client_telemetry_events_user_event_uidx" ON "public"."client_telemetry_events" USING "btree" ("user_id", "client_event_id");



CREATE INDEX "client_telemetry_events_user_happened_idx" ON "public"."client_telemetry_events" USING "btree" ("user_id", "happened_at" DESC);



CREATE UNIQUE INDEX "idx_test_assignments_active_unique" ON "public"."test_assignments" USING "btree" ("test_id", "user_id", "is_active");



CREATE INDEX "idx_test_assignments_test" ON "public"."test_assignments" USING "btree" ("test_id", "assigned_at" DESC);



CREATE INDEX "idx_test_assignments_user" ON "public"."test_assignments" USING "btree" ("user_id", "assigned_at" DESC);



CREATE INDEX "idx_test_attempts_test_user" ON "public"."test_attempts" USING "btree" ("test_id", "user_id", "started_at" DESC);



CREATE INDEX "idx_test_attempts_user" ON "public"."test_attempts" USING "btree" ("user_id", "started_at" DESC);



CREATE INDEX "idx_test_question_options_question_id" ON "public"."test_question_options" USING "btree" ("question_id", "option_order");



CREATE INDEX "idx_test_questions_test_id" ON "public"."test_questions" USING "btree" ("test_id", "order_index");



CREATE INDEX "idx_tests_audience_role" ON "public"."tests" USING "btree" ("audience_role", "created_at" DESC);



CREATE INDEX "idx_tests_created_by" ON "public"."tests" USING "btree" ("created_by", "created_at" DESC);



CREATE INDEX "nomination_referees_nomination_referee_idx" ON "public"."nomination_referees" USING "btree" ("nomination_id", "referee_id");



CREATE INDEX "nomination_referees_nomination_slot_idx" ON "public"."nomination_referees" USING "btree" ("nomination_id", "slot_number");



CREATE INDEX "nomination_referees_referee_status_idx" ON "public"."nomination_referees" USING "btree" ("referee_id", "status");



CREATE INDEX "nomination_referees_referee_status_nomination_idx" ON "public"."nomination_referees" USING "btree" ("referee_id", "status", "nomination_id");



CREATE INDEX "nomination_tos_nomination_slot_idx" ON "public"."nomination_tos" USING "btree" ("nomination_id", "slot_number");



CREATE INDEX "nomination_tos_to_created_idx" ON "public"."nomination_tos" USING "btree" ("to_id", "created_at" DESC);



CREATE INDEX "nominations_created_by_idx" ON "public"."nominations" USING "btree" ("created_by", "created_at" DESC);



CREATE INDEX "nominations_created_by_match_idx" ON "public"."nominations" USING "btree" ("created_by", "match_date", "match_time");



CREATE INDEX "nominations_match_date_created_idx" ON "public"."nominations" USING "btree" ("match_date" DESC, "created_at" DESC);



CREATE INDEX "profiles_role_full_name_idx" ON "public"."profiles" USING "btree" ("role", "full_name");



CREATE INDEX "push_notification_delivery_history_stage_created_idx" ON "public"."push_notification_delivery_history" USING "btree" ("user_id", "event_stage", "created_at" DESC);



CREATE INDEX "push_notification_delivery_history_token_id_idx" ON "public"."push_notification_delivery_history" USING "btree" ("token_id", "created_at" DESC);



CREATE INDEX "push_notification_delivery_history_user_id_idx" ON "public"."push_notification_delivery_history" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "push_notification_tokens_is_active_idx" ON "public"."push_notification_tokens" USING "btree" ("is_active");



CREATE INDEX "push_notification_tokens_receipt_pending_idx" ON "public"."push_notification_tokens" USING "btree" ("is_active", "last_receipt_status", "last_ticket_checked_at" DESC);



CREATE INDEX "push_notification_tokens_user_active_registered_idx" ON "public"."push_notification_tokens" USING "btree" ("user_id", "is_active", "last_registered_at" DESC);



CREATE INDEX "push_notification_tokens_user_id_idx" ON "public"."push_notification_tokens" USING "btree" ("user_id");



CREATE INDEX "ranking_match_performance_referee_match_idx" ON "public"."ranking_match_performance" USING "btree" ("referee_id", "evaluation_date", "game_code");



CREATE INDEX "ranking_to_match_performance_to_match_idx" ON "public"."ranking_to_match_performance" USING "btree" ("to_id", "evaluation_date", "game_code");



CREATE INDEX "replacement_notices_referee_created_idx" ON "public"."replacement_notices" USING "btree" ("replaced_referee_id", "created_at" DESC);



CREATE INDEX "reports_author_updated_idx" ON "public"."reports" USING "btree" ("author_id", "updated_at" DESC);



CREATE INDEX "reports_nomination_referee_author_idx" ON "public"."reports" USING "btree" ("nomination_id", "referee_id", "author_id");



CREATE INDEX "reports_nomination_referee_idx" ON "public"."reports" USING "btree" ("nomination_id", "referee_id");



CREATE INDEX "reports_status_updated_idx" ON "public"."reports" USING "btree" ("status", "updated_at" DESC);



CREATE INDEX "test_report_tos_author_referee_idx" ON "public"."test_report_tos" USING "btree" ("author_id", "referee_id", "status", "updated_at" DESC);



CREATE INDEX "test_report_tos_nomination_referee_author_idx" ON "public"."test_report_tos" USING "btree" ("nomination_id", "referee_id", "author_id");



CREATE INDEX "user_activity_last_seen_idx" ON "public"."user_activity" USING "btree" ("last_seen_at" DESC);



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."availability_requests"
    ADD CONSTRAINT "availability_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."availability_requests"
    ADD CONSTRAINT "availability_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_last_message_sender_id_fkey" FOREIGN KEY ("last_message_sender_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_telemetry_events"
    ADD CONSTRAINT "client_telemetry_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."push_notification_delivery_history"
    ADD CONSTRAINT "push_notification_delivery_history_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "public"."push_notification_tokens"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."push_notification_delivery_history"
    ADD CONSTRAINT "push_notification_delivery_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_notification_tokens"
    ADD CONSTRAINT "push_notification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."test_assignments"
    ADD CONSTRAINT "test_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_assignments"
    ADD CONSTRAINT "test_assignments_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_assignments"
    ADD CONSTRAINT "test_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_attempts"
    ADD CONSTRAINT "test_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_attempts"
    ADD CONSTRAINT "test_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_question_options"
    ADD CONSTRAINT "test_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."test_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_questions"
    ADD CONSTRAINT "test_questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_report_tos"
    ADD CONSTRAINT "test_report_tos_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_report_tos"
    ADD CONSTRAINT "test_report_tos_nomination_id_fkey" FOREIGN KEY ("nomination_id") REFERENCES "public"."nominations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_report_tos"
    ADD CONSTRAINT "test_report_tos_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tests"
    ADD CONSTRAINT "tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "activity instructor read" ON "public"."user_activity" FOR SELECT USING (("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])));



ALTER TABLE "public"."allowed_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcements read" ON "public"."announcements" FOR SELECT USING (("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Referee'::"text", 'TO'::"text", 'TO Supervisor'::"text", 'Table'::"text", 'Staff'::"text", 'Stuff'::"text"])));



CREATE POLICY "availability approver read" ON "public"."availability_requests" FOR SELECT USING (("approver_role" = "public"."current_user_role"()));



CREATE POLICY "availability approver update" ON "public"."availability_requests" FOR UPDATE USING (("approver_role" = "public"."current_user_role"())) WITH CHECK (("approver_role" = "public"."current_user_role"()));



CREATE POLICY "availability own insert" ON "public"."availability_requests" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "availability own read" ON "public"."availability_requests" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."availability_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat conversations participant insert" ON "public"."chat_conversations" FOR INSERT WITH CHECK (("public"."is_chat_participant"("user_a_id", "user_b_id") AND (("user_a_id")::"text" < ("user_b_id")::"text")));



CREATE POLICY "chat conversations participant read" ON "public"."chat_conversations" FOR SELECT USING ("public"."is_chat_participant"("user_a_id", "user_b_id"));



CREATE POLICY "chat conversations participant update" ON "public"."chat_conversations" FOR UPDATE USING ("public"."is_chat_participant"("user_a_id", "user_b_id")) WITH CHECK (("public"."is_chat_participant"("user_a_id", "user_b_id") AND (("user_a_id")::"text" < ("user_b_id")::"text")));



CREATE POLICY "chat messages participant read" ON "public"."chat_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations" "c"
  WHERE (("c"."id" = "chat_messages"."conversation_id") AND "public"."is_chat_participant"("c"."user_a_id", "c"."user_b_id")))));



CREATE POLICY "chat messages sender insert" ON "public"."chat_messages" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."chat_conversations" "c"
  WHERE (("c"."id" = "chat_messages"."conversation_id") AND "public"."is_chat_participant"("c"."user_a_id", "c"."user_b_id"))))));



ALTER TABLE "public"."chat_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client telemetry self read" ON "public"."client_telemetry_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."client_telemetry_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "create own attempts" ON "public"."test_attempts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



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



CREATE POLICY "push history self read" ON "public"."push_notification_delivery_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "push tokens self delete" ON "public"."push_notification_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "push tokens self insert" ON "public"."push_notification_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "push tokens self read" ON "public"."push_notification_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "push tokens self update" ON "public"."push_notification_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."push_notification_delivery_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_notification_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ranking TO match performance read" ON "public"."ranking_to_match_performance" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['TO Supervisor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("to_id" = "auth"."uid"())));



CREATE POLICY "ranking match performance read" ON "public"."ranking_match_performance" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("referee_id" = "auth"."uid"())));



CREATE POLICY "ranking performance read" ON "public"."ranking_performance" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("referee_id" = "auth"."uid"())));



CREATE POLICY "ranking referee read" ON "public"."ranking_evaluations" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("referee_id" = "auth"."uid"())));



ALTER TABLE "public"."ranking_evaluations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ranking_match_performance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ranking_performance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ranking_to_match_performance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read options of active tests" ON "public"."test_question_options" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."test_questions" "q"
     JOIN "public"."tests" "t" ON (("t"."id" = "q"."test_id")))
  WHERE (("q"."id" = "test_question_options"."question_id") AND ("t"."is_active" = true)))));



CREATE POLICY "read own attempts" ON "public"."test_attempts" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "read published available tests" ON "public"."tests" FOR SELECT TO "authenticated" USING ((("is_active" = true) AND ("status" = 'Published'::"text") AND (("deadline_at" IS NULL) OR ("deadline_at" > "now"())) AND (("assignment_mode" = 'AllEligible'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."test_assignments" "ta"
  WHERE (("ta"."test_id" = "tests"."id") AND ("ta"."user_id" = "auth"."uid"()) AND ("ta"."is_active" = true)))))));



CREATE POLICY "read questions of active tests" ON "public"."test_questions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tests" "t"
  WHERE (("t"."id" = "test_questions"."test_id") AND ("t"."is_active" = true)))));



CREATE POLICY "replacement notices owner read" ON "public"."replacement_notices" FOR SELECT USING (("replaced_referee_id" = "auth"."uid"()));



ALTER TABLE "public"."replacement_notices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports role read" ON "public"."reports" FOR SELECT USING ((("public"."current_user_role"() = ANY (ARRAY['Instructor'::"text", 'Staff'::"text", 'Stuff'::"text"])) OR ("author_id" = "auth"."uid"()) OR (("referee_id" = "auth"."uid"()) AND ("author_role" = 'Instructor'::"text") AND ("status" = 'Reviewed'::"text"))));



ALTER TABLE "public"."test_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_question_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_report_tos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update own attempts" ON "public"."test_attempts" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") AND ("status" = 'InProgress'::"text"))) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_activity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users read own assignments" ON "public"."test_assignments" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_chat_participant"("conversation_user_a_id" "uuid", "conversation_user_b_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_chat_participant"("conversation_user_a_id" "uuid", "conversation_user_b_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_chat_participant"("conversation_user_a_id" "uuid", "conversation_user_b_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."allowed_access" TO "anon";
GRANT ALL ON TABLE "public"."allowed_access" TO "authenticated";
GRANT ALL ON TABLE "public"."allowed_access" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."availability_requests" TO "anon";
GRANT ALL ON TABLE "public"."availability_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_requests" TO "service_role";



GRANT ALL ON TABLE "public"."chat_conversations" TO "anon";
GRANT ALL ON TABLE "public"."chat_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."client_telemetry_events" TO "anon";
GRANT ALL ON TABLE "public"."client_telemetry_events" TO "authenticated";
GRANT ALL ON TABLE "public"."client_telemetry_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."client_telemetry_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."client_telemetry_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."client_telemetry_events_id_seq" TO "service_role";



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



GRANT ALL ON TABLE "public"."push_notification_delivery_history" TO "anon";
GRANT ALL ON TABLE "public"."push_notification_delivery_history" TO "authenticated";
GRANT ALL ON TABLE "public"."push_notification_delivery_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."push_notification_delivery_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."push_notification_delivery_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."push_notification_delivery_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."push_notification_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_notification_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_notification_tokens" TO "service_role";



GRANT ALL ON SEQUENCE "public"."push_notification_tokens_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."push_notification_tokens_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."push_notification_tokens_id_seq" TO "service_role";



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



GRANT ALL ON TABLE "public"."test_assignments" TO "anon";
GRANT ALL ON TABLE "public"."test_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."test_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."test_attempts" TO "anon";
GRANT ALL ON TABLE "public"."test_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."test_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."test_question_options" TO "anon";
GRANT ALL ON TABLE "public"."test_question_options" TO "authenticated";
GRANT ALL ON TABLE "public"."test_question_options" TO "service_role";



GRANT ALL ON TABLE "public"."test_questions" TO "anon";
GRANT ALL ON TABLE "public"."test_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."test_questions" TO "service_role";



GRANT ALL ON TABLE "public"."test_report_tos" TO "anon";
GRANT ALL ON TABLE "public"."test_report_tos" TO "authenticated";
GRANT ALL ON TABLE "public"."test_report_tos" TO "service_role";



GRANT ALL ON TABLE "public"."tests" TO "anon";
GRANT ALL ON TABLE "public"."tests" TO "authenticated";
GRANT ALL ON TABLE "public"."tests" TO "service_role";



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






























