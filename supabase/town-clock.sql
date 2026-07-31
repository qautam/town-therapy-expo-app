-- Town clock for greetings (Asia/Kolkata). Safe to re-run.

create or replace function public.town_clock()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'iso', to_char(timezone('Asia/Kolkata', now()), 'YYYY-MM-DD"T"HH24:MI:SS'),
    'hour', extract(hour from timezone('Asia/Kolkata', now()))::int,
    'greeting', case
      when extract(hour from timezone('Asia/Kolkata', now())) < 12 then 'Good morning'
      when extract(hour from timezone('Asia/Kolkata', now())) < 17 then 'Good afternoon'
      else 'Good evening'
    end
  );
$$;

grant execute on function public.town_clock() to anon, authenticated;
