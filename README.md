LCIC Custom UI Demo for Turito
===

## Project Structure

- `modules/check-active.js`: "Check Active" logic
- `modules/feedback.js`: "Feedback" logic
- `static/embedded_questionaire.html`: The embedded questionaire page example
- `main.js`: Entry of JS file, should require all necessary modules in this JS
- `main.css`: CSS file with custom styles

## Install Dependencies

```
npm install
```

## Start Local Development

```
npm run dev
```

then add following query params in class URL to start development:

- `debugjs=http://localhost:8088/main.js`
- `debugcss=http://localhost:8088/main.css`
- `debugcors=1`

example:

```
https://class.qcloudclass.com/1.7.3/class.html?...&debugjs=http://localhost:8088/main.js&debugcss=http://localhost:8088/main.css&debugcors=1
```

## Build

```
npm run build
```

built .js and .css files will be output to `dist/` folder.

## Notes

1. Code at the end of `modules/check-active.js` and `modules/feedback.js` assigns some functions like `showQuestionaire` to `window` global object to help debugging, it is suggested to remove it in production build.

2. By default the embedded questionaire points to `static/embedded_questionaire.html` and this only works while developing, remember change it to your online questionaire url in production build.
