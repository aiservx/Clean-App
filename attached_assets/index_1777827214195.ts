// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'https://mffdpjwtwseftaqrslgx.supabase.co',
      Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZmRwand0d3NlZnRhcXJzbGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTY1MDAsImV4cCI6MjA5MzM3MjUwMH0.nDIPN8836RZ-37eKDTCL7-GrBE0tAus6V58qVyopZd8',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // TODO: Change the table_name to your table
    const { data, error } = await supabase.from('table_name').select('*')

    if (error) {
      throw error
    }

    return new Response(JSON.stringify({ data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ message: err?.message ?? err }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500 
    })
  }
})