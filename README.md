Files in this repository:
1. frontEnd.jsx
2. generateSidewalks.py
3. SchaumburgOnly.py
4. sorting.py

Guide to each file:
1. This is the front-end of the application; it is what the user sees. It was made and will be maintained purely in React.
2. This file takes raw data from CMAP's website and generates the sidewalk data which is used in other back-end files and in the front-end.
3. This file takes the data generated from 2. and limits sidewalk coverage to Schaumburg (we do not currently have the processing power to handle all of Northeastern Illinois' sidewalks.
4. This file filters out all LineStrings that have a status of "0" (meaning there are no sidewalks in that segment of road), and deletes them. This is done in order to be able to visualize only the accessible sidewalks in Schaumburg, not roads which do not have sidewalks at all.
