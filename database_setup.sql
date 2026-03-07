-- Create a table for public profiles tied to the Supabase Auth
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  
  -- Personal Info
  my_name text,
  my_country text default 'US',
  my_language text default 'English',
  my_age integer,
  my_height text,
  my_weight text,
  my_gender text default 'Male',
  my_hair text default 'Brunette',
  my_eyes text default 'Brown',
  my_ethnicity text default 'Caucasian',
  my_religion text default 'Other',
  profile_image text,
  
  -- Match Preferences
  match_gender text default 'Any',
  match_hair text default 'Any',
  match_eyes text default 'Any',
  match_ethnicity text default 'Any',
  match_religion text default 'Any',
  match_age_min integer default 18,
  match_age_max integer default 120,
  match_age_importance integer default 3,
  match_gender_importance integer default 3,
  match_hair_importance integer default 3,
  match_eyes_importance integer default 3,
  match_ethnicity_importance integer default 3,
  match_religion_importance integer default 3,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Function to automatically create a profile when a new user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
