/*
  Supabase connection for the Zadix site and admin panel.
  The publishable key is meant to be public: access is controlled by the
  Row Level Security rules in supabase-setup.sql, not by hiding this file.
*/
export const SUPABASE_URL = "https://xfzahrqzzqweaqshxvby.supabase.co";
export const SUPABASE_KEY = "sb_publishable_CVHuEM4hwEax11JYNwLwZw_4kJ3LzMB";

export const isConfigured = !SUPABASE_KEY.startsWith("PASTE");

export const SUPABASE_LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
