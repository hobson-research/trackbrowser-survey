# trackbrowser-survey
Server application to generate survey questions and collect responses

## Running server program
Program is written in Node.js, with MongoDB and express as a webserver. It requires Node.js version to be higher than 7.x in order to utilize `async` and `await` features of Javascript. 

**Install npm packages**

`$ npm install`

**Configure screenshot directories and participant usernames in config file**

`$ vim config/default.json`

**Run a script to pre-process database navigation entries**

`$ node clone-trackbrowser-db.js`

**Run server application**

`$ node main.js`


### Pre-processing MongoDB collection and screenshots

A large portion of the ~50,000 database entries associated with the target users needs cleaning. Below are the steps performed on the original database entries. 

 1. **Remove personal navigation** ("facebook", "Illinois Compass", etc)
 2. **Remove navigation to Google's main page** (when the user queries a search keyword, the navigation will be recorded anyways) - Google is the default opening page, and does not provide any information
 3. **Remove navigation items without associated screenshots**: These include navigations "behind-the-scene" performed by the browser (or pop-ups that immediately close). Information is already recorded through the tab window that created this navigation entry. 
 4. **Remove screenshots that are blank**: Some screenshots only have a plain white page. These are screenshots taking during loading stage, or blank pages that are irrelavant. 
 5. **Remove broken screenshots**: Some PNG files are corrupted. This is likely because of a network error or user closing the browser while the screenshot is being generated/uploaded.  

## Questionnaires

**QUESTION 1**

What kind of webpage is this?
- Search Engine (e.g., Google)
- Data Aggregator (e.g., Yahoo Finance, Google Finance)
- A Company's Investor Relations Page
- Corporate Filings With The SEC (e.g., finding or reading 10-K, 10-Q, 8-K, etc.)
- News Article About a Company
- Investment Blog
- Other _______________________
- Irrelevant (e.g., checking mail, checking Facebook, etc.)

**QUESTION 2**
- Open-ended
- How would you characterize the research being done?

**QUESTION 3**
- What company is being researched?

