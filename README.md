# hack4good
Change working directory to `/app` folder.

Install packages:

`npm install`

Run website:

`npm run dev`

Place your .env file containing environment variables in the `/app/` folder. It should have path `.../app/.env`

.env file format:


VITE\_OPENAI\_API\_KEY = {YOUR\_OPENAI\_API\_KEY}  
VITE\_GOOGLE\_CLIENT\_ID = {YOUR\_CLIENT\_ID.apps.googleusercontent.com}  
VITE\_GOOGLE\_CLIENT\_SECRET = {CLIENT_SECRET}  


You need to enable Gmail API and Google Calendar API in Google Cloud Console for this application to work.
