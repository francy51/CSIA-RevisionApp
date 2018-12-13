
**NOTE: I have disabled some of the third part authentication features as they were using an app ID that I had created to work. If you wish to have these features work for hatever reason fill in the missing fields in the config/auth.js file**

First unzip the file

Then Install NodeJS on your local device.

Once you have installed node js open the nodejs cmd tool

Navigate into the projects directory where the package.json file is and type npm install
    This will install all necesary libraries for you.
    
Once you want the server to start you can type npm start in the command line. This will start the server and connect it to teh database I used for development.

If you wish to set up your own database you can follow the subsequent steps:

Either download mongodb on your local devise and replace the url in the config/database.js file to mongodb://localhost.com 

or

Go to mlab.com and follow their steps to set up a free online sandbox database.
**NOTE: This is the method I used while developing the software**

