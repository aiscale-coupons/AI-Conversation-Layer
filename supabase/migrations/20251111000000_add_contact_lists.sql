-- Create the table for contact lists
CREATE TABLE "public"."contact_lists" (
    "id" bigserial NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."contact_lists" OWNER TO "postgres";

-- Create the sequence for the primary key
CREATE SEQUENCE IF NOT EXISTS "public"."contact_lists_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."contact_lists_id_seq" OWNER TO "postgres";

-- Set the default value for the primary key
ALTER TABLE ONLY "public"."contact_lists" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."contact_lists_id_seq"'::"regclass");

-- Add the primary key constraint
ALTER TABLE ONLY "public"."contact_lists"
    ADD CONSTRAINT "contact_lists_pkey" PRIMARY KEY ("id");

-- Add foreign key constraint to users table
ALTER TABLE ONLY "public"."contact_lists"
    ADD CONSTRAINT "contact_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Create the join table for contacts and contact lists
CREATE TABLE "public"."contact_list_members" (
    "contact_id" bigserial NOT NULL,
    "contact_list_id" bigserial NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."contact_list_members" OWNER TO "postgres";

-- Add primary key constraint
ALTER TABLE ONLY "public"."contact_list_members"
    ADD CONSTRAINT "contact_list_members_pkey" PRIMARY KEY ("contact_id", "contact_list_id");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."contact_list_members"
    ADD CONSTRAINT "contact_list_members_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."contact_list_members"
    ADD CONSTRAINT "contact_list_members_contact_list_id_fkey" FOREIGN KEY ("contact_list_id") REFERENCES "public"."contact_lists"("id") ON DELETE CASCADE;

-- Enable RLS for the new tables
ALTER TABLE "public"."contact_lists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."contact_list_members" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_lists
CREATE POLICY "Allow full access to own contact lists"
    ON "public"."contact_lists"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((auth.uid() = user_id));

-- Create RLS policies for contact_list_members
CREATE POLICY "Allow full access to own contact list members"
    ON "public"."contact_list_members"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ((auth.uid() IN ( SELECT "contact_lists"."user_id"
   FROM "contact_lists"
  WHERE ("contact_list_members"."contact_list_id" = "contact_lists"."id"))));
