# Zadix admin panel: setup (about 5 minutes)

The admin panel lets you:

- sign in through a hidden login
- add and edit news
- edit the home-page statistics
- see who visits the site
- see every quote request

It runs on **Supabase** (project `xfzahrqzzqweaqshxvby`). The site is already connected to it in
`js/supabase-config.js`. You only need to do the three steps below once.

## How to open the admin panel

- Go to **`yoursite/zx-control.html`**. This page isn't linked anywhere on the site, or
- type the word **`zadix`** on your keyboard while on any page of the site.

## 1. Create your admin login

1. Open https://supabase.com/dashboard and select your project.
2. Go to **Authentication → Users → Add user → Create new user**.
3. Enter **zadix1maritime@gmail.com** and a strong password.
4. Tick **Auto Confirm User**, then click **Create user**.

## 2. Create the database

1. Go to **SQL Editor → New query**.
2. Paste in the entire **`supabase-setup.sql`** file from this project and click **Run**.
   It should say *Success. No rows returned*.

This creates the tables and the security rules, and makes **zadix1maritime@gmail.com** the admin.

To use a different admin email, change it on the last line of the SQL before running it.
If you created the user *after* running the SQL, just run the file again; it's safe to re-run.

## 3. Block strangers from signing up

Go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up".
Then save.

The panel only lets in accounts listed as admin, so this is an extra lock.

That's it. Open `zx-control.html`, sign in, and you're in.

---

## What's protected

- **Visitors** can only read the statistics and *published* news, add their own visit, and send a quote request.
- **Only your admin account** can edit news and statistics, or read the visitor log and the requests.

These rules are enforced by the database itself (Row Level Security), not by the hidden link.
The publishable key in `js/supabase-config.js` is designed to be public.
**Never** put the `service_role` or *secret* key in the website.

## Quote requests in Gmail (FormSubmit)

The contact form sends every request to **zadix1maritime@gmail.com** through FormSubmit, a free service.

- **First request only:** FormSubmit emails **zadix1maritime@gmail.com** asking you to **activate** the form.
  Open that email and click **Activate Form**. Every request after that arrives straight in the inbox.
- It only works on the published website (https), not when you open the HTML file from your computer.
- If the requests don't show up, check Gmail's **Spam** and **Promotions** folders and mark them "Not spam".

Every request is also saved in the admin panel under **Requests**, even if the email fails.
There you can mark it handled or reply.

## Visitor tracking

Each page view stores:

- the page
- the device type (mobile, tablet or desktop)
- the browser language
- the time zone, shown as a country
- the referring website
- an anonymous random visitor ID

No names, IP addresses or other personal data are collected. Your own visits aren't counted
once you've signed in to the admin panel in that browser.
