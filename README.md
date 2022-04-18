# Recipeek

If you're struggling to find the Recipe in a site or a blog, Recipick does the job for you!

Using Machine Learning (Tensorflow) and other search algorithms, this app finds a Recipe in a website and its respective Ingredients and Method lists



## Folders

### `/extension`

Contains the extension files and the Tensorflow trained models:

#### background.js
Service worker

#### bundle.js
Bundled version of `predict.js`

#### page.js
Script to inject in page. Contains the search algorithm and the UI logic.

#### predict.js
Processing of data from the page and Tensorflow trained model prediction.

#### recipick.css
Styling an UI div

#### sandbox.html
To insert as an iframe, so the Tensorflow Model can use `unsafe eval`


### `/python`

Contains files to process data and train the Tensorflow ML Model
