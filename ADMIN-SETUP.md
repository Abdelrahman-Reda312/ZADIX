# Zadix admin panel: one-time setup (about 10 minutes)

The admin panel lets you:

- sign in through a hidden login
- add and edit news
- edit the home-page statistics
- see who visits the site
- see every quote request

It runs on **Firebase**, Google's free backend. The site is static, so Firebase stores the data.

## How to open the admin panel

- Go to **`yoursite/zx-control.html`**. This page isn't linked anywhere on the site, or
- type the word **`zadix`** on your keyboard while on any page of the site.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com and sign in with **zadix1maritime@gmail.com**.
2. Click **Add project**, name it `zadix`, and turn off Google Analytics. Click **Create**.

## 2. Connect the website

1. On the project home page, click the **Web** icon `</>`. Name it `zadix-site` and click **Register app**.
2. Firebase shows a `firebaseConfig = { ... }` block. Copy the six values into
   **`js/firebase-config.js`**, replacing each `PASTE_...` placeholder.

## 3. Create your admin login

1. In the left menu, go to **Build → Authentication → Get started**.
2. Choose **Email/Password**, switch it **on**, and click **Save**.
3. Open the **Users** tab and click **Add user**. Enter your admin email and a strong password.
4. Copy the **User UID** shown in the users list. It's a long code like `aB3dE...`.

## 4. Turn on the database and lock it

1. Go to **Build → Firestore Database → Create database**. Pick a location near Egypt
   (for example `europe-west`), choose **production mode**, and click **Create**.
2. Open the **Rules** tab and delete what's there.
3. Paste in the entire **`firestore.rules`** file from this project.
4. Replace `PASTE_ADMIN_UID` with the UID you copied in step 3, then click **Publish**.

Only that UID can then edit news and statistics or read visits and requests. Visitors can only read the
public content and add their own visit or quote.

## 5. Allow your website's address

Go to **Authentication → Settings → Authorized domains**, click **Add domain**, and enter your site's domain.
For GitHub Pages that's `abdelrahman-reda312.github.io`.

## 6. Publish

Commit and push the updated `js/firebase-config.js`. Then open `zx-control.html` and sign in.
On the first visit, save the **Statistics** tab once to store the starting numbers.

---

## Quote requests in Gmail (FormSubmit)

The contact form sends every request to **zadix1maritime@gmail.com** through FormSubmit, a free service.

- **First request only:** FormSubmit emails **zadix1maritime@gmail.com** asking you to **activate** the form.
  Open that email and click **Activate Form**. Every request after that arrives straight in the inbox.
- It only works on the published website (https), not when you open the HTML file from your computer.
- If the requests don't show up, check Gmail's **Spam** and **Promotions** folders and mark them "Not spam".

Each request is also saved in the admin panel under **Requests**, where you can mark it handled or reply.

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
